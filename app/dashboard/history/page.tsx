import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WatchHistoryContent } from "@/components/movies/watch-history";

export default function WatchHistoryPage() {
  return (
    <div className="page-shell pb-16 pt-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-red-200">Your library</p>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Watch History</h1>
          <p className="mt-2 text-sm text-gray-400">Your saved history entries, synced to your account.</p>
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>
      <WatchHistoryContent />
      <p className="mt-6 text-xs leading-5 text-gray-500">Preview mode only. No video playback or viewing progress is being tracked. Automatic progress and resume will be connected after licensed streaming is implemented.</p>
    </div>
  );
}
