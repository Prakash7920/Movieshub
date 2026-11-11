"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { History, Trash2 } from "lucide-react";

type HistoryItem = {
  id: string;
  progress: number;
  lastWatchedAt: string;
  movie: {
    slug: string;
    titleEn: string;
    titleTa: string;
    posterUrl: string;
    releaseYear: number;
    runtimeMinutes: number;
  };
};

type HistoryPagination = { page: number; pageSize: number; totalItems: number; totalPages: number };

async function requestHistory(method: "GET" | "POST" | "DELETE", body?: { slug: string; progress?: number }, page = 1) {
  const response = await fetch(method === "GET" ? `/api/watch-history?page=${page}&pageSize=20` : "/api/watch-history", {
    method,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Watch history request failed.");
  return data;
}

export function AddHistoryPreview({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function addPreview() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await requestHistory("POST", { slug, progress: 0 });
      setMessage("Preview entry saved. No video was played.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save preview entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={addPreview} disabled={busy} className="rounded-full border border-white/15 px-4 py-2 text-sm text-gray-200 hover:border-red-400 disabled:opacity-50">
        <History className="mr-2 inline h-4 w-4" />{busy ? "Saving..." : "Add history preview"}
      </button>
      <p className="mt-2 text-xs text-gray-400">Testing only: records a 0% history entry; it does not start playback.</p>
      {message && <p role="status" className="mt-2 text-xs text-green-300">{message}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function WatchHistoryContent() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<HistoryPagination>({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });

  useEffect(() => {
    let active = true;
    setReady(false);
    requestHistory("GET", undefined, page)
      .then((data) => {
        if (active) {
          setItems(data.items as HistoryItem[]);
          setPagination(data.pagination as HistoryPagination);
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
      await requestHistory("DELETE", { slug });
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else {
        setItems((current) => current.filter((item) => item.movie.slug !== slug));
        setPagination((current) => ({ ...current, totalItems: Math.max(0, current.totalItems - 1) }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove history entry.");
    } finally {
      setRemoving("");
    }
  }

  if (!ready) return <p className="py-12 text-center text-sm text-gray-400">Loading your watch history...</p>;
  if (error && items.length === 0) return <p role="alert" className="py-10 text-center text-sm text-red-300">{error}</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-5 py-14 text-center">
        <History className="mx-auto h-8 w-8 text-gray-500" />
        <h2 className="mt-3 text-lg font-semibold text-white">No watch history yet</h2>
        <p className="mt-1 text-sm text-gray-400">Use “Add history preview” on a movie page to test this feature.</p>
        <Link href="/movies" className="mt-5 inline-flex rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500">Browse movies</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {items.map((entry) => (
        <article key={entry.id} className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-card/70 p-4 sm:flex-row sm:items-center">
          <Link href={`/movies/${entry.movie.slug}`} className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl">
            <Image src={entry.movie.posterUrl} alt={entry.movie.titleEn} fill unoptimized className="object-cover" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/movies/${entry.movie.slug}`} className="font-semibold text-white hover:text-red-200">{entry.movie.titleEn}</Link>
            <p className="mt-1 text-xs text-gray-400">{entry.movie.titleTa} · {entry.movie.releaseYear}</p>
            <p className="mt-2 text-xs text-gray-400">Preview history · {new Date(entry.lastWatchedAt).toLocaleString()}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${entry.progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">{entry.progress}% recorded · Playback is not enabled</p>
          </div>
          <button type="button" disabled={removing === entry.movie.slug} onClick={() => remove(entry.movie.slug)} className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 px-4 py-2 text-xs text-gray-300 hover:border-red-400 hover:text-red-200 disabled:opacity-50">
            <Trash2 className="h-4 w-4" />{removing === entry.movie.slug ? "Removing..." : "Remove"}
          </button>
        </article>
      ))}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">Page {pagination.page} of {pagination.totalPages} · {pagination.totalItems} entries</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || !ready} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-white/15 px-4 py-2 text-xs text-white disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= pagination.totalPages || !ready} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-white/15 px-4 py-2 text-xs text-white disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
