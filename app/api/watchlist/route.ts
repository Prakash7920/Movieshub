import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getUserId() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  return user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in to view your watchlist." }, { status: 401 });

    const items = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        movie: {
          select: {
            slug: true,
            titleEn: true,
            titleTa: true,
            posterUrl: true,
            releaseYear: true,
            language: true,
            rating: true,
          },
        },
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Watchlist fetch failed:", error);
    return NextResponse.json({ error: "Unable to load your watchlist." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in to save movies." }, { status: 401 });

    const body: unknown = await request.json();
    const slug = typeof body === "object" && body !== null && "slug" in body && typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug || slug.length > 120) return NextResponse.json({ error: "A valid movie slug is required." }, { status: 400 });

    const movie = await prisma.movie.findFirst({
      where: { slug, isPublished: true, contentStatus: "PUBLISHED" },
      select: { id: true },
    });
    if (!movie) return NextResponse.json({ error: "Movie not found in the published catalogue." }, { status: 404 });

    const item = await prisma.watchlist.upsert({
      where: { userId_movieId: { userId, movieId: movie.id } },
      update: {},
      create: { userId, movieId: movie.id },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({ message: "Movie saved to your watchlist.", item }, { status: 201 });
  } catch (error) {
    console.error("Watchlist save failed:", error);
    return NextResponse.json({ error: "Unable to save this movie right now." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in to edit your watchlist." }, { status: 401 });

    const body: unknown = await request.json();
    const slug = typeof body === "object" && body !== null && "slug" in body && typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug || slug.length > 120) return NextResponse.json({ error: "A valid movie slug is required." }, { status: 400 });

    await prisma.watchlist.deleteMany({
      where: { userId, movie: { slug } },
    });

    return NextResponse.json({ message: "Movie removed from your watchlist." });
  } catch (error) {
    console.error("Watchlist removal failed:", error);
    return NextResponse.json({ error: "Unable to remove this movie right now." }, { status: 500 });
  }
}
