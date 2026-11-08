import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  userFindUnique: vi.fn(),
  transaction: vi.fn(),
  movieCreate: vi.fn(),
  movieFindUnique: vi.fn(),
  movieUpdate: vi.fn(),
  movieDelete: vi.fn(),
  licenseUpsert: vi.fn(),
  licenseFindUnique: vi.fn(),
  licenseUpdate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("next-auth/next", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    $transaction: mocks.transaction,
  },
}));

import { POST as createMovie } from "../app/api/admin/movies/route";
import { POST as saveLicense, PATCH as reviewLicense } from "../app/api/admin/licenses/route";

const ORIGIN = "https://nexafilm.example";
const USER_ID = "admin-user-1";

function request(path: string, method: string, body: Record<string, unknown>) {
  return new Request(`https://nexafilm.example${path}`, {
    method,
    headers: { origin: ORIGIN, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function transactionClient() {
  return {
    movie: {
      create: mocks.movieCreate,
      findUnique: mocks.movieFindUnique,
      update: mocks.movieUpdate,
      delete: mocks.movieDelete,
    },
    license: {
      upsert: mocks.licenseUpsert,
      findUnique: mocks.licenseFindUnique,
      update: mocks.licenseUpdate,
    },
    adminAuditLog: { create: mocks.auditCreate },
  };
}

describe("admin mutation audit-log integration", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", ORIGIN);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", ORIGIN);
    mocks.getServerSession.mockResolvedValue({ user: { id: USER_ID } });
    mocks.userFindUnique.mockResolvedValue({ role: "ADMIN", isBanned: false });
    mocks.movieCreate.mockResolvedValue({ id: "movie-1", slug: "sample-film", titleEn: "Sample Film" });
    mocks.movieFindUnique.mockResolvedValue({ id: "movie-1", isPublished: false });
    mocks.movieUpdate.mockResolvedValue({ id: "movie-1", isPublished: true, contentStatus: "PUBLISHED" });
    mocks.movieDelete.mockResolvedValue({ id: "movie-1" });
    mocks.licenseUpsert.mockResolvedValue({ id: "license-1", owner: "Studio", status: "PENDING", startDate: new Date("2026-01-01"), expiryDate: new Date("2027-01-01"), allowedCountries: ["IN"] });
    mocks.licenseFindUnique.mockResolvedValue({
      id: "license-1", movieId: "movie-1", status: "PENDING",
      startDate: new Date("2026-01-01"), expiryDate: new Date("2027-01-01"),
      allowedCountries: ["IN"], notes: null, owner: "Studio",
    });
    mocks.licenseUpdate.mockResolvedValue({ id: "license-1", status: "ACTIVE" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.transaction.mockImplementation(async (callback: (tx: ReturnType<typeof transactionClient>) => unknown) => callback(transactionClient()));
  });

  afterEach(() => vi.unstubAllEnvs());

  it("writes MOVIE_DRAFT_CREATED through the same transaction client as movie creation", async () => {
    const response = await createMovie(request("/api/admin/movies", "POST", {
      titleEn: "Sample Film", titleTa: "மாதிரி படம்", slug: "sample-film",
      descriptionEn: "Description", descriptionTa: "விளக்கம்",
      posterUrl: "https://cdn.example/poster.jpg", backdropUrl: "https://cdn.example/backdrop.jpg",
      language: "ta", ageRating: "U", releaseYear: 2025, runtimeMinutes: 120,
      rating: 7, genre: "Drama",
    }));
    expect(response.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.movieCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: {
        actorUserId: USER_ID, action: "MOVIE_DRAFT_CREATED", targetType: "Movie",
        targetId: "movie-1", metadata: { slug: "sample-film" },
      },
      select: { id: true },
    });
  });

  it("writes LICENSE_SAVED_PENDING through the transaction that saves the licence", async () => {
    const response = await saveLicense(request("/api/admin/licenses", "POST", {
      movieId: "movie-1", owner: "Studio", startDate: "2026-01-01",
      expiryDate: "2027-01-01", countries: "IN",
    }));
    expect(response.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.licenseUpsert).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: {
        actorUserId: USER_ID, action: "LICENSE_SAVED_PENDING", targetType: "License",
        targetId: "license-1", metadata: { movieId: "movie-1", autoUnpublished: false },
      },
      select: { id: true },
    });
  });

  it("writes LICENSE_APPROVED in the same transaction as approval and movie entitlement updates", async () => {
    const response = await reviewLicense(request("/api/admin/licenses", "PATCH", {
      movieId: "movie-1", status: "ACTIVE", confirmed: true, agreementReference: "SIGNED-AGREEMENT-123",
    }));
    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.licenseUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.movieUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: {
        actorUserId: USER_ID, action: "LICENSE_APPROVED", targetType: "License",
        targetId: "license-1", metadata: { movieId: "movie-1", agreementReferenceRecorded: true },
      },
      select: { id: true },
    });
  });

  it("returns failure when audit persistence fails so the transaction rejects instead of committing", async () => {
    mocks.auditCreate.mockRejectedValue(new Error("audit store unavailable"));
    const response = await createMovie(request("/api/admin/movies", "POST", {
      titleEn: "Sample Film", titleTa: "மாதிரி படம்", slug: "sample-film",
      descriptionEn: "Description", descriptionTa: "விளக்கம்",
      posterUrl: "https://cdn.example/poster.jpg", backdropUrl: "https://cdn.example/backdrop.jpg",
      language: "ta", ageRating: "U", releaseYear: 2025, runtimeMinutes: 120,
      rating: 7, genre: "Drama",
    }));
    expect(response.status).toBe(500);
    expect(mocks.movieCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });
});
