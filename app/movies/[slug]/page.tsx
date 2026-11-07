import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getVercelViewerCountry } from "@/lib/licensing/territory";
import { WatchlistToggle } from "@/components/movies/watchlist";
import { AddHistoryPreview } from "@/components/movies/watch-history";
import { mockMovies } from "@/lib/mock-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MovieDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const country = getVercelViewerCountry(requestHeaders);
  const isPreview = process.env.VERCEL_ENV === "preview";
  if (!country && !isPreview) notFound();

  const now = new Date();
  const licensedMovie = country ? await prisma.movie.findFirst({
    where: {
      slug,
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
    select: {
      slug: true,
      titleEn: true,
      titleTa: true,
      descriptionEn: true,
      posterUrl: true,
      audioLanguages: true,
      subtitleLanguages: true,
      releaseYear: true,
      runtimeMinutes: true,
      rating: true,
      genres: {
        select: {
          genre: { select: { name: true } },
        },
      },
    },
  }) : null;
  const sampleMovie = isPreview ? mockMovies.find((item) => item.slug === slug) : null;
  const movie = licensedMovie ?? (sampleMovie ? {
    slug: sampleMovie.slug,
    titleEn: sampleMovie.titleEn,
    titleTa: sampleMovie.titleTa,
    descriptionEn: sampleMovie.descriptionEn,
    posterUrl: sampleMovie.posterUrl,
    audioLanguages: sampleMovie.audioLanguages,
    subtitleLanguages: sampleMovie.subtitleLanguages,
    releaseYear: sampleMovie.releaseYear,
    runtimeMinutes: sampleMovie.runtimeMinutes,
    rating: sampleMovie.rating,
    genres: [{ genre: { name: sampleMovie.genre } }],
  } : null);
  if (!movie) notFound();
  const genreNames = movie.genres.map((item) => item.genre.name).join(", ") || "Uncategorised";

  return (
    <div className="page-shell pb-16 pt-8">
      <Link href="/movies" className="text-sm text-gray-300 hover:text-white">← Back to movies</Link>
      <section className="mt-6 grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-7 md:grid-cols-[minmax(220px,280px)_1fr] md:p-10">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[280px] overflow-hidden rounded-2xl"><Image src={movie.posterUrl} alt={movie.titleEn} fill unoptimized sizes="(max-width: 768px) 80vw, 280px" className="object-cover" /></div>
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Catalogue metadata</p>
          <h1 className="mt-3 text-3xl font-bold text-white md:text-5xl">{movie.titleEn}</h1>
          <p className="mt-2 text-lg text-gray-300">{movie.titleTa}</p>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">{movie.descriptionEn}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-300"><span>{movie.releaseYear}</span><span>•</span><span>{genreNames}</span><span>•</span><span>{movie.runtimeMinutes} min</span><span>•</span><span>{movie.rating}/10</span></div>
          <p className="mt-4 text-xs text-gray-400">Audio: {movie.audioLanguages.join(", ")} · Subtitles: {movie.subtitleLanguages.join(", ")}</p>
          <WatchlistToggle slug={movie.slug} />
          <AddHistoryPreview slug={movie.slug} />
          <div className="mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">Playback is disabled in this preview until distribution rights and secure video access are verified.</div>
        </div>
      </section>
    </div>
  );
}
