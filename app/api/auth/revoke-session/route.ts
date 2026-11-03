import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getSessionRevocationId } from "@/lib/security/session-revocation";
import { isSameOriginRequest } from "@/lib/security/request-guards";
import { logSafeError } from "@/lib/security/safe-log";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const userId = typeof token?.sub === "string" ? token.sub : null;
    const tokenId = token ? getSessionRevocationId(token) : null;
    const expiresAt = typeof token?.exp === "number" ? new Date(token.exp * 1000) : null;
    if (!userId || !tokenId || !expiresAt || expiresAt <= new Date()) {
      return NextResponse.json({ error: "No active session." }, { status: 401 });
    }

    const limit = await consumeRateLimit("session-revoke", userId, 20, 60);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many logout attempts. Please try again." }, {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.revokedSessionToken.upsert({
        where: { tokenId },
        create: { tokenId, userId, expiresAt },
        update: { expiresAt },
      });
      if (typeof token.sid !== "string") {
        // Legacy tokens have no stable session ID; invalidate all older sessions for this account.
        await tx.user.update({ where: { id: userId }, data: { passwordChangedAt: new Date() } });
      }
    });

    return NextResponse.json({ status: "revoked" }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    logSafeError("Session revocation endpoint failed", error);
    return NextResponse.json({ error: "Secure logout is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
