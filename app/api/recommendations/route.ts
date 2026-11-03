import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { getVercelViewerCountry } from "@/lib/licensing/territory";
import { getRecommendationAssistantData } from "@/lib/recommendation-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; email?: string | null } | undefined;

  if (!sessionUser?.id || !sessionUser.email) {
    return NextResponse.json(
      { error: "Sign in to view your recommendations." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const country = getVercelViewerCountry(request.headers);
  if (!country) {
    return NextResponse.json(
      { error: "Your viewing country could not be verified." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const result = await getRecommendationAssistantData(sessionUser.email, country);
    if (result.error) {
      console.error("Recommendation data unavailable:", result.error);
      return NextResponse.json(
        { error: "Recommendations are temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      { recommendations: result },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Recommendation request failed:", error);
    return NextResponse.json(
      { error: "Unable to load recommendations." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
