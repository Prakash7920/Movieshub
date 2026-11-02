"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Trash2 } from "lucide-react";
import { mockMovies } from "@/lib/mock-data";

const STORAGE_KEY = "movieshub-watchlist";

function readWatchlist(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function WatchlistToggle({ slug }: { slug: string }) {
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSaved(readWatchlist().includes(slug));
    setReady(true);
  }, [slug]);

  function toggle() {
    const current = readWatchlist();
    const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(next.includes(slug));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready}
      aria-pressed={saved}
      className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-red-400 hover:bg-white/10 disabled:opacity-60"
    >
      {saved ? <BookmarkCheck className="h-4 w-4 text-red-300" /> : <Bookmark className="h-4 w-4" />}
      {saved ? "Remove from Watchlist" : "Add to Watchlist"}
    </button>
  );
}

export function WatchlistContent() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSlugs(readWatchlist());
    setReady(true);
  }, []);

  function remove(slug: string) {
    const next = slugs.filter((item) => item !== slug);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSlugs(next);
  }

  if (!ready) {
    return <p className="py-12 text-center text-sm text-gray-400">Loading your watchlist...</p>;
  }

  const savedMovies = slugs
    .map((slug) => mockMovies.find((movie) => movie.slug === slug))
    .filter((movie): movie is (typeof mockMovies)[number] => Boolean(movie));

  if (savedMovies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-5 py-14 text-center">
        <Bookmark className="mx-auto h-8 w-8 text-gray-500" />
        <h2 className="mt-3 text-lg font-semibold text-white">Your watchlist is empty</h2>
        <p className="mt-1 text-sm text-gray-400">Save movies from their detail pages and they will appear here.</p>
        <Link href="/movies" className="mt-5 inline-flex rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500">Browse movies</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {savedMovies.map((movie) => (
        <article key={movie.slug} className="overflow-hidden rounded-2xl border border-white/10 bg-card/70">
          <Link href={`/movies/${movie.slug}`} className="block">
            <div className="relative aspect-[2/3] bg-gray-900">
              <Image src={movie.posterUrl} alt={movie.titleEn} fill unoptimized className="object-cover" />
            </div>
          </Link>
          <div className="p-3">
            <Link href={`/movies/${movie.slug}`} className="block truncate text-sm font-semibold text-white hover:text-red-200">{movie.titleEn}</Link>
            <p className="mt-1 text-xs text-gray-400">{movie.releaseYear} · {movie.genre}</p>
            <button onClick={() => remove(movie.slug)} className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-red-300">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
