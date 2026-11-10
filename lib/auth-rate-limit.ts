import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;

function opaqueKey(identifier: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Authentication rate limiting requires a valid NEXTAUTH_SECRET.");
  }
  return createHmac("sha256", secret).update(identifier).digest("hex");
}

/**
 * Atomic PostgreSQL-backed fixed-window limiter.
 * Identifiers are HMACed so raw email addresses and IPs are never stored.
 */
export async function consumeAuthRateLimit(
  identifier: string,
  maxAttempts: number,
  windowMs = WINDOW_MS,
): Promise<boolean> {
  const key = opaqueKey(identifier);
  const rows = await prisma.$queryRaw<Array<{ count: number; blockedUntil: Date | null }>>`
    INSERT INTO "AuthRateLimit" ("key", "count", "windowStartedAt", "blockedUntil", "updatedAt")
    VALUES (${key}, 1, NOW(), NULL, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= NOW() - (${windowMs} * INTERVAL '1 millisecond') THEN 1
        ELSE "AuthRateLimit"."count" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= NOW() - (${windowMs} * INTERVAL '1 millisecond') THEN NOW()
        ELSE "AuthRateLimit"."windowStartedAt"
      END,
      "blockedUntil" = CASE
        WHEN (
          CASE
            WHEN "AuthRateLimit"."windowStartedAt" <= NOW() - (${windowMs} * INTERVAL '1 millisecond') THEN 1
            ELSE "AuthRateLimit"."count" + 1
          END
        ) > ${maxAttempts}
        THEN NOW() + (${windowMs} * INTERVAL '1 millisecond')
        ELSE NULL
      END,
      "updatedAt" = NOW()
    RETURNING "count", "blockedUntil"
  `;

  const row = rows[0];
  return Boolean(row && row.count <= maxAttempts && (!row.blockedUntil || row.blockedUntil <= new Date()));
}
