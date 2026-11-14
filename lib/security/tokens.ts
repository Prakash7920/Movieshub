import { createHash, randomBytes } from "node:crypto";
export type OneTimeToken = { token: string; tokenHash: string };
export function createOneTimeToken(): OneTimeToken {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashOneTimeToken(token) };
}
export function hashOneTimeToken(token: string): string { return createHash("sha256").update(token, "utf8").digest("hex"); }
export function isWellFormedOneTimeToken(token: unknown): token is string { return typeof token === "string" && /^[a-f0-9]{64}$/.test(token); }
