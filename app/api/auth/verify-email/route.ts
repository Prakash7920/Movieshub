import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashOneTimeToken, isWellFormedOneTimeToken } from "@/lib/security/tokens";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-identity";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().refine(isWellFormedOneTimeToken) });

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });
    }

    const ip = getClientIp(request.headers);
    if (ip) {
      const limit = await consumeRateLimit("verify-email-ip", ip, 30, 60 * 60);
      if (!limit.allowed) {
        return NextResponse.json({ error: "Too many verification attempts. Please try again later." }, {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
        });
      }
    }

    const tokenHash = hashOneTimeToken(parsed.data.token);
    const now = new Date();
    const verified = await prisma.$transaction(async (tx) => {
      const token = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, usedAt: true, user: { select: { isEmailVerified: true } } },
      });
      if (!token || token.usedAt || token.expiresAt <= now || token.user.isEmailVerified) return false;

      const claimed = await tx.emailVerificationToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) return false;

      await tx.user.update({ where: { id: token.userId }, data: { isEmailVerified: true } });
      await tx.emailVerificationToken.deleteMany({ where: { userId: token.userId, id: { not: token.id } } });
      return true;
    }, { isolationLevel: "Serializable" });

    if (!verified) {
      return NextResponse.json({ error: "This verification link is invalid, expired, or already used." }, { status: 400 });
    }

    return NextResponse.json({ message: "Your email address has been verified." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to verify your email right now." }, { status: 503 });
  }
}
