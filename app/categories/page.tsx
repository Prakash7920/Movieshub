"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Star, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockMovies } from "@/lib/mock-data";

const languageOptions = ["All", "Tamil", "Dubbed"];
const sortOptions = ["Latest", "Most watched", "Highest rated", "Alphabetical"];

export default function MoviesPage() {
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("All");
  const [genre, setGenre] = useState("All");
  const [year, setYear] = useState("All");
  const [rating, setRating] = useState("All");
  const [type, setType] = useState("All");
  const [sort, setSort] = useState("Latest");

  const filteredMovies = useMemo(() => {
    const normalized = mockMovies.filter((movie) => {
      const matchesSearch = `${movie.titleEn} ${movie.titleTa}`.toLowerCase().includes(search.toLowerCase());
      const matchesLanguage = language === "All" || (language === "Tamil" ? movie.language === "ta" : movie.language !== "ta");
      const matchesGenre = genre === "All" || movie.genre === genre;
      const matchesYear = year === "All" || String(movie.releaseYear) === year;
      const matchesRating = rating === "All" || movie.rating >= Number(rating);
      const matchesType = type === "All" || movie.movieType === type;

      return matchesSearch && matchesLanguage && matchesGenre && matchesYear && matchesRating && matchesType;
    });

    return [...normalized].sort((a, b) => {
      switch (sort) {
        case "Most watched":
          return b.watchCount - a.watchCount;
        case "Highest rated":
          return b.rating - a.rating;
        case "Alphabetical":
          return a.titleEn.localeCompare(b.titleEn);
        case "Latest":
        default:
          return b.releaseYear - a.releaseYear;
      }
    });
  }, [search, language, genre, year, rating, type, sort]);

  const genres = ["All", ...Array.from(new Set(mockMovies.map((movie) => movie.genre)))];
  const years = ["All", ...Array.from(new Set(mockMovies.map((movie) => String(movie.releaseYear)))).slice().sort((a, b) => Number(b) - Number(a))];

  return (
    <div className="page-shell pb-16 pt-8">
      <div className="mb-8 rounded-[2rem] border border-white/10 bg-card/60 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-red-200">Browse catalog</p>
            <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Movies</h1>
          </div>
          <div className="flex w-full max-w-xl items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              aria-label="Search movies"
              className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
              placeholder="Search by title or keyword"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-[1.5rem] border border-white/10 bg-card/70 p-5">
          <div className="mb-5 flex items-center gap-2 text-white">
            <SlidersHorizontal className="h-4 w-4 text-red-400" />
            <h2 className="font-semibold">Filters</h2>
          </div>

          <div className="space-y-5">
            <FilterGroup label="Language">
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                {languageOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </FilterGroup>

            <FilterGroup label="Genre">
              <select value={genre} onChange={(event) => setGenre(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                {genres.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </FilterGroup>

            <FilterGroup label="Year">
              <select value={year} onChange={(event) => setYear(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                {years.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </FilterGroup>

            <FilterGroup label="Rating">
              <select value={rating} onChange={(event) => setRating(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                <option value="All">All ratings</option>
                <option value="8">8.0+</option>
                <option value="7">7.0+</option>
                <option value="6">6.0+</option>
              </select>
            </FilterGroup>

            <FilterGroup label="Type">
              <select value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                <option value="All">All</option>
                <option value="FREE">Free</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </FilterGroup>
          </div>
        </aside>

        <main>
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm text-gray-400">{filteredMovies.length} results</p>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
              {sortOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {filteredMovies.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-card/60 p-12 text-center">
              <p className="text-2xl font-semibold text-white">No movies found</p>
              <p className="mt-2 text-gray-400">Try adjusting your filters or using a broader search.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredMovies.map((movie) => (
                <Link key={movie.id} href={`/movies/${movie.slug}`} className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-card/80 transition hover:-translate-y-1 hover:border-red-500/40">
                  <div className="relative h-72 overflow-hidden">
                    <Image src={movie.posterUrl} alt={movie.titleEn} fill className="object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full border border-red-500/50 bg-red-500/15 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-red-200">
                      {movie.movieType}
                    </span>
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="line-clamp-1 text-lg font-semibold text-white">{movie.titleEn}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-300">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {movie.rating}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-gray-400">{movie.descriptionEn}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{movie.genre}</span>
                      <span>{movie.releaseYear}</span>
                      <span>{movie.runtimeMinutes}m</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-400">{label}</span>
      {children}
    </label>
  );
}
