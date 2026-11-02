import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell py-12">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 card-glow">
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-accent">MoviesHub</p>
        <h1 className="text-4xl font-bold md:text-6xl">Your world of Tamil cinema</h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-300">
          A legal, premium OTT experience with Tamil blockbusters, dubbed favorites, and curated premieres.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/movies/vikram"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-white transition hover:opacity-90"
          >
            View Featured Movie
          </Link>
          <Link
            href="/movies"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-transparent px-6 py-3 font-medium text-white transition hover:border-white/20"
          >
            Browse Movies
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Preview only. Video playback is disabled until distribution rights are verified.
        </p>
      </section>
    </main>
  );
}
