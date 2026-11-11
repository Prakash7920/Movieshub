import { NextResponse } from "next/server";

function configuredOrigins(): Set<string> {
  const values = [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_APP_URL];
  const origins = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:")) {
        origins.add(url.origin);
      }
    } catch {
      // Invalid configured URLs are rejected by environment validation in production.
    }
  }
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return origins;
}

/**
 * Same-origin defence for cookie-authenticated, state-changing application APIs.
 * NextAuth's own authentication endpoints keep using NextAuth's built-in CSRF checks.
 */
export function rejectCrossOriginRequest(request: Request): Response | null {
  const origins = configuredOrigins();
  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");

  let requestOrigin: string | null = null;
  if (originHeader !== null) {
    try {
      const parsed = new URL(originHeader);
      if (parsed.origin !== originHeader || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) {
        return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403, headers: { "Cache-Control": "no-store" } });
      }
      requestOrigin = parsed.origin;
    } catch {
      return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
  } else if (refererHeader !== null) {
    try {
      requestOrigin = new URL(refererHeader).origin;
    } catch {
      return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
  }

  if (!requestOrigin) {
    if (process.env.NODE_ENV !== "production") return null;
    return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  if (!origins.has(requestOrigin)) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  return null;
}
