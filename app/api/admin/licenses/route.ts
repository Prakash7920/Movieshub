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

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.movieId !== "string" || (b.status !== "ACTIVE" && b.status !== "REJECTED")) {
      return NextResponse.json({ error: "Choose an approval or rejection action." }, { status: 400 });
    }
    const license = await prisma.license.findUnique({ where: { movieId: b.movieId } });
    if (!license) return NextResponse.json({ error: "No licence record exists for this movie." }, { status: 404 });

    if (b.status === "ACTIVE") {
      if (b.confirmed !== true || typeof b.agreementReference !== "string" || b.agreementReference.trim().length < 3) {
        return NextResponse.json({ error: "Approval requires explicit verification confirmation and a real signed-agreement reference." }, { status: 400 });
      }
      const now = new Date();
      if (license.startDate > now || license.expiryDate <= now || !license.allowedCountries.length) {
        return NextResponse.json({ error: "Cannot approve: licence dates must include today and permitted countries must be recorded." }, { status: 400 });
      }
      const reference = b.agreementReference.trim().slice(0, 300);
      const updated = await prisma.$transaction(async tx => {
        const result = await tx.license.update({ where: { movieId: b.movieId }, data: { status: LicenseStatus.ACTIVE, notes: [license.notes, "VERIFIED AGREEMENT REFERENCE: " + reference, "VERIFIED BY ADMIN USER ID: " + auth.userId, "VERIFIED AT: " + now.toISOString()].filter(Boolean).join("\n") } });
        await tx.movie.update({ where: { id: b.movieId }, data: { allowedCountries: license.allowedCountries, licenseOwner: license.owner, licenseStartDate: license.startDate, licenseExpiryDate: license.expiryDate, downloadPermission: false } });
        return result;
      });
      return NextResponse.json({ message: "Licence marked ACTIVE after the admin verification confirmation. Downloads remain disabled.", status: updated.status });
    }

    if (typeof b.reason !== "string" || b.reason.trim().length < 3) {
      return NextResponse.json({ error: "Enter a brief rejection reason." }, { status: 400 });
    }
    await prisma.license.update({ where: { movieId: b.movieId }, data: { status: LicenseStatus.REJECTED, notes: [license.notes, "REJECTED BY ADMIN USER ID: " + auth.userId, "REJECTION REASON: " + b.reason.trim().slice(0, 500), "REVIEWED AT: " + new Date().toISOString()].filter(Boolean).join("\n") } });
    return NextResponse.json({ message: "Licence marked REJECTED. Publishing remains blocked.", status: "REJECTED" });
  } catch (error) {
    console.error("Admin licence review failed:", error);
    return NextResponse.json({ error: "Unable to review licence." }, { status: 500 });
  }
}
