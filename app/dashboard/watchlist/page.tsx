import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WatchlistContent } from "@/components/movies/watchlist";

export default function WatchlistPage() {
  return (
    <div className="page-shell pb-16 pt-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-red-200">Your library</p>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">My Watchlist</h1>
          <p className="mt-2 text-sm text-gray-400">Movies you save on this device.</p>
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>
      <WatchlistContent />
    </div>
  );
}
