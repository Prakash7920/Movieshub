import { NextResponse } from "next/server";
import { hasValidJsonContentType, isSameOriginRequest } from "@/lib/security/request-guards";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOneTimeToken } from "@/lib/security/tokens";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-identity";
import { getPublicAppUrl, sendTransactionalEmail } from "@/lib/email/resend";

export const runtime = "nodejs";

const requestSchema = z.object({ email: z.string().email().max(254) });
const genericMessage = "If an account exists for that email, a password reset link will be sent.";

function genericResponse() {
  return NextResponse.json({ message: genericMessage }, {
    status: 202,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (!(await hasValidJsonContentType(request))) {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 415, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const body: unknown = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const ip = getClientIp(request.headers);
    const emailLimit = await consumeRateLimit("password-reset-email", email, 3, 60 * 60);
    const ipLimit = ip
      ? await consumeRateLimit("password-reset-ip", ip, 10, 60 * 60)
      : { allowed: true };
    if (!emailLimit.allowed || !ipLimit.allowed) {
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

    const appUrl = getPublicAppUrl();
    if (!appUrl || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return genericResponse();
    }

    const oneTimeToken = createOneTimeToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: oneTimeToken.tokenHash, expiresAt },
    });

    const resetUrl = `${appUrl}/auth/reset-password#token=${oneTimeToken.token}`;
    const delivery = await sendTransactionalEmail({
      to: user.email,
      subject: "Reset your NexaFilm password",
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111"><h2>Reset your NexaFilm password</h2><p>We received a request to reset your account password.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px">Reset password</a></p><p>This link expires in 30 minutes and can be used only once. If you did not request this, you can ignore this email.</p><p style="color:#666;font-size:12px">NexaFilm · One Platform. Every Language. Endless Stories.</p></div>`,
    });

    if (!delivery.sent) {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash: oneTimeToken.tokenHash } });
    }

    return genericResponse();
  } catch {
    return genericResponse();
  }
}
