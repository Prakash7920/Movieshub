import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type RateLimitResult = { allowed: boolean; limit: number; remaining: number; retryAfterSeconds: number };

function hashRateLimitKey(scope: string, identifier: string): string {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Rate-limit signing secret is not configured.");
  return createHmac("sha256", secret).update(`${scope}:${identifier.trim().toLowerCase()}`, "utf8").digest("hex");
}

export async function consumeRateLimit(scope: string, identifier: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  if (!scope || !identifier || !Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowSeconds) || windowSeconds < 1) {
    throw new Error("Invalid rate-limit configuration.");
  }
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
  const key = hashRateLimitKey(scope, identifier);
  const reset = await prisma.rateLimitBucket.updateMany({ where: { key, expiresAt: { lte: now } }, data: { count: 1, expiresAt } });
  const bucket = reset.count === 1 ? { count: 1, expiresAt } : await prisma.rateLimitBucket.upsert({
    where: { key }, create: { key, count: 1, expiresAt }, update: { count: { increment: 1 } }, select: { count: true, expiresAt: true },
  });
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.expiresAt.getTime() - Date.now()) / 1000));
  return { allowed: bucket.count <= limit, limit, remaining: Math.max(0, limit - bucket.count), retryAfterSeconds };
}
