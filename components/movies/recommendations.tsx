"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Pick = {
  id: string;
  slug: string;
  title: string;
  titleTa: string;
  posterUrl: string;
  rating: number;
  reason: string;
  genre: string;
  releaseYear: number;
};

type Result = {
  userName: string;
  watchCount: number;
  recommendations: Pick[];
  signals: { name: string; count: number }[];
};

export function Recommendations() {
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/recommendations", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Recommendations are unavailable.");
        return payload.recommendations as Result;
      })
      .then((result) => { if (active) setData(result); })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load recommendations.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="page-shell py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-300">MoviesHub personal picks</p>
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Recommended for you</h1>
        <p className="mt-3 text-gray-300">Picks are based on your licensed viewing history and verified viewing territory.</p>
      </div>

      {loading && <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300">Loading your recommendations…</p>}

      {!loading && error && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-gray-200">{error}</p>
          <Link href="/auth/login" className="mt-4 inline-flex rounded-full bg-red-600 px-5 py-3 text-white">Sign in</Link>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <p className="mb-5 text-sm text-gray-400">{data.watchCount} eligible titles in your recent viewing history</p>
          {data.signals.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {data.signals.map((signal) => (
                <span key={signal.name} className="rounded-full border border-white/10 px-3 py-1 text-sm text-gray-300">{signal.name} · {signal.count}</span>
              ))}
            </div>
          )}
          {data.recommendations.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300">No eligible recommendations yet. Add licensed titles to your watch history and check again later.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.recommendations.map((movie) => (
                <article key={movie.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <div className="relative aspect-[16/10] bg-black/30">
                    <Image src={movie.posterUrl} alt={movie.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-white">{movie.title}</h2>
                    <p className="mt-1 text-sm text-gray-400">{movie.titleTa} · {movie.releaseYear} · {movie.genre} · ★ {movie.rating.toFixed(1)}</p>
                    <p className="mt-3 text-sm text-gray-300">{movie.reason}</p>
                    <Link href={`/movies/${encodeURIComponent(movie.slug)}`} className="mt-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10">View details</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
