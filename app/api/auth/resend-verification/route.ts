import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOneTimeToken } from "@/lib/security/tokens";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-identity";
import { getPublicAppUrl, sendTransactionalEmail } from "@/lib/email/resend";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email().max(254) });
const genericMessage = "If an unverified account exists for that email, a verification link will be sent.";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

    const email = parsed.data.email.trim().toLowerCase();
    const ip = getClientIp(request.headers);
    const emailLimit = await consumeRateLimit("verification-resend-email", email, 3, 60 * 60);
    const ipLimit = ip
      ? await consumeRateLimit("verification-resend-ip", ip, 10, 60 * 60)
      : { allowed: true };
    if (!emailLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json({ message: genericMessage }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isEmailVerified: true },
    });
    const appUrl = getPublicAppUrl();
    if (!user || user.isEmailVerified || !appUrl ||
        !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json({ message: genericMessage }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }

    const oneTimeToken = createOneTimeToken();
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: oneTimeToken.tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verificationUrl = `${appUrl}/auth/verify-email?token=${oneTimeToken.token}`;
    const delivery = await sendTransactionalEmail({
      to: user.email,
      subject: "Verify your MoviesHub email",
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111"><h2>Verify your MoviesHub email</h2><p>Confirm your email address to complete your account setup.</p><p><a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px">Verify email</a></p><p>This link expires in 24 hours and can be used only once. If you did not request this, you can ignore this email.</p></div>`,
    });

    if (!delivery.sent) {
      await prisma.emailVerificationToken.deleteMany({ where: { tokenHash: oneTimeToken.tokenHash } });
    }

    return NextResponse.json({ message: genericMessage }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to process your request right now." }, { status: 503 });
  }
}
