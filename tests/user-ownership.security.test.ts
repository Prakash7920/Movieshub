import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  watchlistFindMany: vi.fn(),
  watchlistUpsert: vi.fn(),
  watchlistDeleteMany: vi.fn(),
  historyFindMany: vi.fn(),
  historyUpsert: vi.fn(),
  historyDeleteMany: vi.fn(),
  movieFindFirst: vi.fn(),
}));

vi.mock("next-auth/next", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
vi.mock("../lib/security/rate-limit", () => ({ consumeRateLimit: async () => ({ allowed: true, limit: 100, remaining: 99, retryAfterSeconds: 0 }) }));


vi.mock("@/lib/licensing/territory", () => ({
  getVercelViewerCountry: vi.fn(() => "IN"),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    rateLimitBucket: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockImplementation(async ({ create }) => ({ count: 1, expiresAt: create.expiresAt })),
    },
    authRateLimit: { upsert: vi.fn().mockResolvedValue({ count: 1 }) },
    watchlist: {
      findMany: mocks.watchlistFindMany,
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      upsert: mocks.watchlistUpsert,
      deleteMany: mocks.watchlistDeleteMany,
    },
    watchHistory: {
      findMany: mocks.historyFindMany,
      count: vi.fn().mockResolvedValue(0),
      upsert: mocks.historyUpsert,
      deleteMany: mocks.historyDeleteMany,
    },
    movie: { findFirst: mocks.movieFindFirst },
  },
}));

import {
  GET as watchlistGet,
  POST as watchlistPost,
  DELETE as watchlistDelete,
} from "../app/api/watchlist/route";
import {
  GET as historyGet,
  POST as historyPost,
  DELETE as historyDelete,
} from "../app/api/watch-history/route";

const USER_A = "authenticated-user-A";
const USER_B = "attacker-supplied-user-B";
const ORIGIN = "https://nexafilm.example";

function request(path: string, method: string, body?: Record<string, unknown>) {
  const headers = new Headers({ origin: ORIGIN, "x-vercel-ip-country": "IN" });
  if (body) headers.set("content-type", "application/json");
  return new Request(`https://nexafilm.example${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("watchlist and watch-history user ownership", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_SECRET", "test-rate-limit-secret-at-least-32-chars");
    vi.stubEnv("NEXTAUTH_URL", ORIGIN);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", ORIGIN);
    mocks.getServerSession.mockReset().mockResolvedValue({ user: { id: USER_A } });
    for (const fn of [
      mocks.watchlistFindMany, mocks.watchlistUpsert, mocks.watchlistDeleteMany,
      mocks.historyFindMany, mocks.historyUpsert, mocks.historyDeleteMany,
      mocks.movieFindFirst,
    ]) fn.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("scopes watchlist reads to the authenticated user, not a supplied userId", async () => {
    mocks.watchlistFindMany.mockResolvedValue([]);
    const response = await watchlistGet(request("/api/watchlist?userId=" + USER_B, "GET"));
    expect(response.status).toBe(200);
    expect(mocks.watchlistFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: USER_A }),
    }));
    expect(JSON.stringify(mocks.watchlistFindMany.mock.calls[0][0])).not.toContain(USER_B);
  });

  it("scopes watch-history reads to the authenticated user, not a supplied userId", async () => {
    mocks.historyFindMany.mockResolvedValue([]);
    const response = await historyGet(request("/api/watch-history?userId=" + USER_B, "GET"));
    expect(response.status).toBe(200);
    expect(mocks.historyFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: USER_A }),
    }));
    expect(JSON.stringify(mocks.historyFindMany.mock.calls[0][0])).not.toContain(USER_B);
  });

  it("creates a watchlist entry under the authenticated user even if body includes another userId", async () => {
    mocks.movieFindFirst.mockResolvedValue({ id: "licensed-movie-1" });
    mocks.watchlistUpsert.mockResolvedValue({ id: "watchlist-row-1", createdAt: new Date() });
    const response = await watchlistPost(request("/api/watchlist", "POST", { slug: "licensed-film", userId: USER_B }));
    expect(response.status).toBe(201);
    expect(mocks.watchlistUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_movieId: { userId: USER_A, movieId: "licensed-movie-1" } },
      create: { userId: USER_A, movieId: "licensed-movie-1" },
    }));
    expect(JSON.stringify(mocks.watchlistUpsert.mock.calls[0][0])).not.toContain(USER_B);
  });

  it("creates watch history under the authenticated user even if body includes another userId", async () => {
    mocks.movieFindFirst.mockResolvedValue({ id: "licensed-movie-1" });
    mocks.historyUpsert.mockResolvedValue({ id: "history-row-1", progress: 25, lastWatchedAt: new Date() });
    const response = await historyPost(request("/api/watch-history", "POST", { slug: "licensed-film", progress: 25, userId: USER_B }));
    expect(response.status).toBe(200);
    expect(mocks.historyUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_movieId: { userId: USER_A, movieId: "licensed-movie-1" } },
      create: { userId: USER_A, movieId: "licensed-movie-1", progress: 25 },
    }));
    expect(JSON.stringify(mocks.historyUpsert.mock.calls[0][0])).not.toContain(USER_B);
  });

  it("deletes only the authenticated user's watchlist row", async () => {
    mocks.watchlistDeleteMany.mockResolvedValue({ count: 1 });
    const response = await watchlistDelete(request("/api/watchlist", "DELETE", { slug: "licensed-film", userId: USER_B }));
    expect(response.status).toBe(200);
    expect(mocks.watchlistDeleteMany).toHaveBeenCalledWith({
      where: { userId: USER_A, movie: { slug: "licensed-film" } },
    });
    expect(JSON.stringify(mocks.watchlistDeleteMany.mock.calls[0][0])).not.toContain(USER_B);
  });

  it("deletes only the authenticated user's watch-history row", async () => {
    mocks.historyDeleteMany.mockResolvedValue({ count: 1 });
    const response = await historyDelete(request("/api/watch-history", "DELETE", { slug: "licensed-film", userId: USER_B }));
    expect(response.status).toBe(200);
    expect(mocks.historyDeleteMany).toHaveBeenCalledWith({
      where: { userId: USER_A, movie: { slug: "licensed-film" } },
    });
    expect(JSON.stringify(mocks.historyDeleteMany.mock.calls[0][0])).not.toContain(USER_B);
  });
});
