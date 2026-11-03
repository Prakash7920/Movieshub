export function isSameOriginRequest(request: Request): boolean {
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;

  try {
    return new URL(source).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function hasValidJsonContentType(request: Request, maxBytes = 16 * 1024): boolean {
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return false;

  const rawLength = request.headers.get("content-length");
  if (rawLength === null) return true;
  const length = Number(rawLength);
  return Number.isSafeInteger(length) && length >= 0 && length <= maxBytes;
}
