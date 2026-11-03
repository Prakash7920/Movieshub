import { NextResponse } from "next/server";
import { hasValidJsonContentType, isSameOriginRequest } from "@/lib/security/request-guards";
import { logSafeError } from "@/lib/security/safe-log";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashOneTimeToken, isWellFormedOneTimeToken } from "@/lib/security/tokens";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-identity";

export const runtime = "nodejs";

const resetSchema = z.object({
  token: z.string().refine(isWellFormedOneTimeToken),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (!hasValidJsonContentType(request)) {
    return NextResponse.json({ error: "A valid JSON request is required." }, { status: 415, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const ip = getClientIp(request.headers);
    if (ip) {
      const limit = await consumeRateLimit("password-reset-complete-ip", ip, 10, 60 * 60);
      if (!limit.allowed) {
        return NextResponse.json({ error: "Too many reset attempts. Please request a new link later." }, {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
        });
      }
    }

    const body: unknown = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "The reset link is invalid or expired." }, { status: 400 });
    }

    const tokenHash = hashOneTimeToken(parsed.data.token);
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
    logSafeError("Password reset failed", error);
    return NextResponse.json({ error: "Unable to reset your password right now." }, { status: 500 });
  }
}