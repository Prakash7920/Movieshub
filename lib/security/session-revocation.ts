import { createHash } from "node:crypto";
export function getSessionRevocationId(token: Record<string, unknown>): string | null {
  const sid = typeof token.sid === "string" ? token.sid : null;
  if (sid) return `sid:${sid}`;
  const jti = typeof token.jti === "string" ? token.jti : null;
  if (jti) return `jti:${jti}`;
  const subject = typeof token.sub === "string" ? token.sub : null;
  const issuedAt = typeof token.iat === "number" ? token.iat : null;
  const expiresAt = typeof token.exp === "number" ? token.exp : null;
  if (!subject || issuedAt === null || expiresAt === null) return null;
  return `sha256:${createHash("sha256").update(`${subject}:${issuedAt}:${expiresAt}`).digest("hex")}`;
}
