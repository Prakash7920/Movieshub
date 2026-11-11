"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";

type MovieItem = {
  id: string; slug: string; titleEn: string; titleTa: string;
  posterUrl: string; language: string; releaseYear: number; genre: string;
};
type GenreItem = { name: string; slug: string };

export default function MoviesPage() {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");
  const [genre, setGenre] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (language !== "all") params.set("language", language);
    if (genre !== "all") params.set("genre", genre);
    setLoading(true);
    fetch(`/api/movies?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to load movies.");
        if (active) { setMovies(data.movies as MovieItem[]); setGenres(data.genres as GenreItem[]); setError(""); }
      })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, language, genre]);

  const clearFilters = () => { setSearch(""); setLanguage("all"); setGenre("all"); };

  return (
    <div className="page-shell py-8 sm:py-10">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">NexaFilm catalogue</p>
        <h1 className="mt-3 text-3xl font-bold text-white md:text-5xl">Explore movies</h1>
        <p className="mt-3 max-w-2xl text-sm text-gray-400 sm:text-base">Browse published catalogue metadata from NexaFilm. Playback remains disabled until distribution rights are verified.</p>
      </div>
      <section className="mb-7 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="relative block">
            <span className="sr-only">Search movies</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search movie, title or description..." className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-red-400 focus:outline-none" />
          </label>
          <label className="block"><span className="sr-only">Filter by language</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className="w-full rounded-xl border border-white/10 bg-gray-950 px-3 py-3 text-sm text-white">
              <option value="all">All languages</option><option value="ta">Tamil</option><option value="en">English</option><option value="te">Telugu</option><option value="ml">Malayalam</option><option value="kn">Kannada</option><option value="hi">Hindi</option>
            </select>
          </label>
          <label className="block"><span className="sr-only">Filter by genre</span>
            <select value={genre} onChange={(event) => setGenre(event.target.value)} className="w-full rounded-xl border border-white/10 bg-gray-950 px-3 py-3 text-sm text-white">
              <option value="all">All genres</option>{genres.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
          <p className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> {loading ? "Loading catalogue..." : `Showing ${movies.length} movies`}</p>
          {(search || language !== "all" || genre !== "all") && <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-gray-200 hover:bg-white/10"><X className="h-3.5 w-3.5" /> Clear filters</button>}
        </div>
      </section>
      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
      {loading ? <p className="py-12 text-center text-sm text-gray-400">Loading movies...</p> : movies.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {movies.map((movie) => <Link key={movie.id} href={`/movies/${movie.slug}`} className="group min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-red-500/50">
            <div className="relative aspect-[2/3] overflow-hidden bg-gray-900"><Image src={movie.posterUrl} alt={movie.titleEn} fill unoptimized sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="object-cover transition duration-300 group-hover:scale-105" /><span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-1 text-[10px] font-medium text-white">{movie.language.toUpperCase()}</span></div>
            <div className="p-3"><h2 className="truncate text-sm font-semibold text-white sm:text-base">{movie.titleEn}</h2><p className="mt-1 truncate text-xs text-gray-400">{movie.titleTa}</p><p className="mt-2 text-xs text-gray-400">{movie.releaseYear} · {movie.genre}</p><p className="mt-2 text-xs font-medium text-red-200">View details →</p></div>
          </Link>)}
        </div>
      ) : !error ? <div className="rounded-2xl border border-dashed border-white/15 px-5 py-14 text-center"><Search className="mx-auto h-8 w-8 text-gray-500" /><h2 className="mt-3 text-lg font-semibold text-white">No movies found</h2><p className="mt-1 text-sm text-gray-400">Try another title or clear the filters.</p><button onClick={clearFilters} className="mt-4 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500">Clear filters</button></div> : null}
    </div>
  );
}
