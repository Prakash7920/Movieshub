"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Trash2 } from "lucide-react";

type WatchlistItem = {
  id: string;
  movie: {
    slug: string;
    titleEn: string;
    titleTa: string;
    posterUrl: string;
    releaseYear: number;
    language: string;
    rating: number;
    genre: string;
  };
};

type Pagination = { page: number; pageSize: number; totalItems: number; totalPages: number };

async function loadWatchlist(page = 1): Promise<{ items: WatchlistItem[]; pagination: Pagination }> {
  const response = await fetch(`/api/watchlist?page=${page}&pageSize=20`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Unable to load watchlist.");
  return { items: data.items as WatchlistItem[], pagination: data.pagination as Pagination };
}

async function saveWatchlistMovie(slug: string, saved: boolean) {
  const response = await fetch("/api/watchlist", {
    method: saved ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Unable to update watchlist.");
}

export function WatchlistToggle({ slug }: { slug: string }) {
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/watchlist?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to load watchlist.");
        if (active) setSaved(Boolean(data.isSaved));
      })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [slug]);

  async function toggle() {
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    try {
      await saveWatchlistMovie(slug, !saved);
      setSaved(!saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update watchlist.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={!ready || busy}
        aria-pressed={saved}
        className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-red-400 hover:bg-white/10 disabled:opacity-60"
      >
        {saved ? <BookmarkCheck className="h-4 w-4 text-red-300" /> : <Bookmark className="h-4 w-4" />}
        {busy ? "Saving..." : saved ? "Remove from Watchlist" : "Add to Watchlist"}
      </button>
      {error && <p role="status" className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function WatchlistContent() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });

  useEffect(() => {
    let active = true;
    setReady(false);
    loadWatchlist(page)
      .then((result) => {
        if (active) {
          setItems(result.items);
          setPagination(result.pagination);
          setError("");
        }
      })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [page]);

  async function remove(slug: string) {
    setRemoving(slug);
    setError("");
    try {
      await saveWatchlistMovie(slug, false);
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else {
        setItems((current) => current.filter((item) => item.movie.slug !== slug));
        setPagination((current) => ({ ...current, totalItems: Math.max(0, current.totalItems - 1) }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove this movie.");
    } finally {
      setRemoving("");
    }
  }

  if (!ready) return <p className="py-12 text-center text-sm text-gray-400">Loading your watchlist...</p>;
  if (error && items.length === 0) return <p role="alert" className="py-10 text-center text-sm text-red-300">{error}</p>;

  if (items.length === 0) {
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
    <div>
      {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {items.map(({ movie }) => (
          <article key={movie.slug} className="overflow-hidden rounded-2xl border border-white/10 bg-card/70">
            <Link href={`/movies/${movie.slug}`} className="block">
              <div className="relative aspect-[2/3] bg-gray-900">
                <Image src={movie.posterUrl} alt={movie.titleEn} fill unoptimized className="object-cover" />
              </div>
            </Link>
            <div className="p-3">
              <Link href={`/movies/${movie.slug}`} className="block truncate text-sm font-semibold text-white hover:text-red-200">{movie.titleEn}</Link>
              <p className="mt-1 text-xs text-gray-400">{movie.releaseYear} · {movie.genre}</p>
              <button disabled={removing === movie.slug} onClick={() => remove(movie.slug)} className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-red-300 disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" /> {removing === movie.slug ? "Removing..." : "Remove"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">Page {pagination.page} of {pagination.totalPages} · {pagination.totalItems} saved</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || !ready} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-white/15 px-4 py-2 text-xs text-white disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= pagination.totalPages || !ready} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-white/15 px-4 py-2 text-xs text-white disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
