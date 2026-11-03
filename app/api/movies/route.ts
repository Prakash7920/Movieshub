import { NextResponse } from "next/server";
import { logSafeError } from "@/lib/security/safe-log";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-identity";
import { prisma } from "@/lib/prisma";
import { getVercelViewerCountry } from "@/lib/licensing/territory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const ip = getClientIp(request.headers);
  if (ip) {
    try {
      const limit = await consumeRateLimit("catalogue-search-ip", ip, 120, 60);
      if (!limit.allowed) {
        return NextResponse.json({ error: "Too many catalogue requests. Please try again shortly." }, {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
        });
      }
    } catch {
      return NextResponse.json({ error: "Catalogue service is temporarily unavailable." }, { status: 503 });
    }
  }

  const country = getVercelViewerCountry(request.headers);
  if (!country) {
    return NextResponse.json(
      { error: "Your viewing country could not be verified. Please try again from the live MoviesHub website." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") ?? "").trim().slice(0, 100);
    const language = searchParams.get("language") ?? "all";
    const genre = searchParams.get("genre") ?? "all";
    if (language !== "all" && !/^[a-z]{2,3}$/.test(language)) {
      return NextResponse.json({ error: "Invalid language filter." }, { status: 400 });
    }
    if (genre !== "all" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(genre)) {
      return NextResponse.json({ error: "Invalid genre filter." }, { status: 400 });
    }
    const now = new Date();

    const currentlyLicensed = {
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

    const movies = await prisma.movie.findMany({
      where: {
        ...currentlyLicensed,
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
      take: 100,
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
      where: {
        movies: {
          some: {
            movie: {
              isPublished: true,
              contentStatus: "PUBLISHED",
              license: {
                is: {
                  status: "ACTIVE",
                  startDate: { lte: now },
                  expiryDate: { gt: now },
                  allowedCountries: { has: country },
                },
              },
            },
          },
        },
      },
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
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    logSafeError("Movie catalogue fetch failed", error);
    return NextResponse.json({ error: "Unable to load the movie catalogue." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
