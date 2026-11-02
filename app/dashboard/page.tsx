import Link from "next/link";
import { ArrowRight, Bookmark, Film, History, Settings2 } from "lucide-react";
import { WatchlistContent } from "@/components/movies/watchlist";

export default function DashboardPage() {
  return (
    <div className="page-shell pb-16 pt-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-red-200">MoviesHub preview</p>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">My Dashboard</h1>
          <p className="mt-2 text-sm text-gray-400">Your movie library on this device.</p>
        </div>
        <Link href="/movies" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500">
          Explore movies <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard href="/dashboard/watchlist" icon={<Bookmark className="h-5 w-5" />} title="My Watchlist" description="View and manage the movies you saved." />
        <DashboardCard href="/dashboard/history" icon={<History className="h-5 w-5" />} title="Watch History" description="Playback history will be available after streaming is enabled." />
        <DashboardCard href="/dashboard/settings" icon={<Settings2 className="h-5 w-5" />} title="Settings" description="Account settings are a preview in this static version." />
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Saved movies</h2>
            <p className="mt-1 text-sm text-gray-400">Your current watchlist from this browser.</p>
          </div>
          <Link href="/dashboard/watchlist" className="text-sm font-medium text-red-300 hover:text-red-200">Manage watchlist →</Link>
        </div>
        <WatchlistContent />
      </section>

      <p className="mt-6 text-xs leading-5 text-gray-500">
        This is a local prototype. Watchlist data is stored only in this browser and is not synced to an account. Sign-in, subscriptions, and playback require a secure backend and verified content rights.
      </p>
    </div>
  );
}

function DashboardCard({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-red-500/40 hover:bg-white/[0.07]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-200">{icon}</div>
      <h2 className="font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
    </Link>
  );
}
