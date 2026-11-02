import Image from "next/image";
import Link from "next/link";
import { mockMovies } from "@/lib/mock-data";

export default function MoviesPage() {
  return (
    <div className="page-shell py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">MoviesHub catalogue</p>
        <h1 className="mt-3 text-3xl font-bold text-white md:text-5xl">Explore movies</h1>
        <p className="mt-3 text-gray-400">Browse sample catalogue metadata. Playback remains disabled until distribution rights are verified.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {mockMovies.map((movie) => (
          <Link key={movie.id} href={`/movies/${movie.slug}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-red-500/50">
            <div className="relative aspect-[2/3] bg-black">
              <Image src={movie.posterUrl} alt={movie.titleEn} fill unoptimized className="object-cover transition group-hover:scale-[1.02]" />
            </div>
            <div className="p-3">
              <h2 className="truncate font-semibold text-white">{movie.titleEn}</h2>
              <p className="mt-1 text-xs text-gray-400">{movie.releaseYear} · {movie.genre}</p>
              <p className="mt-2 text-xs text-red-200">View details</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
