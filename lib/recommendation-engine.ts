import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type RecommendationSignal = {
  name: string;
  count: number;
};

export type RecommendationMovie = {
  id: string;
  slug: string;
  title: string;
  titleTa: string;
  posterUrl: string;
  backdropUrl: string;
  rating: number;
  score: number;
  reason: string;
  movieType: string;
  genre: string;
  releaseYear: number;
};

export type RecommendationAssistantResult = {
  userName: string;
  preferredLanguage: "en" | "ta";
  subscription: "FREE" | "PREMIUM" | string;
  watchCount: number;
  recommendations: RecommendationMovie[];
  signals: RecommendationSignal[];
  error?: string;
};

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Please provide a valid email address." })
  .max(254, "Email address is too long.");

export function validateUserEmail(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  const result = emailSchema.safeParse(input.trim());
  return result.success ? result.data : null;
}

function buildFallbackResult(error?: string): RecommendationAssistantResult {
  return {
    userName: "Viewer",
    preferredLanguage: "ta",
    subscription: "FREE",
    watchCount: 0,
    recommendations: [],
    signals: [],
    error,
  };
}

export async function getRecommendationAssistantData(
  userEmail: string | null | undefined,
  viewerCountry?: string | null,
): Promise<RecommendationAssistantResult> {
  const safeEmail = validateUserEmail(userEmail);
  const country = typeof viewerCountry === "string" ? viewerCountry.trim().toUpperCase() : "";

  if (!safeEmail) return buildFallbackResult("A valid user email is required to generate recommendations.");
  if (!/^[A-Z]{2}$/.test(country)) {
    return buildFallbackResult("Viewer country could not be verified; territory-restricted recommendations are unavailable.");
  }

  try {
    const now = new Date();
    const currentLicenceFilter = {
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

    const user = await prisma.user.findUnique({
      where: { email: safeEmail },
      include: {
        profiles: true,
        watchHistory: {
          where: { movie: currentLicenceFilter },
          orderBy: { lastWatchedAt: "desc" },
          take: 10,
          include: {
            movie: {
              include: {
                genres: {
                  include: { genre: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return buildFallbackResult("No matching user profile was found for the recommendation engine.");

    const preferredLanguage = (user.profiles[0]?.languagePreference === "en" ? "en" : "ta") as "en" | "ta";
    const watchedHistory = user.watchHistory ?? [];

    const genreCounts = new Map<string, number>();
    for (const item of watchedHistory) {
      for (const movieGenre of item.movie.genres) {
        const currentCount = genreCounts.get(movieGenre.genre.name) ?? 0;
        genreCounts.set(movieGenre.genre.name, currentCount + 1);
      }
    }

    const topSignals: RecommendationSignal[] = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    const watchedIds = new Set(watchedHistory.map((item) => item.movieId));

    const candidateMovies = await prisma.movie.findMany({
      where: currentLicenceFilter,
      include: {
        genres: {
          include: { genre: true },
        },
      },
      orderBy: { rating: "desc" },
      take: 30,
    });

    const recommendations = candidateMovies
      .filter((movie) => !watchedIds.has(movie.id))
      .map((movie) => {
        const genreNames = movie.genres.map((entry) => entry.genre.name);
        const matchedGenres = genreNames.filter((genreName) => genreCounts.has(genreName));
        const languageBonus = movie.language === preferredLanguage ? 10 : 0;
        const genreBoost = matchedGenres.length * 12;
        const popularityBoost = Math.min(movie.watchCount / 10000, 12);
        const score =
          movie.rating * 10 +
          genreBoost +
          languageBonus +
          popularityBoost +
          (movie.isFeatured ? 5 : 0);

        const reason = matchedGenres.length
          ? `Your recent picks lean toward ${matchedGenres[0]} stories, and this title matches that mood.`
          : `Recent preference for ${preferredLanguage === "ta" ? "Tamil" : "English"} cinema makes this a strong match.`;

        return {
          id: movie.id,
          slug: movie.slug,
          title: movie.titleEn,
          titleTa: movie.titleTa,
          posterUrl: movie.posterUrl,
          backdropUrl: movie.backdropUrl,
          rating: Number(movie.rating.toFixed(1)),
          score: Number(score.toFixed(1)),
          reason,
          movieType: movie.movieType,
          genre: genreNames[0] ?? "Drama",
          releaseYear: movie.releaseYear,
        } satisfies RecommendationMovie;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return {
      userName: user.name ?? "Viewer",
      preferredLanguage,
      subscription: activeSubscription,
      watchCount: watchedHistory.length,
      recommendations,
      signals: topSignals,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected database error occurred.";
    return buildFallbackResult(`Recommendation engine is temporarily unavailable: ${message}`);
  }
}
