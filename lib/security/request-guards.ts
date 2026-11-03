export function isSameOriginRequest(request: Request): boolean {
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;

  try {
    // Validate against the origin serving this request. Preview deployments use
    // unique Vercel hostnames, while NEXTAUTH_URL may point at a canonical URL.
    // Comparing to the configured canonical URL incorrectly rejects legitimate
    // same-origin POSTs from Preview deployments.
    const requestOrigin = new URL(request.url).origin;
    const sourceUrl = new URL(source);
    return (sourceUrl.protocol === "https:" || sourceUrl.protocol === "http:") &&
      sourceUrl.origin === requestOrigin;
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
