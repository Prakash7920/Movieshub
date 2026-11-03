import { createHash } from "node:crypto";

export function getSessionRevocationId(token: Record<string, unknown>): string | null {
  const jti = typeof token.jti === "string" ? token.jti : null;
  if (jti) return `jti:${jti}`;

  const subject = typeof token.sub === "string" ? token.sub : null;
  const issuedAt = typeof token.iat === "number" ? token.iat : null;
  const expiresAt = typeof token.exp === "number" ? token.exp : null;
  if (!subject || issuedAt === null || expiresAt === null) return null;

  const digest = createHash("sha256").update(`${subject}:${issuedAt}:${expiresAt}`).digest("hex");
  return `sha256:${digest}`;
}
