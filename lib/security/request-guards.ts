export function isSameOriginRequest(request: Request): boolean {
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;

  try {
    return new URL(source).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function hasValidJsonContentType(request: Request, maxBytes = 16 * 1024): Promise<boolean> {
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return false;

  const rawLength = request.headers.get("content-length");
  if (rawLength !== null) {
    const length = Number(rawLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > maxBytes) return false;
  }

  try {
    const body = await request.clone().text();
    return new TextEncoder().encode(body).byteLength <= maxBytes;
  } catch {
    return false;
  }
}
