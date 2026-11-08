import { createHash } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeAuthRateLimit } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";

const resetSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(8).max(128),
});

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || null;
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    try {
      if (ip && !(await consumeAuthRateLimit(`reset-ip:${ip}`, 20))) {
        return NextResponse.json(
          { error: "Too many password reset attempts. Please try again later." },
          { status: 429, headers: { "Cache-Control": "no-store" } },
        );
      }
    } catch {
      console.error("Password reset rate limiter unavailable; rejecting request.");
      return NextResponse.json(
        { error: "Password reset is temporarily unavailable. Please try again later." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body: unknown = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "The reset link is invalid or expired." }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    try {
      if (!(await consumeAuthRateLimit(`reset-token:${tokenHash}`, 5))) {
        return NextResponse.json(
          { error: "Too many password reset attempts. Please request a new reset link." },
          { status: 429, headers: { "Cache-Control": "no-store" } },
        );
      }
    } catch {
      console.error("Password reset rate limiter unavailable; rejecting request.");
      return NextResponse.json(
        { error: "Password reset is temporarily unavailable. Please try again later." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const resetToken = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      });

      if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) return false;

      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: resetToken.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) return false;

      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, passwordChangedAt: now },
      });
      await tx.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId, id: { not: resetToken.id } },
      });
      return true;
    }, { isolationLevel: "Serializable" });

    if (!result) {
      return NextResponse.json({ error: "The reset link is invalid or expired." }, { status: 400 });
    }

    return NextResponse.json({ message: "Password updated. Please sign in with your new password." });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Unable to reset your password right now." }, { status: 500 });
  }
}
