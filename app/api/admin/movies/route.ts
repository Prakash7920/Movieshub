import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma, ContentStatus, MovieType } from "@prisma/client";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!sessionUser?.id) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { role: true, isBanned: true } });
  if (!user || user.isBanned || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { userId: sessionUser.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const [movies, genres] = await Promise.all([
      prisma.movie.findMany({
        orderBy: { updatedAt: "desc" },
        select: { id: true, slug: true, titleEn: true, titleTa: true, language: true, releaseYear: true, isPublished: true, contentStatus: true, movieType: true, posterUrl: true, genres: { select: { genre: { select: { name: true } } } } },
      }),
      prisma.genre.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    ]);
    return NextResponse.json({ movies: movies.map(m => ({ ...m, genre: m.genres.map(g => g.genre.name).join(", ") })), genres });
  } catch (error) {
    console.error("Admin catalogue read failed:", error);
    return NextResponse.json({ error: "Unable to load admin catalogue." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid movie data." }, { status: 400 });
    const b = body as Record<string, unknown>;
    const fields = ["titleEn","titleTa","slug","descriptionEn","descriptionTa","posterUrl","backdropUrl","language","ageRating"];
    for (const field of fields) if (typeof b[field] !== "string" || !(b[field] as string).trim()) return NextResponse.json({ error: field + " is required." }, { status: 400 });
    const slug = (b.slug as string).trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return NextResponse.json({ error: "Slug must use lowercase letters, numbers and hyphens." }, { status: 400 });
    const releaseYear = Number(b.releaseYear), runtimeMinutes = Number(b.runtimeMinutes), rating = Number(b.rating ?? 0);
    if (!Number.isInteger(releaseYear) || releaseYear < 1888 || releaseYear > new Date().getFullYear() + 5) return NextResponse.json({ error: "Enter a valid release year." }, { status: 400 });
    if (!Number.isInteger(runtimeMinutes) || runtimeMinutes < 1 || runtimeMinutes > 1000) return NextResponse.json({ error: "Runtime must be between 1 and 1000 minutes." }, { status: 400 });
    if (!Number.isFinite(rating) || rating < 0 || rating > 10) return NextResponse.json({ error: "Rating must be between 0 and 10." }, { status: 400 });
    const language = (b.language as string).trim().toLowerCase();
    if (!/^[a-z]{2,3}$/.test(language)) return NextResponse.json({ error: "Use a valid language code such as ta, te, ml, kn, hi or en." }, { status: 400 });
    const genreName = typeof b.genre === "string" ? b.genre.trim().slice(0, 60) : "";
    if (!genreName) return NextResponse.json({ error: "Genre is required." }, { status: 400 });
    const movie = await prisma.movie.create({
      data: {
        titleEn: (b.titleEn as string).trim().slice(0, 160), titleTa: (b.titleTa as string).trim().slice(0, 160), slug,
        descriptionEn: (b.descriptionEn as string).trim().slice(0, 5000), descriptionTa: (b.descriptionTa as string).trim().slice(0, 5000),
        posterUrl: (b.posterUrl as string).trim().slice(0, 2000), backdropUrl: (b.backdropUrl as string).trim().slice(0, 2000),
        language, audioLanguages: Array.isArray(b.audioLanguages) ? b.audioLanguages.filter((x): x is string => typeof x === "string").slice(0, 20) : [language],
        subtitleLanguages: Array.isArray(b.subtitleLanguages) ? b.subtitleLanguages.filter((x): x is string => typeof x === "string").slice(0, 20) : [],
        releaseYear, runtimeMinutes, ageRating: (b.ageRating as string).trim().slice(0, 20), rating,
        movieType: b.movieType === "FREE" ? MovieType.FREE : MovieType.PREMIUM,
        isFeatured: b.isFeatured === true, isPublished: false, contentStatus: ContentStatus.DRAFT,
        allowedCountries: Array.isArray(b.allowedCountries) ? b.allowedCountries.filter((x): x is string => typeof x === "string").slice(0, 30) : [],
        trailerUrl: null, videoUrl: null, downloadPermission: false,
        genres: { create: { genre: { connectOrCreate: { where: { slug: genreName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }, create: { name: genreName, slug: genreName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } } } } },
      },
      select: { id: true, slug: true, titleEn: true },
    });
    return NextResponse.json({ message: "Movie saved as draft. Publish it after reviewing metadata and rights.", movie }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "That movie slug already exists." }, { status: 409 });
    console.error("Admin movie create failed:", error);
    return NextResponse.json({ error: "Unable to create movie." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid update." }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.id !== "string" || typeof b.publish !== "boolean") return NextResponse.json({ error: "Movie id and publish status are required." }, { status: 400 });
    const existing = await prisma.movie.findUnique({ where: { id: b.id }, select: { id: true, license: { select: { status: true, startDate: true, expiryDate: true, allowedCountries: true } } } });
    if (!existing) return NextResponse.json({ error: "Movie not found." }, { status: 404 });
    if (b.publish) {
      const license = existing.license;
      const now = new Date();
      if (!license || license.status !== "ACTIVE" || license.startDate > now || license.expiryDate <= now || license.allowedCountries.length === 0) {
        return NextResponse.json({ error: "Cannot publish: a current ACTIVE licence with valid dates and permitted territories must be recorded first." }, { status: 409 });
      }
    }
    const updated = await prisma.movie.update({ where: { id: b.id }, data: { isPublished: b.publish, contentStatus: b.publish ? ContentStatus.PUBLISHED : ContentStatus.UNPUBLISHED }, select: { id: true, isPublished: true, contentStatus: true } });
    return NextResponse.json({ message: b.publish ? "Movie published." : "Movie unpublished.", movie: updated });
  } catch (error) {
    console.error("Admin movie update failed:", error);
    return NextResponse.json({ error: "Unable to update movie." }, { status: 500 });
  }
}


export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid movie data." }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.id !== "string") return NextResponse.json({ error: "Movie id is required." }, { status: 400 });
    const existing = await prisma.movie.findUnique({ where: { id: b.id }, select: { id: true, isPublished: true, contentStatus: true } });
    if (!existing) return NextResponse.json({ error: "Movie not found." }, { status: 404 });
    if (existing.isPublished || existing.contentStatus !== ContentStatus.DRAFT) {
      return NextResponse.json({ error: "Only unpublished draft movies can be edited." }, { status: 409 });
    }
    const required = ["titleEn","titleTa","slug","descriptionEn","descriptionTa","language","ageRating","genre"];
    for (const field of required) if (typeof b[field] !== "string" || !(b[field] as string).trim()) return NextResponse.json({ error: field + " is required." }, { status: 400 });
    const slug = (b.slug as string).trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return NextResponse.json({ error: "Slug must use lowercase letters, numbers and hyphens." }, { status: 400 });
    const releaseYear = Number(b.releaseYear), runtimeMinutes = Number(b.runtimeMinutes), rating = Number(b.rating ?? 0);
    if (!Number.isInteger(releaseYear) || releaseYear < 1888 || releaseYear > new Date().getFullYear() + 5) return NextResponse.json({ error: "Enter a valid release year." }, { status: 400 });
    if (!Number.isInteger(runtimeMinutes) || runtimeMinutes < 1 || runtimeMinutes > 1000) return NextResponse.json({ error: "Runtime must be between 1 and 1000 minutes." }, { status: 400 });
    if (!Number.isFinite(rating) || rating < 0 || rating > 10) return NextResponse.json({ error: "Rating must be between 0 and 10." }, { status: 400 });
    const language = (b.language as string).trim().toLowerCase();
    if (!/^[a-z]{2,3}$/.test(language)) return NextResponse.json({ error: "Use a valid language code such as ta, te, ml, kn, hi or en." }, { status: 400 });
    const genreName = (b.genre as string).trim().slice(0, 60);
    const genreSlug = genreName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await prisma.$transaction(async (tx) => {
      await tx.movie.update({ where: { id: b.id as string }, data: {
        titleEn: (b.titleEn as string).trim().slice(0,160), titleTa: (b.titleTa as string).trim().slice(0,160), slug,
        descriptionEn: (b.descriptionEn as string).trim().slice(0,5000), descriptionTa: (b.descriptionTa as string).trim().slice(0,5000),
        posterUrl: typeof b.posterUrl === "string" ? b.posterUrl.trim().slice(0,2000) : "",
        backdropUrl: typeof b.backdropUrl === "string" ? b.backdropUrl.trim().slice(0,2000) : "",
        language, releaseYear, runtimeMinutes, ageRating: (b.ageRating as string).trim().slice(0,20), rating,
        genres: { deleteMany: {}, create: { genre: { connectOrCreate: { where: { slug: genreSlug }, create: { name: genreName, slug: genreSlug } } } } },
      } });
    });
    return NextResponse.json({ message: "Draft movie updated successfully." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "That movie slug already exists." }, { status: 409 });
    console.error("Admin movie edit failed:", error);
    return NextResponse.json({ error: "Unable to update draft movie." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body: unknown = await request.json();
    const id = body && typeof body === "object" ? (body as Record<string, unknown>).id : null;
    if (typeof id !== "string") return NextResponse.json({ error: "Movie id is required." }, { status: 400 });
    const existing = await prisma.movie.findUnique({ where: { id }, select: { id: true, isPublished: true, contentStatus: true } });
    if (!existing) return NextResponse.json({ error: "Movie not found." }, { status: 404 });
    if (existing.isPublished || existing.contentStatus !== ContentStatus.DRAFT) {
      return NextResponse.json({ error: "Only unpublished draft movies can be deleted." }, { status: 409 });
    }
    await prisma.movie.delete({ where: { id } });
    return NextResponse.json({ message: "Draft movie deleted." });
  } catch (error) {
    console.error("Admin movie delete failed:", error);
    return NextResponse.json({ error: "Unable to delete draft movie." }, { status: 500 });
  }
}
