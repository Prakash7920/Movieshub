import { NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/security/origin-check";
import { getServerSession } from "next-auth/next";
import { LicenseStatus, ContentStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { writeAdminAuditLog } from "@/lib/security/admin-audit-log";

export const runtime = "nodejs";

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
  const movies = await prisma.movie.findMany({
    orderBy: { titleEn: "asc" },
    select: { id: true, titleEn: true, isPublished: true, license: { select: { id: true, owner: true, status: true, startDate: true, expiryDate: true, allowedCountries: true, notes: true } } },
  });
  return NextResponse.json({ movies }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;
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
    const allowedCountries = [...new Set(b.countries.split(",").map(x => x.trim().toUpperCase()).filter(Boolean))];
    if (!allowedCountries.length || allowedCountries.length > 30 || allowedCountries.some(x => !/^[A-Z]{2}$/.test(x))) {
      return NextResponse.json({ error: "Enter permitted countries as two-letter ISO codes, separated by commas (for example IN, SG)." }, { status: 400 });
    }
    const licenseResult = await prisma.$transaction(async tx => {
      const movie = await tx.movie.findUnique({
        where: { id: b.movieId as string },
        select: { id: true, isPublished: true },
      });
      if (!movie) return { kind: "NOT_FOUND" as const };

      const saved = await tx.license.upsert({
        where: { movieId: b.movieId as string },
        create: { movieId: b.movieId as string, owner: (b.owner as string).trim().slice(0, 200), status: LicenseStatus.PENDING, startDate, expiryDate, allowedCountries, downloadAllowed: false, notes: typeof b.notes === "string" ? b.notes.trim().slice(0, 3000) : null },
        update: { owner: (b.owner as string).trim().slice(0, 200), status: LicenseStatus.PENDING, startDate, expiryDate, allowedCountries, downloadAllowed: false, notes: typeof b.notes === "string" ? b.notes.trim().slice(0, 3000) : null },
        select: { id: true, owner: true, status: true, startDate: true, expiryDate: true, allowedCountries: true },
      });
      if (movie.isPublished) {
        await tx.movie.update({
          where: { id: b.movieId as string },
          data: { isPublished: false, contentStatus: ContentStatus.UNPUBLISHED },
        });
      }
      await writeAdminAuditLog(tx, { actorUserId: auth.userId, actorEmail: auth.actorEmail, action: "LICENSE_SAVED_PENDING", targetType: "License", targetId: saved.id, metadata: { movieId: b.movieId as string, autoUnpublished: movie.isPublished } });
      return { kind: "SAVED" as const, license: saved };
    }, { isolationLevel: "Serializable" });
    if (licenseResult.kind === "NOT_FOUND") {
      return NextResponse.json({ error: "Movie not found." }, { status: 404 });
    }
    return NextResponse.json({ message: "Licence details saved as PENDING. Any previously published movie was unpublished and will require fresh approval and manual publishing.", license: licenseResult.license }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      return NextResponse.json({ error: "The licence changed during this update. Reload the record and try again." }, { status: 409 });
    }
    console.error("Admin licence save failed:", error);
    return NextResponse.json({ error: "Unable to save licence details." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.movieId !== "string" || (b.status !== "ACTIVE" && b.status !== "REJECTED")) {
      return NextResponse.json({ error: "Choose an approval or rejection action." }, { status: 400 });
    }
    const movieId = b.movieId as string;

    if (b.status === "ACTIVE") {
      if (b.confirmed !== true || typeof b.agreementReference !== "string" || b.agreementReference.trim().length < 3) {
        return NextResponse.json({ error: "Approval requires explicit verification confirmation and a real signed-agreement reference." }, { status: 400 });
      }
      const reference = b.agreementReference.trim().slice(0, 300);
      const now = new Date();
      const updated = await prisma.$transaction(async tx => {
        const current = await tx.license.findUnique({ where: { movieId } });
        if (!current) return { kind: "NOT_FOUND" as const };
        if (current.startDate > now || current.expiryDate <= now || !current.allowedCountries.length) {
          return { kind: "INVALID" as const };
        }
        const result = await tx.license.update({
          where: { movieId },
          data: {
            status: LicenseStatus.ACTIVE,
            notes: [current.notes, "VERIFIED AGREEMENT REFERENCE: " + reference, "VERIFIED BY ADMIN USER ID: " + auth.userId, "VERIFIED AT: " + now.toISOString()].filter(Boolean).join("\n"),
          },
        });
        await tx.movie.update({
          where: { id: movieId },
          data: { allowedCountries: current.allowedCountries, licenseOwner: current.owner, licenseStartDate: current.startDate, licenseExpiryDate: current.expiryDate, downloadPermission: false },
        });
        await writeAdminAuditLog(tx, { actorUserId: auth.userId, actorEmail: auth.actorEmail, action: "LICENSE_APPROVED", targetType: "License", targetId: result.id, metadata: { movieId, agreementReferenceRecorded: true } });
        return { kind: "UPDATED" as const, status: result.status };
      }, { isolationLevel: "Serializable" });
      if (updated.kind === "NOT_FOUND") return NextResponse.json({ error: "No licence record exists for this movie." }, { status: 404 });
      if (updated.kind === "INVALID") return NextResponse.json({ error: "Cannot approve: licence dates must include today and permitted countries must be recorded." }, { status: 400 });
      return NextResponse.json({ message: "Licence marked ACTIVE after the admin verification confirmation. Downloads remain disabled.", status: updated.status });
    }

    if (typeof b.reason !== "string" || b.reason.trim().length < 3) {
      return NextResponse.json({ error: "Enter a brief rejection reason." }, { status: 400 });
    }
    const rejectionReason = b.reason.trim().slice(0, 500);
    const reviewedAt = new Date();
    const rejected = await prisma.$transaction(async tx => {
      const current = await tx.license.findUnique({ where: { movieId } });
      if (!current) return false;
      await tx.license.update({
        where: { movieId },
        data: {
          status: LicenseStatus.REJECTED,
          notes: [current.notes, "REJECTED BY ADMIN USER ID: " + auth.userId, "REJECTION REASON: " + rejectionReason, "REVIEWED AT: " + reviewedAt.toISOString()].filter(Boolean).join("\n"),
        },
      });
      const movie = await tx.movie.findUnique({ where: { id: movieId }, select: { isPublished: true } });
      if (movie?.isPublished) {
        await tx.movie.update({
          where: { id: movieId },
          data: { isPublished: false, contentStatus: ContentStatus.UNPUBLISHED },
        });
      }
      await writeAdminAuditLog(tx, { actorUserId: auth.userId, actorEmail: auth.actorEmail, action: "LICENSE_REJECTED", targetType: "License", targetId: current.id, metadata: { movieId, rejectionReasonRecorded: true, autoUnpublished: Boolean(movie?.isPublished) } });
      return true;
    }, { isolationLevel: "Serializable" });
    if (!rejected) return NextResponse.json({ error: "No licence record exists for this movie." }, { status: 404 });
    return NextResponse.json({ message: "Licence marked REJECTED. Any published movie was automatically unpublished; re-approval will require a fresh manual publish action.", status: "REJECTED" });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      return NextResponse.json({ error: "The licence changed during review. Reload the record and try again." }, { status: 409 });
    }
    console.error("Admin licence review failed:", error);
    return NextResponse.json({ error: "Unable to review licence." }, { status: 500 });
  }
}
