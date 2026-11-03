import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="page-shell py-12">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 card-glow">
        <Image src="/nexafilm-logo.svg" alt="NexaFilm — One Platform. Every Language. Endless Stories." width={420} height={105} priority className="mb-5 h-auto w-full max-w-[420px]" />
        <h1 className="text-4xl font-bold md:text-6xl">A world of cinema, in every language.</h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-300">
          Discover a premium legal cinema experience spanning Tamil, Telugu, Malayalam, Kannada, Hindi, Bengali, Marathi, and more.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/movies"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-white transition hover:opacity-90"
          >
            Explore the Catalogue
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-transparent px-6 py-3 font-medium text-white transition hover:border-white/20"
          >
            Create Account
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Preview catalogue only. Video playback is disabled until distribution rights are verified.
        </p>
      </section>
    </main>
  );
}
