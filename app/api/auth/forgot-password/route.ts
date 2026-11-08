import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeAuthRateLimit } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";

const requestSchema = z.object({ email: z.string().email().max(254) });
const genericMessage = "If an account exists for that email, a password reset link will be sent.";

function genericResponse() {
  return NextResponse.json({ message: genericMessage }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const forwarded = request.headers.get("x-vercel-forwarded-for") ??
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim();

    // Apply a shared IP limit before looking up the account, so unknown and
    // known email addresses follow the same externally visible response path.
    if (clientIp && !(await consumeAuthRateLimit(`forgot-ip:${clientIp}`, 10, 60 * 60 * 1000))) {
      return genericResponse();
    }

    // Missing mail configuration must not reveal whether the address exists.
    if (!process.env.RESEND_API_KEY) {
      console.error("Password reset email is not configured: RESEND_API_KEY is missing.");
      return genericResponse();
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, provider: true },
    });

    if (!user || !user.passwordHash || user.provider !== "CREDENTIALS") {
      return genericResponse();
    }

    const windowStart = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: windowStart } },
    });
    if (recentRequests >= 3) return genericResponse();

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${appUrl}/auth/reset-password?token=${rawToken}`;
    const from = process.env.RESEND_FROM_EMAIL || "NexaFilm <onboarding@resend.dev>";

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: "Reset your NexaFilm password",
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111"><h2>Reset your NexaFilm password</h2><p>We received a request to reset the password for your account.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p><p>This link expires in 30 minutes and can be used only once. If you did not request this, you can ignore this email.</p></div>`,
      }),
    });

    if (!emailResponse.ok) {
      const details = await emailResponse.text();
      console.error("Password reset email delivery failed:", emailResponse.status, details.slice(0, 300));
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      return genericResponse();
    }

    return genericResponse();
  } catch (error) {
    console.error("Forgot password request failed.");
    // Avoid exposing account-dependent infrastructure failures to the caller.
    return genericResponse();
  }
}
