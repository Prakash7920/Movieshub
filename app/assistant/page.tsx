import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function RecommendationAssistantPage() {
  return (
    <section className="page-shell py-16">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <Sparkles className="h-8 w-8 text-red-300" />
        <h1 className="mt-4 text-3xl font-bold text-white">MoviesHub AI Picks</h1>
        <p className="mt-3 max-w-2xl text-gray-300">
          Personal recommendations will be available when the secure MoviesHub backend is connected.
          This static preview does not access accounts, watch history, or a database.
        </p>
        <Link href="/movies/" className="mt-6 inline-flex rounded-full bg-red-600 px-5 py-3 text-white">Browse sample movies</Link>
      </div>
    </section>
  );
}
