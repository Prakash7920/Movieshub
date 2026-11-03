type HeaderRecord = Record<string, string | string[] | undefined>;

function readHeader(headers: Headers | HeaderRecord, name: string): string | null {
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }

  const record = headers as HeaderRecord;
  const key = Object.keys(record).find((candidate) => candidate.toLowerCase() === name);
  const value = key ? record[key] : undefined;
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

/**
 * Prefer proxy-provided client IP metadata. This value is used only as a
 * rate-limit dimension, never as an authorization or territory decision.
 */
export function getClientIp(headers: Headers | HeaderRecord): string | null {
  const realIp = readHeader(headers, "x-real-ip")?.trim();
  if (realIp && realIp.length <= 128) return realIp;

  const forwarded = readHeader(headers, "x-forwarded-for");
  const lastForwarded = forwarded?.split(",").map((part) => part.trim()).filter(Boolean).at(-1);
  return lastForwarded && lastForwarded.length <= 128 ? lastForwarded : null;
}
