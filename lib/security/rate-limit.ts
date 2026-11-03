import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

function hashRateLimitKey(scope: string, identifier: string): string {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Rate-limit signing secret is not configured.");
  }

  return createHmac("sha256", secret)
    .update(`${scope}:${identifier.trim().toLowerCase()}`, "utf8")
    .digest("hex");
}

/**
 * PostgreSQL-backed fixed-window limiter. Atomic upsert/increment operations
 * make limits shared across serverless instances instead of relying on memory.
 * Only an HMAC of the identifier is stored; raw email/IP values are not saved.
 */
export async function consumeRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (!scope || !identifier || !Number.isInteger(limit) || limit < 1 ||
      !Number.isInteger(windowSeconds) || windowSeconds < 1) {
    throw new Error("Invalid rate-limit configuration.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
  const key = hashRateLimitKey(scope, identifier);

  const reset = await prisma.rateLimitBucket.updateMany({
    where: { key, expiresAt: { lte: now } },
    data: { count: 1, expiresAt },
  });

  const bucket = reset.count === 1
    ? { count: 1, expiresAt }
    : await prisma.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, expiresAt },
        update: { count: { increment: 1 } },
        select: { count: true, expiresAt: true },
      });

  const effectiveCount = bucket.count;
  const resetAt = bucket.expiresAt;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));

  return {
    allowed: effectiveCount <= limit,
    limit,
    remaining: Math.max(0, limit - effectiveCount),
    retryAfterSeconds,
  };
}
