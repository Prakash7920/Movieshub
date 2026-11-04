export function isSameOriginRequest(request: Request): boolean {
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;

  try {
    // Next.js may expose an internal request URL behind a proxy. The Host
    // header identifies the authority that received the browser request, so
    // compare the browser source with that host rather than the internal URL.
    // This supports Vercel Preview hostnames without trusting NEXTAUTH_URL,
    // which may intentionally point at a different canonical deployment URL.
    const requestUrl = new URL(request.url);
    const requestHost = request.headers.get("host") || requestUrl.host;
    const sourceUrl = new URL(source);
    return (sourceUrl.protocol === "https:" || sourceUrl.protocol === "http:") &&
      sourceUrl.protocol === requestUrl.protocol &&
      sourceUrl.host === requestHost;
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
