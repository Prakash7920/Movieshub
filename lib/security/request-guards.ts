export function isSameOriginRequest(request: Request): boolean {
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;
  try {
    const configuredUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
    const expectedOrigin = configuredUrl ? new URL(configuredUrl).origin : new URL(request.url).origin;
    return new URL(source).origin === expectedOrigin;
  } catch { return false; }
}
export async function hasValidJsonContentType(request: Request, maxBytes = 16 * 1024): Promise<boolean> {
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return false;
  const rawLength = request.headers.get("content-length");
  if (rawLength !== null) {
    const length = Number(rawLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > maxBytes) return false;
  }
  try { return new TextEncoder().encode(await request.clone().text()).byteLength <= maxBytes; }
  catch { return false; }
}
