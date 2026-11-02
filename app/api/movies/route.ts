import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") ?? "").trim().slice(0, 100);
    const language = searchParams.get("language") ?? "all";
    const genre = searchParams.get("genre") ?? "all";

    const movies = await prisma.movie.findMany({
      where: {
        isPublished: true,
        contentStatus: "PUBLISHED",
        ...(language !== "all" ? { language } : {}),
        ...(search ? {
          OR: [
            { titleEn: { contains: search, mode: "insensitive" } },
            { titleTa: { contains: search, mode: "insensitive" } },
            { descriptionEn: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
        ...(genre !== "all" ? { genres: { some: { genre: { slug: genre } } } } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { titleEn: "asc" }],
      select: {
        id: true, slug: true, titleEn: true, titleTa: true,
        descriptionEn: true, descriptionTa: true, posterUrl: true,
        backdropUrl: true, language: true, audioLanguages: true,
        subtitleLanguages: true, releaseYear: true, runtimeMinutes: true,
        ageRating: true, rating: true, movieType: true, isFeatured: true,
        genres: { select: { genre: { select: { name: true, slug: true } } } },
      },
    });

    const genres = await prisma.genre.findMany({
      where: { movies: { some: { movie: { isPublished: true, contentStatus: "PUBLISHED" } } } },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      movies: movies.map((movie) => ({
        ...movie,
        genre: movie.genres.map((item) => item.genre.name).join(", ") || "Uncategorised",
        genres: movie.genres.map((item) => item.genre.slug),
      })),
      genres,
    });
  } catch (error) {
    console.error("Movie catalogue fetch failed:", error);
    return NextResponse.json({ error: "Unable to load the movie catalogue." }, { status: 500 });
  }
}
