type WatchlistEntry = {
  id: string;
  movieId: string;
  title: string;
  posterUrl: string;
  addedAt: string;
};

type WatchHistoryEntry = {
  id: string;
  movieId: string;
  title: string;
  posterUrl: string;
  progress: number;
  lastWatchedAt: string;
};

export const mockAuthUser = {
  id: "user_123",
  name: "Prakash Kumar",
  email: "prakash@movieshub.local",
  avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  languagePreference: "ta",
  subscriptionStatus: "Premium",
};

export const mockMovies = [
  {
    id: "m1",
    slug: "vikram",
    titleEn: "Vikram",
    titleTa: "விக்ரம்",
    posterUrl: "https://placehold.co/600x900/1f1f1f/ffffff?text=Vikram",
    rating: 8.6,
    movieType: "PREMIUM",
    genre: "Action",
    language: "ta",
  },
  {
    id: "m2",
    slug: "master",
    titleEn: "Master",
    titleTa: "மாஸ்டர்",
    posterUrl: "https://placehold.co/600x900/2a0a0a/f8f8f8?text=Master",
    rating: 8.5,
    movieType: "PREMIUM",
    genre: "Action",
    language: "ta",
  },
  {
    id: "m3",
    slug: "96",
    titleEn: "96",
    titleTa: "96",
    posterUrl: "https://placehold.co/600x900/4a2b1b/fef3c7?text=96",
    rating: 8.8,
    movieType: "PREMIUM",
    genre: "Romance",
    language: "ta",
  },
  {
    id: "m4",
    slug: "aruvi",
    titleEn: "Aruvi",
    titleTa: "அருவி",
    posterUrl: "https://placehold.co/600x900/1f2937/cbd5e1?text=Aruvi",
    rating: 8.3,
    movieType: "FREE",
    genre: "Drama",
    language: "ta",
  },
  {
    id: "m5",
    slug: "dune-part-two",
    titleEn: "Dune: Part Two",
    titleTa: "ட்யூன்: பார்ட் டூ",
    posterUrl: "https://placehold.co/600x900/3c2a22/fbbf24?text=Dune",
    rating: 8.9,
    movieType: "PREMIUM",
    genre: "Sci-Fi",
    language: "en",
  },
];

export const mockWatchlist: WatchlistEntry[] = [
  { id: "w1", movieId: "m1", title: "Vikram", posterUrl: mockMovies[0].posterUrl, addedAt: "2026-10-15" },
  { id: "w2", movieId: "m3", title: "96", posterUrl: mockMovies[2].posterUrl, addedAt: "2026-10-20" },
  { id: "w3", movieId: "m5", title: "Dune: Part Two", posterUrl: mockMovies[4].posterUrl, addedAt: "2026-10-25" },
];

export const mockWatchHistory: WatchHistoryEntry[] = [
  { id: "h1", movieId: "m2", title: "Master", posterUrl: mockMovies[1].posterUrl, progress: 72, lastWatchedAt: "2026-10-27" },
  { id: "h2", movieId: "m4", title: "Aruvi", posterUrl: mockMovies[3].posterUrl, progress: 48, lastWatchedAt: "2026-10-28" },
  { id: "h3", movieId: "m1", title: "Vikram", posterUrl: mockMovies[0].posterUrl, progress: 86, lastWatchedAt: "2026-10-29" },
];
