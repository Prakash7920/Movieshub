import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { LicenseStatus } from "@prisma/client";
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
  const movies = await prisma.movie.findMany({
    orderBy: { titleEn: "asc" },
    select: { id: true, titleEn: true, isPublished: true, license: { select: { id: true, owner: true, status: true, startDate: true, expiryDate: true, allowedCountries: true, notes: true } } },
  });
  return NextResponse.json({ movies });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid licence data." }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.movieId !== "string" || typeof b.owner !== "string" || !b.owner.trim() ||
        typeof b.startDate !== "string" || typeof b.expiryDate !== "string" || typeof b.countries !== "string") {
      return NextResponse.json({ error: "Complete all required licence fields." }, { status: 400 });
    }
    const startDate = new Date(b.startDate);
    const expiryDate = new Date(b.expiryDate);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(expiryDate.getTime()) || expiryDate <= startDate) {
      return NextResponse.json({ error: "Expiry date must be after the start date." }, { status: 400 });
    }
    const allowedCountries = b.countries.split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
    if (!allowedCountries.length || allowedCountries.length > 30 || allowedCountries.some(x => !/^[A-Z]{2}$/.test(x))) {
      return NextResponse.json({ error: "Enter permitted countries as two-letter ISO codes, separated by commas (for example IN, SG)." }, { status: 400 });
    }
    const movie = await prisma.movie.findUnique({ where: { id: b.movieId }, select: { id: true } });
    if (!movie) return NextResponse.json({ error: "Movie not found." }, { status: 404 });
    const license = await prisma.license.upsert({
      where: { movieId: b.movieId },
      create: { movieId: b.movieId, owner: b.owner.trim().slice(0, 200), status: LicenseStatus.PENDING, startDate, expiryDate, allowedCountries, downloadAllowed: false, notes: typeof b.notes === "string" ? b.notes.trim().slice(0, 3000) : null },
      update: { owner: b.owner.trim().slice(0, 200), status: LicenseStatus.PENDING, startDate, expiryDate, allowedCountries, downloadAllowed: false, notes: typeof b.notes === "string" ? b.notes.trim().slice(0, 3000) : null },
      select: { id: true, owner: true, status: true, startDate: true, expiryDate: true, allowedCountries: true },
    });
    return NextResponse.json({ message: "Licence details saved for review. Status remains PENDING; this does not grant publishing permission.", license }, { status: 201 });
  } catch (error) {
    console.error("Admin licence save failed:", error);
    return NextResponse.json({ error: "Unable to save licence details." }, { status: 500 });
  }
}
