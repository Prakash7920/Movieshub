import { NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/security/origin-check";
import { getServerSession } from "next-auth/next";
import { Prisma, ContentStatus, MovieType } from "@prisma/client";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/lib/security/admin-audit-log";

export const runtime = "nodejs";

function isSafeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!sessionUser?.id) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { role: true, isBanned: true, email: true } });
  if (!user || user.isBanned || !["ADMIN", "SUPERADMIN"].includes(user.role)) {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { userId: sessionUser.id, actorEmail: user.email };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const [movies, genres] = await Promise.all([
      prisma.movie.findMany({
        orderBy: { updatedAt: "desc" },
        select: { id: true, slug: true, titleEn: true, titleTa: true, descriptionEn: true, descriptionTa: true, language: true, releaseYear: true, runtimeMinutes: true, ageRating: true, rating: true, isPublished: true, contentStatus: true, movieType: true, posterUrl: true, backdropUrl: true, genres: { select: { genre: { select: { name: true } } } } },
      }),
      prisma.genre.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    ]);
    return NextResponse.json({ movies: movies.map(m => ({ ...m, genre: m.genres.map(g => g.genre.name).join(", ") })), genres }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("Admin catalogue read failed:", error);
    return NextResponse.json({ error: "Unable to load admin catalogue." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid movie data." }, { status: 400 });
    const b = body as Record<string, unknown>;
    const fields = ["titleEn","titleTa","slug","descriptionEn","descriptionTa","posterUrl","backdropUrl","language","ageRating"];
    for (const field of fields) if (typeof b[field] !== "string" || !(b[field] as string).trim()) return NextResponse.json({ error: field + " is required." }, { status: 400 });
    if (!isSafeImageUrl((b.posterUrl as string).trim()) || !isSafeImageUrl((b.backdropUrl as string).trim())) {
      return NextResponse.json({ error: "Poster and backdrop must use valid HTTPS image URLs." }, { status: 400 });
    }
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
    const movie = await prisma.$transaction(async (tx) => {
      const created = await tx.movie.create({
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
      await writeAdminAuditLog(tx, { actorUserId: auth.userId, actorEmail: auth.actorEmail, action: "MOVIE_DRAFT_CREATED", targetType: "Movie", targetId: created.id, metadata: { slug: created.slug } });
      return created;
    });
    return NextResponse.json({ message: "Movie saved as draft. Publish it after reviewing metadata and rights.", movie }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "That movie slug already exists." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "The movie changed during editing. Reload the draft and try again." }, { status: 409 });
    console.error("Admin movie create failed:", error);
    return NextResponse.json({ error: "Unable to create movie." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid update." }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.id !== "string" || typeof b.publish !== "boolean") return NextResponse.json({ error: "Movie id and publish status are required." }, { status: 400 });
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.movie.findUnique({
        where: { id: b.id as string },
        select: { id: true, license: { select: { status: true, startDate: true, expiryDate: true, allowedCountries: true } } },
      });
      if (!existing) return null;
      if (b.publish) {
        const license = existing.license;
        const now = new Date();
        if (!license || license.status !== "ACTIVE" || license.startDate > now || license.expiryDate <= now || license.allowedCountries.length === 0) {
          throw new Error("LICENCE_NOT_PUBLISHABLE");
        }
      }
      const updated = await tx.movie.update({
        where: { id: b.id as string },
        data: { isPublished: b.publish as boolean, contentStatus: b.publish ? ContentStatus.PUBLISHED : ContentStatus.UNPUBLISHED },
        select: { id: true, isPublished: true, contentStatus: true },
      });
      await writeAdminAuditLog(tx, { actorUserId: auth.userId, actorEmail: auth.actorEmail, action: b.publish ? "MOVIE_PUBLISHED" : "MOVIE_UNPUBLISHED", targetType: "Movie", targetId: updated.id });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!updated) return NextResponse.json({ error: "Movie not found." }, { status: 404 });
    return NextResponse.json({ message: b.publish ? "Movie published." : "Movie unpublished.", movie: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "LICENCE_NOT_PUBLISHABLE") {
      return NextResponse.json({ error: "Cannot publish: a current ACTIVE licence with valid dates and permitted territories must be recorded first." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "The licence changed during publishing. Please review the licence and try again." }, { status: 409 });
    }
    console.error("Admin movie update failed:", error);
    return NextResponse.json({ error: "Unable to update movie." }, { status: 500 });
  }
}


export async function PUT(request: Request) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid movie data." }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.id !== "string") return NextResponse.json({ error: "Movie id is required." }, { status: 400 });
    const required = ["titleEn","titleTa","slug","descriptionEn","descriptionTa","language","ageRating","genre"];
    for (const field of required) if (typeof b[field] !== "string" || !(b[field] as string).trim()) return NextResponse.json({ error: field + " is required." }, { status: 400 });
    const posterUrl = typeof b.posterUrl === "string" ? b.posterUrl.trim() : "";
    const backdropUrl = typeof b.backdropUrl === "string" ? b.backdropUrl.trim() : "";
    if ((posterUrl && !isSafeImageUrl(posterUrl)) || (backdropUrl && !isSafeImageUrl(backdropUrl))) {
      return NextResponse.json({ error: "Poster and backdrop must use valid HTTPS image URLs." }, { status: 400 });
    }
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
    const updateResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.movie.findUnique({ where: { id: b.id as string }, select: { id: true, isPublished: true, contentStatus: true } });
      if (!existing) return "NOT_FOUND" as const;
      if (existing.isPublished || existing.contentStatus !== ContentStatus.DRAFT) return "NOT_DRAFT" as const;
      await tx.movie.update({ where: { id: b.id as string }, data: {
        titleEn: (b.titleEn as string).trim().slice(0,160), titleTa: (b.titleTa as string).trim().slice(0,160), slug,
        descriptionEn: (b.descriptionEn as string).trim().slice(0,5000), descriptionTa: (b.descriptionTa as string).trim().slice(0,5000),
        posterUrl: posterUrl.slice(0,2000),
        backdropUrl: backdropUrl.slice(0,2000),
        language, releaseYear, runtimeMinutes, ageRating: (b.ageRating as string).trim().slice(0,20), rating,
        genres: { deleteMany: {}, create: { genre: { connectOrCreate: { where: { slug: genreSlug }, create: { name: genreName, slug: genreSlug } } } } },
      } });
      await writeAdminAuditLog(tx, { actorUserId: auth.userId, actorEmail: auth.actorEmail, action: "MOVIE_DRAFT_UPDATED", targetType: "Movie", targetId: b.id as string, metadata: { slug } });
      return "UPDATED" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (updateResult === "NOT_FOUND") return NextResponse.json({ error: "Movie not found." }, { status: 404 });
    if (updateResult === "NOT_DRAFT") return NextResponse.json({ error: "Only unpublished draft movies can be edited." }, { status: 409 });
    return NextResponse.json({ message: "Draft movie updated successfully." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "That movie slug already exists." }, { status: 409 });
    console.error("Admin movie edit failed:", error);
    return NextResponse.json({ error: "Unable to update draft movie." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body: unknown = await request.json();
    const id = body && typeof body === "object" ? (body as Record<string, unknown>).id : null;
    if (typeof id !== "string") return NextResponse.json({ error: "Movie id is required." }, { status: 400 });
    const deleteResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.movie.findUnique({ where: { id }, select: { id: true, isPublished: true, contentStatus: true } });
      if (!existing) return "NOT_FOUND" as const;
      if (existing.isPublished || existing.contentStatus !== ContentStatus.DRAFT) return "NOT_DRAFT" as const;
      await tx.movie.delete({ where: { id } });
      await writeAdminAuditLog(tx, { actorUserId: auth.userId, actorEmail: auth.actorEmail, action: "MOVIE_DRAFT_DELETED", targetType: "Movie", targetId: id });
      return "DELETED" as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (deleteResult === "NOT_FOUND") return NextResponse.json({ error: "Movie not found." }, { status: 404 });
    if (deleteResult === "NOT_DRAFT") return NextResponse.json({ error: "Only unpublished draft movies can be deleted." }, { status: 409 });
    return NextResponse.json({ message: "Draft movie deleted." });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "The movie changed during deletion. Reload the draft and try again." }, { status: 409 });
    console.error("Admin movie delete failed:", error);
    return NextResponse.json({ error: "Unable to delete draft movie." }, { status: 500 });
  }
}
