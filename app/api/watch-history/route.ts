import { NextResponse } from "next/server";
import { logSafeError } from "@/lib/security/safe-log";
import { consumePrivateApiRateLimit } from "@/lib/security/private-api-rate-limit";
import { parseBoundedPagination } from "@/lib/security/pagination";
import { hasValidJsonContentType, isSameOriginRequest } from "@/lib/security/request-guards";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getVercelViewerCountry } from "@/lib/licensing/territory";

export const runtime = "nodejs";

async function getUserId() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  return user?.id ?? null;
}

async function isUserThrottled(request: Request, userId: string): Promise<{ allowed: boolean; retryAfterSeconds: number; available: boolean }> {
  return consumePrivateApiRateLimit(request, userId, {
    userScope: "watch-history-user",
    userLimit: 90,
    ipScope: "watch-history-ip",
    ipLimit: 180,
  });
}

function rateLimitUnavailable() {
  return NextResponse.json({ error: "This service is temporarily unavailable. Please try again shortly." }, {
    status: 503,
    headers: { "Retry-After": "60", "Cache-Control": "no-store" },
  });
}

function throttledResponse(retryAfterSeconds: number) {
  return NextResponse.json({ error: "Too many requests. Please try again shortly." }, {
    status: 429,
    headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" },
  });
}

function currentLicenceFilter(country: string) {
  const now = new Date();
  return {
    isPublished: true,
    contentStatus: "PUBLISHED" as const,
    license: {
      is: {
        status: "ACTIVE" as const,
        startDate: { lte: now },
        expiryDate: { gt: now },
        allowedCountries: { has: country },
      },
    },
  };
}

function countryUnavailable() {
  return NextResponse.json(
    { error: "Your viewing country could not be verified. Please try again from the live NexaFilm website." },
    { status: 503, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(request: Request) {
  try {
    const country = getVercelViewerCountry(request.headers);
    if (!country) return countryUnavailable();
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in to view watch history." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
    const rateLimit = await isUserThrottled(request, userId);
    if (!rateLimit.available) return rateLimitUnavailable();
    if (!rateLimit.allowed) return throttledResponse(rateLimit.retryAfterSeconds);

    const { searchParams } = new URL(request.url);
    const pagination = parseBoundedPagination(searchParams);
    if (!pagination) {
      return NextResponse.json(
        { error: "Invalid pagination. Page must be 1–100 and pageSize must be 1–50." },
        { status: 400, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    const { page, pageSize, skip, take } = pagination;
    const where = { userId, movie: currentLicenceFilter(country) };
    const [items, totalItems] = await Promise.all([
      prisma.watchHistory.findMany({
      where,
      orderBy: { lastWatchedAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        progress: true,
        lastWatchedAt: true,
        movie: {
          select: {
            slug: true,
            titleEn: true,
            titleTa: true,
            posterUrl: true,
            releaseYear: true,
            runtimeMinutes: true,
          },
        },
      },
    }),
      prisma.watchHistory.count({ where }),
    ]);
    return NextResponse.json({
      items,
      pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    logSafeError("Watch history fetch failed", error);
    return NextResponse.json({ error: "Unable to load watch history." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!(await hasValidJsonContentType(request, 8 * 1024))) return NextResponse.json({ error: "A valid JSON request is required." }, { status: 415 });
  try {
    const country = getVercelViewerCountry(request.headers);
    if (!country) return countryUnavailable();
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in to save watch history." }, { status: 401 });
    if (await isUserThrottled(userId)) return throttledResponse();

    const body: unknown = await request.json();
    const slug = typeof body === "object" && body !== null && "slug" in body && typeof body.slug === "string" ? body.slug.trim() : "";
    const progress = typeof body === "object" && body !== null && "progress" in body && typeof body.progress === "number" ? body.progress : 0;

    if (!slug || slug.length > 120) return NextResponse.json({ error: "A valid movie slug is required." }, { status: 400 });
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) return NextResponse.json({ error: "Progress must be a whole number from 0 to 100." }, { status: 400 });

    const movie = await prisma.movie.findFirst({
      where: { slug, ...currentLicenceFilter(country) },
      select: { id: true },
    });
    if (!movie) return NextResponse.json({ error: "Movie not found in the currently licensed catalogue for your territory." }, { status: 404 });

    const item = await prisma.watchHistory.upsert({
      where: { userId_movieId: { userId, movieId: movie.id } },
      update: { progress, lastWatchedAt: new Date() },
      create: { userId, movieId: movie.id, progress },
      select: { id: true, progress: true, lastWatchedAt: true },
    });
    return NextResponse.json({ message: "Watch history saved.", item }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    logSafeError("Watch history save failed", error);
    return NextResponse.json({ error: "Unable to save watch history right now." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!(await hasValidJsonContentType(request, 8 * 1024))) return NextResponse.json({ error: "A valid JSON request is required." }, { status: 415 });
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Please sign in to edit watch history." }, { status: 401 });
    if (await isUserThrottled(userId)) return throttledResponse();

    const body: unknown = await request.json();
    const slug = typeof body === "object" && body !== null && "slug" in body && typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug || slug.length > 120) return NextResponse.json({ error: "A valid movie slug is required." }, { status: 400 });

    await prisma.watchHistory.deleteMany({ where: { userId, movie: { slug } } });
    return NextResponse.json({ message: "Watch history entry removed." }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    logSafeError("Watch history removal failed", error);
    return NextResponse.json({ error: "Unable to remove this history entry." }, { status: 500 });
  }
}
