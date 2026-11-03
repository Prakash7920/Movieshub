import Link from "next/link";

export default function WatchPage() {
  return (
    <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">MoviesHub playback</p>
        <h1 className="mt-3 text-3xl font-bold text-white md:text-5xl">Streaming is not available yet</h1>
        <p className="mt-5 max-w-2xl text-gray-300">
          Playback is disabled while MoviesHub completes content-rights verification, territory enforcement, entitlement checks, and secure video delivery integration. No sample or unlicensed video will be played here.
        </p>
        <Link href="/movies" className="mt-8 inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white hover:bg-white/10">
          Browse licensed catalogue
        </Link>
      </div>
    </div>
  );
}
