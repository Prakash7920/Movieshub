import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-identity";

export type PrivateApiRateLimit = {
  allowed: boolean;
  retryAfterSeconds: number;
  available: boolean;
};

/**
 * Apply independent user and trusted-proxy-IP limits to an authenticated API.
 * IP metadata is only a throttling dimension; authentication remains session-based.
 * If no client IP is available, the per-user limit still applies.
 */
export async function consumePrivateApiRateLimit(
  request: Request,
  userId: string,
  options: {
    userScope: string;
    userLimit: number;
    ipScope: string;
    ipLimit: number;
    windowSeconds?: number;
  },
): Promise<PrivateApiRateLimit> {
  const windowSeconds = options.windowSeconds ?? 60;

  try {
    const ip = getClientIp(request.headers);
    const checks = [
      consumeRateLimit(options.userScope, userId, options.userLimit, windowSeconds),
    ];

    if (ip) {
      checks.push(consumeRateLimit(options.ipScope, ip, options.ipLimit, windowSeconds));
    }

    const results = await Promise.all(checks);
    return {
      allowed: results.every((result) => result.allowed),
      retryAfterSeconds: Math.max(1, ...results.map((result) => result.retryAfterSeconds)),
      available: true,
    };
  } catch {
    return { allowed: false, retryAfterSeconds: 60, available: false };
  }
}
