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

    const savedMovie = await prisma.movie.upsert({
      where: { slug: movie.slug },
      update: data,
      create: { ...data, slug: movie.slug },
      select: { id: true },
    });

    const genreSlug = movie.genre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const savedGenre = await prisma.genre.upsert({
      where: { slug: genreSlug },
      update: { name: movie.genre },
      create: { name: movie.genre, slug: genreSlug },
      select: { id: true },
    });

    await prisma.movieGenre.upsert({
      where: { movieId_genreId: { movieId: savedMovie.id, genreId: savedGenre.id } },
      update: {},
      create: { movieId: savedMovie.id, genreId: savedGenre.id },
    });
  }

  console.log(`Catalogue seed complete: ${mockMovies.length} metadata records and genre links.`);
}

main()
  .catch((error) => {
    console.error("Catalogue seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
