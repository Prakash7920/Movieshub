import { PrismaClient, ContentStatus } from "@prisma/client";
import { mockMovies } from "../lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  for (const movie of mockMovies) {
    const data = {
      titleEn: movie.titleEn,
      titleTa: movie.titleTa,
      descriptionEn: movie.descriptionEn,
      descriptionTa: movie.descriptionTa,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      trailerUrl: null,
      videoUrl: null,
      language: movie.language,
      audioLanguages: movie.audioLanguages,
      subtitleLanguages: movie.subtitleLanguages,
      releaseYear: movie.releaseYear,
      runtimeMinutes: movie.runtimeMinutes,
      ageRating: movie.ageRating,
      rating: movie.rating,
      movieType: movie.movieType,
      isFeatured: movie.isFeatured,
      isPublished: true,
      contentStatus: ContentStatus.PUBLISHED,
      allowedCountries: movie.allowedCountries,
      downloadPermission: false,
    };

    await prisma.movie.upsert({
      where: { slug: movie.slug },
      update: data,
      create: { ...data, slug: movie.slug },
    });
  }

  console.log(`Catalogue seed complete: ${mockMovies.length} metadata records.`);
}

main()
  .catch((error) => {
    console.error("Catalogue seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
