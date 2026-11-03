import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logSafeError } from "@/lib/security/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || secret.length < 32 || !authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(authorization);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await prisma.rateLimitBucket.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });
    return NextResponse.json({ status: "ok", expiredBucketsRemoved: result.count }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logSafeError("Rate-limit cleanup failed", error);
    return NextResponse.json({ error: "Cleanup is temporarily unavailable." }, { status: 503 });
  }
}
