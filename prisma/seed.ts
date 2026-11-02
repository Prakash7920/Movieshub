import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Tamil", slug: "tamil" },
  { name: "Dubbed", slug: "dubbed" },
  { name: "Action", slug: "action" },
  { name: "Comedy", slug: "comedy" },
  { name: "Romance", slug: "romance" },
  { name: "Thriller", slug: "thriller" },
  { name: "Drama", slug: "drama" },
  { name: "Family", slug: "family" },
  { name: "Horror", slug: "horror" },
  { name: "Crime", slug: "crime" },
  { name: "Kids", slug: "kids" },
  { name: "Documentary", slug: "documentary" },
];

const genres = [
  { name: "Action", slug: "action" },
  { name: "Comedy", slug: "comedy" },
  { name: "Drama", slug: "drama" },
  { name: "Romance", slug: "romance" },
  { name: "Thriller", slug: "thriller" },
  { name: "Crime", slug: "crime" },
  { name: "Family", slug: "family" },
  { name: "Horror", slug: "horror" },
  { name: "Adventure", slug: "adventure" },
  { name: "Sci-Fi", slug: "sci-fi" },
  { name: "Historical", slug: "historical" },
  { name: "Documentary", slug: "documentary" },
];

const baseMovies = [
  {
    titleEn: "Vikram",
    titleTa: "விக்ரம்",
    slug: "vikram",
    descriptionEn: "An undercover officer and a fearless gangster collide in a tense cat-and-mouse chase across the city.",
    descriptionTa: "சமூகத்தின் இருண்ட பக்கங்களை சந்திக்கும் ஒரு ரகசிய அதிகாரியும், அச்சமற்ற ஒரு குற்றவாளியும் நகரம் முழுவதும் சண்டையிடும் சஸ்பென்ஸ் கதை.",
    posterUrl: "https://placehold.co/600x900/1f1f1f/ffffff?text=Vikram",
    backdropUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    language: "ta",
    audioLanguages: ["Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2022,
    runtimeMinutes: 165,
    ageRating: "UA 13+",
    rating: 8.6,
    movieType: "PREMIUM",
    isFeatured: true,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN", "US", "SG"],
    downloadPermission: false,
    licenseOwner: "Demo Studio",
    licenseStartDate: new Date("2024-01-01T00:00:00.000Z"),
    licenseExpiryDate: new Date("2026-12-31T00:00:00.000Z"),
    categories: ["tamil", "action"],
    genres: ["action", "thriller"],
  },
  {
    titleEn: "Master",
    titleTa: "மாஸ்டர்",
    slug: "master",
    descriptionEn: "A ruthless teacher takes on a criminal empire while a young prodigy finds his path in a brutal world.",
    descriptionTa: "கொடூரமான ஒரு ஆசிரியர் ஒரு குற்ற வலையமைப்புடன் மோதும் போது, ஒரு இளம் திறமையாளர் தனது பாதையை கண்டுபிடிக்கிறார்.",
    posterUrl: "https://placehold.co/600x900/2a0a0a/f8f8f8?text=Master",
    backdropUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/movie.mp4",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    language: "ta",
    audioLanguages: ["Tamil", "English"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2021,
    runtimeMinutes: 178,
    ageRating: "UA",
    rating: 8.4,
    movieType: "PREMIUM",
    isFeatured: true,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN", "MY", "SG"],
    downloadPermission: false,
    licenseOwner: "Movie Rights Ltd",
    licenseStartDate: new Date("2023-06-01T00:00:00.000Z"),
    licenseExpiryDate: new Date("2026-11-30T00:00:00.000Z"),
    categories: ["tamil", "action", "drama"],
    genres: ["action", "drama"],
  },
  {
    titleEn: "96",
    titleTa: "96",
    slug: "96",
    descriptionEn: "A nostalgic reunion unfolds as two people revisit the memories that shaped their lives.",
    descriptionTa: "இருவரும் தங்களின் கடந்த கால நினைவுகளை மீண்டும் சந்தித்து, வாழ்க்கையை வடிவமைத்த தருணங்களை நினைவு கூர்கின்றனர்.",
    posterUrl: "https://placehold.co/600x900/4a2b1b/fef3c7?text=96",
    backdropUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    language: "ta",
    audioLanguages: ["Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2018,
    runtimeMinutes: 158,
    ageRating: "U",
    rating: 8.8,
    movieType: "PREMIUM",
    isFeatured: false,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN"],
    downloadPermission: true,
    licenseOwner: "Ariya Media",
    licenseStartDate: new Date("2023-01-01T00:00:00.000Z"),
    licenseExpiryDate: new Date("2027-01-15T00:00:00.000Z"),
    categories: ["tamil", "romance"],
    genres: ["romance", "drama"],
  },
  {
    titleEn: "Ponniyin Selvan: I",
    titleTa: "பொன்னியின் செல்வன்: I",
    slug: "ponniyin-selvan-i",
    descriptionEn: "The Chola kingdom trembles with intrigue, ambition, and a battle for succession.",
    descriptionTa: "சோழ அரசியல், பேராசை மற்றும் வாரிசு சண்டை எல்லாம் ஒரே காட்சியில் மோதும் காவியமான கதை.",
    posterUrl: "https://placehold.co/600x900/4e3f2d/f1c40f?text=Ponniyin+Selvan",
    backdropUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/movie.mp4",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    language: "ta",
    audioLanguages: ["Tamil", "English"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2022,
    runtimeMinutes: 167,
    ageRating: "UA 13+",
    rating: 8.5,
    movieType: "PREMIUM",
    isFeatured: true,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN", "US", "AU"],
    downloadPermission: false,
    licenseOwner: "Royal Frame Films",
    licenseStartDate: new Date("2024-02-01T00:00:00.000Z"),
    licenseExpiryDate: new Date("2027-02-28T00:00:00.000Z"),
    categories: ["tamil", "action", "drama"],
    genres: ["historical", "action", "drama"],
  },
  {
    titleEn: "Theeran Adhigaram Ondru",
    titleTa: "தீரன் அதிகாரம் ஒன்று",
    slug: "theeran-adhigaram-ondru",
    descriptionEn: "A determined officer chases a dangerous criminal gang through a relentless pursuit of justice.",
    descriptionTa: "ஒரு உறுதியான அதிகாரி, அச்சுறுத்தும் குற்றவாளிகள் கூட்டத்தை துரத்தும் நீண்ட நீதிக்கான பயணம்.",
    posterUrl: "https://placehold.co/600x900/1f2937/e5e7eb?text=Theeran",
    backdropUrl: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    language: "ta",
    audioLanguages: ["Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2017,
    runtimeMinutes: 157,
    ageRating: "UA",
    rating: 8.2,
    movieType: "PREMIUM",
    isFeatured: false,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN"],
    downloadPermission: false,
    licenseOwner: "Studio Vigil",
    licenseStartDate: new Date("2023-04-01T00:00:00.000Z"),
    licenseExpiryDate: new Date("2028-04-01T00:00:00.000Z"),
    categories: ["tamil", "thriller"],
    genres: ["thriller", "crime"],
  },
  {
    titleEn: "Soorarai Pottru",
    titleTa: "சூரரைப் போற்று",
    slug: "soorarai-pottru",
    descriptionEn: "A dreamer fights adversity to reshape the future of aviation and prove his worth in a nation in transition.",
    descriptionTa: "ஒரு கனவு காண்பவர், விமானத்துறையின் எதிர்காலத்தை மாற்றுவதற்காக போராடுகிறார்.",
    posterUrl: "https://placehold.co/600x900/7a1d1d/fce7f3?text=Soorarai",
    backdropUrl: "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/movie.mp4",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    language: "ta",
    audioLanguages: ["Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2020,
    runtimeMinutes: 153,
    ageRating: "UA",
    rating: 8.7,
    movieType: "PREMIUM",
    isFeatured: false,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN", "US"],
    downloadPermission: false,
    licenseOwner: "Bluebird Films",
    licenseStartDate: new Date("2023-03-01T00:00:00.000Z"),
    licenseExpiryDate: new Date("2027-03-31T00:00:00.000Z"),
    categories: ["tamil", "drama"],
    genres: ["drama", "family"],
  },
  {
    titleEn: "Sarkar",
    titleTa: "சர்கார்",
    slug: "sarkar",
    descriptionEn: "An idealistic man fights a powerful political machine in one of the most explosive battles of his life.",
    descriptionTa: "ஒரு சுதந்திரமான மனம், வலிமையான அரசியல் இயந்திரத்தை எதிர்த்து போராடுகிறார்.",
    posterUrl: "https://placehold.co/600x900/202124/c7d2fe?text=Sarkar",
    backdropUrl: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    language: "ta",
    audioLanguages: ["Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2018,
    runtimeMinutes: 163,
    ageRating: "UA",
    rating: 7.9,
    movieType: "PREMIUM",
    isFeatured: false,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN", "SG"],
    downloadPermission: false,
    licenseOwner: "Redline Pictures",
    licenseStartDate: new Date("2022-10-01T00:00:00.000Z"),
    licenseExpiryDate: new Date("2026-10-20T00:00:00.000Z"),
    categories: ["tamil", "action", "drama"],
    genres: ["action", "drama"],
  },
  {
    titleEn: "Kabali",
    titleTa: "கபாலி",
    slug: "kabali",
    descriptionEn: "A feared gangster returns home with unfinished business and an iron will that refuses to die.",
    descriptionTa: "ஒரு பயங்கரமான குற்றவாளி தனது வீட்டிற்கு திரும்பி, முடிக்கப்படாத கடமையை நிறைவேற்றுவதற்காக போராடுகிறார்.",
    posterUrl: "https://placehold.co/600x900/0f172a/fca5a5?text=Kabali",
    backdropUrl: "https://images.unsplash.com/photo-1524989948546-a1d8f6d9db88?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/movie.mp4",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    language: "ta",
    audioLanguages: ["Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2016,
    runtimeMinutes: 153,
    ageRating: "UA",
    rating: 7.8,
    movieType: "PREMIUM",
    isFeatured: false,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN", "AU"],
    downloadPermission: false,
    licenseOwner: "Velvette Media",
    licenseStartDate: new Date("2022-08-01T00:00:00.000Z"),
    licenseExpiryDate: new Date("2026-09-05T00:00:00.000Z"),
    categories: ["tamil", "crime"],
    genres: ["crime", "action"],
  },
  {
    titleEn: "Jailer",
    titleTa: "ஜெயிலர்",
    slug: "jailer",
    descriptionEn: "A retired jailer steps back into a ruthless world to protect his family and reclaim his peace.",
    descriptionTa: "ஒரு ஓய்வு பெற்ற சிறை அதிகாரி, தனது குடும்பத்தை காப்பாற்றுவதற்காக பழைய உலகிற்கு திரும்புகிறார்.",
    posterUrl: "https://placehold.co/600x900/3b1d1d/fef2f2?text=Jailer",
    backdropUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    language: "ta",
    audioLanguages: ["Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2023,
    runtimeMinutes: 170,
    ageRating: "UA",
    rating: 8.3,
    movieType: "PREMIUM",
    isFeatured: true,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN", "US", "MY"],
    downloadPermission: false,
    licenseOwner: "Silver Screen Rights",
    licenseStartDate: new Date("2024-01-15T00:00:00.000Z"),
    licenseExpiryDate: new Date("2027-06-15T00:00:00.000Z"),
    categories: ["tamil", "action", "drama"],
    genres: ["action", "drama"],
  },
  {
    titleEn: "Mersal",
    titleTa: "மெர்சல்",
    slug: "mersal",
    descriptionEn: "A doctor and a social activist transform a quiet town with courage, chaos, and conviction.",
    descriptionTa: "ஒரு மருத்துவர் மற்றும் சமூக ஆர்வலர், துணிச்சலுடன் ஒரு அமைதியான நகரத்தை மாற்றி நிறுத்துகிறார்கள்.",
    posterUrl: "https://placehold.co/600x900/1e293b/fef08a?text=Mersal",
    backdropUrl: "https://images.unsplash.com/photo-1460881680858-30d872d5b530?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/movie.mp4",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    language: "ta",
    audioLanguages: ["Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2017,
    runtimeMinutes: 159,
    ageRating: "UA",
    rating: 7.7,
    movieType: "PREMIUM",
    isFeatured: false,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN"],
    downloadPermission: false,
    licenseOwner: "Red Lantern Studios",
    licenseStartDate: new Date("2022-12-01T00:00:00.000Z"),
    licenseExpiryDate: new Date("2026-12-15T00:00:00.000Z"),
    categories: ["tamil", "action"],
    genres: ["action", "drama"],
  },
  {
    titleEn: "Avatar: The Way of Water",
    titleTa: "அவதார்: தி வே ஆஃப் வாட்டர்",
    slug: "avatar-the-way-of-water",
    descriptionEn: "A family journeys into a breathtaking marine world facing danger and discovery beyond imagination.",
    descriptionTa: "ஒரு குடும்பம் அற்புதமான கடல் உலகில் பயணித்து, ஆபத்தையும் புதுமையும் சந்திக்கிறது.",
    posterUrl: "https://placehold.co/600x900/0f172a/93c5fd?text=Avatar",
    backdropUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bdd6c5?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    language: "en",
    audioLanguages: ["English", "Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2022,
    runtimeMinutes: 192,
    ageRating: "PG-13",
    rating: 8.1,
    movieType: "PREMIUM",
    isFeatured: true,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["US", "IN", "AU"],
    downloadPermission: false,
    licenseOwner: "Global Cinema Rights",
    licenseStartDate: new Date("2024-03-05T00:00:00.000Z"),
    licenseExpiryDate: new Date("2027-03-05T00:00:00.000Z"),
    categories: ["dubbed", "family", "action"],
    genres: ["adventure", "sci-fi", "family"],
  },
  {
    titleEn: "Dune: Part Two",
    titleTa: "ட்யூன்: பார்ட் டூ",
    slug: "dune-part-two",
    descriptionEn: "An epic journey across the desert unfolds with power, prophecy, and a struggle for control.",
    descriptionTa: "மலைகள், வானம், சத்தம், மற்றும் ஆற்றல் எல்லாம் ஒன்றாக கலந்த ஒரு பெரும் சாகசம்.",
    posterUrl: "https://placehold.co/600x900/3c2a22/fbbf24?text=Dune",
    backdropUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/movie.mp4",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    language: "en",
    audioLanguages: ["English", "Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2024,
    runtimeMinutes: 166,
    ageRating: "PG-13",
    rating: 8.9,
    movieType: "PREMIUM",
    isFeatured: true,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["US", "IN"],
    downloadPermission: false,
    licenseOwner: "Epic Studio Distribution",
    licenseStartDate: new Date("2024-05-01T00:00:00.000Z"),
    licenseExpiryDate: new Date("2028-05-01T00:00:00.000Z"),
    categories: ["dubbed", "action"],
    genres: ["sci-fi", "adventure"],
  },
  {
    titleEn: "Aruvi",
    titleTa: "அருவி",
    slug: "aruvi",
    descriptionEn: "A young man embarks on an uplifting road journey seeking freedom and a better life.",
    descriptionTa: "ஒரு இளைஞன் சுதந்திரம் மற்றும் நல்ல வாழ்க்கையை தேடி பயணமாக செல்கிறான்.",
    posterUrl: "https://placehold.co/600x900/1f2937/cbd5e1?text=Aruvi",
    backdropUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    language: "ta",
    audioLanguages: ["Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2017,
    runtimeMinutes: 130,
    ageRating: "U",
    rating: 8.3,
    movieType: "FREE",
    isFeatured: false,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN"],
    downloadPermission: false,
    licenseOwner: "Demo Free Catalog",
    licenseStartDate: new Date("2023-01-10T00:00:00.000Z"),
    licenseExpiryDate: new Date("2027-01-10T00:00:00.000Z"),
    categories: ["tamil", "drama"],
    genres: ["drama", "family"],
  },
  {
    titleEn: "Maamannan",
    titleTa: "மாமன்னன்",
    slug: "maamannan",
    descriptionEn: "A powerful tale of caste, courage, and justice in a changing society.",
    descriptionTa: "சமூக மாற்றத்தில், நீதியின் தேடலில், தைரியத்துடன் நடந்துவரும் கதை.",
    posterUrl: "https://placehold.co/600x900/2b1d12/fcd34d?text=Maamannan",
    backdropUrl: "https://images.unsplash.com/photo-1523705498753-d0d3c4f0f865?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.w3schools.com/html/movie.mp4",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    language: "ta",
    audioLanguages: ["Tamil"],
    subtitleLanguages: ["Tamil", "English"],
    releaseYear: 2023,
    runtimeMinutes: 171,
    ageRating: "UA",
    rating: 8.0,
    movieType: "PREMIUM",
    isFeatured: false,
    isPublished: true,
    contentStatus: "PUBLISHED",
    allowedCountries: ["IN"],
    downloadPermission: false,
    licenseOwner: "Lighthouse District",
    licenseStartDate: new Date("2024-04-01T00:00:00.000Z"),
    licenseExpiryDate: new Date("2028-04-01T00:00:00.000Z"),
    categories: ["tamil", "drama"],
    genres: ["drama", "thriller"],
  },
];

async function ensureCategoryMap() {
  const recordMap = new Map<string, { id: string }>();

  for (const item of categories) {
    const existing = await prisma.category.upsert({
      where: { slug: item.slug },
      update: { name: item.name },
      create: { name: item.name, slug: item.slug },
    });
    recordMap.set(item.slug, existing);
  }

  return recordMap;
}

async function ensureGenreMap() {
  const recordMap = new Map<string, { id: string }>();

  for (const item of genres) {
    const existing = await prisma.genre.upsert({
      where: { slug: item.slug },
      update: { name: item.name },
      create: { name: item.name, slug: item.slug },
    });
    recordMap.set(item.slug, existing);
  }

  return recordMap;
}

async function seedMovies(categoryMap: Map<string, { id: string }>, genreMap: Map<string, { id: string }>) {
  for (const movie of baseMovies) {
    const created = await prisma.movie.upsert({
      where: { slug: movie.slug },
      update: {
        titleEn: movie.titleEn,
        titleTa: movie.titleTa,
        descriptionEn: movie.descriptionEn,
        descriptionTa: movie.descriptionTa,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        trailerUrl: movie.trailerUrl,
        videoUrl: movie.videoUrl,
        language: movie.language,
        audioLanguages: movie.audioLanguages,
        subtitleLanguages: movie.subtitleLanguages,
        releaseYear: movie.releaseYear,
        runtimeMinutes: movie.runtimeMinutes,
        ageRating: movie.ageRating,
        rating: movie.rating,
        movieType: movie.movieType as any,
        isFeatured: movie.isFeatured,
        isPublished: movie.isPublished,
        contentStatus: movie.contentStatus as any,
        allowedCountries: movie.allowedCountries,
        downloadPermission: movie.downloadPermission,
        licenseOwner: movie.licenseOwner,
        licenseStartDate: movie.licenseStartDate,
        licenseExpiryDate: movie.licenseExpiryDate,
      },
      create: {
        titleEn: movie.titleEn,
        titleTa: movie.titleTa,
        slug: movie.slug,
        descriptionEn: movie.descriptionEn,
        descriptionTa: movie.descriptionTa,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        trailerUrl: movie.trailerUrl,
        videoUrl: movie.videoUrl,
        language: movie.language,
        audioLanguages: movie.audioLanguages,
        subtitleLanguages: movie.subtitleLanguages,
        releaseYear: movie.releaseYear,
        runtimeMinutes: movie.runtimeMinutes,
        ageRating: movie.ageRating,
        rating: movie.rating,
        movieType: movie.movieType as any,
        isFeatured: movie.isFeatured,
        isPublished: movie.isPublished,
        contentStatus: movie.contentStatus as any,
        allowedCountries: movie.allowedCountries,
        downloadPermission: movie.downloadPermission,
        licenseOwner: movie.licenseOwner,
        licenseStartDate: movie.licenseStartDate,
        licenseExpiryDate: movie.licenseExpiryDate,
      },
    });

    await prisma.movieCategory.deleteMany({ where: { movieId: created.id } });
    await prisma.movieGenre.deleteMany({ where: { movieId: created.id } });

    for (const categorySlug of movie.categories) {
      const category = categoryMap.get(categorySlug);
      if (!category) continue;

      await prisma.movieCategory.upsert({
        where: {
          movieId_categoryId: {
            movieId: created.id,
            categoryId: category.id,
          },
        },
        update: {},
        create: {
          movieId: created.id,
          categoryId: category.id,
        },
      });
    }

    for (const genreSlug of movie.genres) {
      const genre = genreMap.get(genreSlug);
      if (!genre) continue;

      await prisma.movieGenre.upsert({
        where: {
          movieId_genreId: {
            movieId: created.id,
            genreId: genre.id,
          },
        },
        update: {},
        create: {
          movieId: created.id,
          genreId: genre.id,
        },
      });
    }

    await prisma.license.upsert({
      where: { movieId: created.id },
      update: {
        owner: movie.licenseOwner ?? "Demo Studio",
        startDate: movie.licenseStartDate ?? new Date(),
        expiryDate: movie.licenseExpiryDate ?? new Date(),
        allowedCountries: movie.allowedCountries,
        downloadAllowed: movie.downloadPermission,
        status: movie.licenseExpiryDate && movie.licenseExpiryDate < new Date() ? "EXPIRED" : "ACTIVE",
      },
      create: {
        movieId: created.id,
        owner: movie.licenseOwner ?? "Demo Studio",
        startDate: movie.licenseStartDate ?? new Date(),
        expiryDate: movie.licenseExpiryDate ?? new Date(),
        allowedCountries: movie.allowedCountries,
        downloadAllowed: movie.downloadPermission,
        status: movie.licenseExpiryDate && movie.licenseExpiryDate < new Date() ? "EXPIRED" : "ACTIVE",
      },
    });
  }
}

async function seedUsers() {
  const adminEmail = "admin@movieshub.local";
  const adminPasswordHash = "$2a$12$kYw0mPJl7XQ4K6YAP7lT/uKX3u7K4Q666qQCljnGByD9eV2/8qW2O";

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "MoviesHub Admin",
      username: "admin",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
      provider: "CREDENTIALS",
      isEmailVerified: true,
    },
    create: {
      email: adminEmail,
      name: "MoviesHub Admin",
      username: "admin",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
      provider: "CREDENTIALS",
      isEmailVerified: true,
    },
  });

  await prisma.adminUser.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id },
  });

  const normalUser = await prisma.user.upsert({
    where: { email: "viewer@movieshub.local" },
    update: {
      name: "Tamil Viewer",
      username: "tamilviewer",
      role: "USER",
      isEmailVerified: true,
    },
    create: {
      email: "viewer@movieshub.local",
      name: "Tamil Viewer",
      username: "tamilviewer",
      role: "USER",
      isEmailVerified: true,
    },
  });

  await prisma.profile.upsert({
    where: { id: `${normalUser.id}-profile` },
    update: { displayName: "Tamil Viewer", languagePreference: "ta" },
    create: {
      id: `${normalUser.id}-profile`,
      userId: normalUser.id,
      displayName: "Tamil Viewer",
      languagePreference: "ta",
      themePreference: "dark",
    },
  });

  const premiumUser = await prisma.user.upsert({
    where: { email: "premium@movieshub.local" },
    update: {
      name: "Premium Watcher",
      username: "premiumwatcher",
      role: "USER",
      isEmailVerified: true,
    },
    create: {
      email: "premium@movieshub.local",
      name: "Premium Watcher",
      username: "premiumwatcher",
      role: "USER",
      isEmailVerified: true,
    },
  });

  await prisma.subscription.upsert({
    where: { id: `${premiumUser.id}-subscription` },
    update: {
      plan: "PREMIUM",
      billingCycle: "MONTHLY",
      status: "ACTIVE",
      price: 299,
      isAutoRenew: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    create: {
      id: `${premiumUser.id}-subscription`,
      userId: premiumUser.id,
      plan: "PREMIUM",
      billingCycle: "MONTHLY",
      status: "ACTIVE",
      price: 299,
      isAutoRenew: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });
}

async function seedAds() {
  const ads: Prisma.AdvertisementCreateInput[] = [
    {
      title: "Premium Tamil Cinema",
      type: "BANNER",
      mediaUrl: "https://placehold.co/1200x300/8b1e3f/f5e9f5?text=MoviesHub+Premium",
      redirectUrl: "/subscription",
      isActive: true,
    },
    {
      title: "Weekly Blockbuster",
      type: "VIDEO",
      mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      redirectUrl: "/movies",
      isActive: true,
    },
    {
      title: "Weekend Deals",
      type: "POPUP",
      content: "Upgrade to premium and enjoy ad-free streaming.",
      redirectUrl: "/subscription",
      isActive: true,
    },
  ];

  for (const ad of ads) {
    await prisma.advertisement.create({
      data: ad,
    }).catch(() => undefined);
  }
}

async function main() {
  const categoryMap = await ensureCategoryMap();
  const genreMap = await ensureGenreMap();
  await seedUsers();
  await seedMovies(categoryMap, genreMap);
  await seedAds();
  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
