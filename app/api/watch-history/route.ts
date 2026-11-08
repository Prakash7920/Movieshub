import { NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/security/origin-check";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getVercelViewerCountry } from "@/lib/licensing/territory";

export const runtime = "nodejs";

async function getUserId() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  return user?.id ?? null;
}

function currentLicenceFilter(country: string) {
  const now = new Date();
  return {
    isPublished: true,
    contentStatus: "PUBLISHED" as const,
    license: {
      is: {
        status: "ACTIVE" as const,
        startDate: { lte: now },
        expiryDate: { gt: now },
        allowedCountries: { has: country },
      },
    },
  };
}

function countryUnavailable() {
  return NextResponse.json(
    { error: "Your viewing country could not be verified. Please try again from the live MoviesHub website." },
    { status: 503, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(request: Request) {
  try {
    const country = getVercelViewerCountry(request.headers);
    if (!country) return countryUnavailable();
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in to view watch history." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });

    const items = await prisma.watchHistory.findMany({
      where: { userId, movie: currentLicenceFilter(country) },
      orderBy: { lastWatchedAt: "desc" },
      select: {
        id: true,
        progress: true,
        lastWatchedAt: true,
        movie: {
          select: {
            slug: true,
            titleEn: true,
            titleTa: true,
            posterUrl: true,
            releaseYear: true,
            runtimeMinutes: true,
          },
        },
      },
    });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Watch history fetch failed:", error);
    return NextResponse.json({ error: "Unable to load watch history." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function POST(request: Request) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;
  try {
    const country = getVercelViewerCountry(request.headers);
    if (!country) return countryUnavailable();
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in to save watch history." }, { status: 401 });

    const body: unknown = await request.json();
    const slug = typeof body === "object" && body !== null && "slug" in body && typeof body.slug === "string" ? body.slug.trim() : "";
    const progress = typeof body === "object" && body !== null && "progress" in body && typeof body.progress === "number" ? body.progress : 0;

    if (!slug || slug.length > 120) return NextResponse.json({ error: "A valid movie slug is required." }, { status: 400 });
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) return NextResponse.json({ error: "Progress must be a whole number from 0 to 100." }, { status: 400 });

    const movie = await prisma.movie.findFirst({
      where: { slug, ...currentLicenceFilter(country) },
      select: { id: true },
    });
    if (!movie) return NextResponse.json({ error: "Movie not found in the currently licensed catalogue for your territory." }, { status: 404 });

    const item = await prisma.watchHistory.upsert({
      where: { userId_movieId: { userId, movieId: movie.id } },
      update: { progress, lastWatchedAt: new Date() },
      create: { userId, movieId: movie.id, progress },
      select: { id: true, progress: true, lastWatchedAt: true },
    });
    return NextResponse.json({ message: "Watch history saved.", item }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Watch history save failed:", error);
    return NextResponse.json({ error: "Unable to save watch history right now." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in to edit watch history." }, { status: 401 });

    const body: unknown = await request.json();
    const slug = typeof body === "object" && body !== null && "slug" in body && typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug || slug.length > 120) return NextResponse.json({ error: "A valid movie slug is required." }, { status: 400 });

    await prisma.watchHistory.deleteMany({ where: { userId, movie: { slug } } });
    return NextResponse.json({ message: "Watch history entry removed." }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Watch history removal failed:", error);
    return NextResponse.json({ error: "Unable to remove this history entry." }, { status: 500 });
  }
}
