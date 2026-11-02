import Link from "next/link";
import { mockMovies } from "@/lib/mock-data";

export function generateStaticParams() {
  return mockMovies.map((movie) => ({ slug: movie.slug }));
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const movie = mockMovies.find((item) => item.slug === slug) ?? mockMovies[0];

  return (
    <div className="page-shell pb-16 pt-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">MoviesHub preview</p>
        <h1 className="mt-3 text-3xl font-bold text-white md:text-5xl">{movie.titleEn}</h1>
        <p className="mt-5 max-w-2xl text-gray-300">
          Streaming is currently unavailable. Playback will be enabled only after content distribution rights, territory permissions, and secure media delivery are verified.
        </p>
        <Link href={`/movies/${movie.slug}`} className="mt-8 inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">
          Back to movie details
        </Link>
      </div>
    </div>
  );
}
