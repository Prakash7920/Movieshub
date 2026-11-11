import { NextResponse } from "next/server";
import { getVercelViewerCountry } from "@/lib/licensing/territory";

/**
 * Preview-only diagnostic for verifying Vercel's edge-injected country header.
 * This endpoint exposes only the coarse two-letter country code and is
 * unavailable in Production. Never use its output for authorization.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const country = getVercelViewerCountry(request.headers);

  return NextResponse.json(
    {
      diagnostic: "PREVIEW_ONLY",
      countryHeaderPresent: country !== null,
      resolvedCountry: country,
      note: "Coarse Vercel edge country metadata only. Not an authorization result.",
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
