import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { mockMovies } from "@/lib/mock-data";

export function generateStaticParams() {
  return mockMovies.map((movie) => ({ slug: movie.slug }));
}

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const movie = mockMovies.find((item) => item.slug === slug);

  if (!movie) notFound();

  return (
    <div className="page-shell pb-16 pt-8">
      <Link href="/movies" className="text-sm text-gray-300 hover:text-white">
        ← Back to movies
      </Link>
      <section className="mt-6 grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-6 md:grid-cols-[280px_1fr] md:p-10">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[280px] overflow-hidden rounded-2xl">
          <Image src={movie.posterUrl} alt={movie.titleEn} fill unoptimized className="object-cover" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Catalogue preview</p>
          <h1 className="mt-3 text-3xl font-bold text-white md:text-5xl">{movie.titleEn}</h1>
          <p className="mt-2 text-lg text-gray-300">{movie.titleTa}</p>
          <p className="mt-5 max-w-2xl text-gray-300">{movie.descriptionEn}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-300">
            <span>{movie.releaseYear}</span><span>•</span><span>{movie.genre}</span><span>•</span><span>{movie.runtimeMinutes} min</span><span>•</span><span>{movie.rating}/10</span>
          </div>
          <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            Playback is disabled in this preview until distribution rights and secure video access are verified.
          </div>
        </div>
      </section>
    </div>
  );
}
