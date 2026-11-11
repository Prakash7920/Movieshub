import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("next-auth/next", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUnique },
    movie: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    genre: { findMany: vi.fn() },
    watchHistory: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    watchlist: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    license: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/licensing/territory", () => ({
  getVercelViewerCountry: vi.fn(() => "IN"),
}));

import { POST as adminMoviePost, PATCH as adminMoviePatch, PUT as adminMoviePut, DELETE as adminMovieDelete } from "../app/api/admin/movies/route";
import { POST as adminLicensePost, PATCH as adminLicensePatch } from "../app/api/admin/licenses/route";
import { POST as historyPost, DELETE as historyDelete } from "../app/api/watch-history/route";
import { POST as watchlistPost, DELETE as watchlistDelete } from "../app/api/watchlist/route";

const sameOrigin = "https://nexafilm.example";
const maliciousOrigin = "https://nexafilm.example.attacker.test";

function makeRequest(path: string, origin?: string) {
  const headers = new Headers({ "content-type": "application/json", "x-vercel-ip-country": "IN" });
  if (origin !== undefined) headers.set("origin", origin);
  return new Request(`https://nexafilm.example${path}`, {
    method: "POST",
    headers,
    body: "{}",
  });
}

describe("CSRF/origin integration for authenticated mutation APIs", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", sameOrigin);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", sameOrigin);
    mocks.getServerSession.mockReset();
    mocks.getServerSession.mockResolvedValue(null);
    mocks.findUnique.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const cases = [
    ["admin movie create", "/api/admin/movies", adminMoviePost],
    ["admin movie publish", "/api/admin/movies", adminMoviePatch],
    ["admin movie edit", "/api/admin/movies", adminMoviePut],
    ["admin movie delete", "/api/admin/movies", adminMovieDelete],
    ["admin licence create", "/api/admin/licenses", adminLicensePost],
    ["admin licence review", "/api/admin/licenses", adminLicensePatch],
    ["watch history save", "/api/watch-history", historyPost],
    ["watch history delete", "/api/watch-history", historyDelete],
    ["watchlist save", "/api/watchlist", watchlistPost],
    ["watchlist delete", "/api/watchlist", watchlistDelete],
  ] as const;

  it.each(cases)("rejects a cross-site request before authentication: %s", async (_label, path, handler) => {
    const response = await handler(makeRequest(path, maliciousOrigin));
    expect(response?.status).toBe(403);
    expect(mocks.getServerSession).not.toHaveBeenCalled();
  });

  it.each(cases)("allows exact same-origin request to reach authentication: %s", async (_label, path, handler) => {
    const response = await handler(makeRequest(path, sameOrigin));
    expect(response?.status).toBe(401);
    expect(mocks.getServerSession).toHaveBeenCalledTimes(1);
  });

  it.each(cases)("rejects requests with no Origin or Referer in production: %s", async (_label, path, handler) => {
    const response = await handler(makeRequest(path));
    expect(response?.status).toBe(403);
    expect(mocks.getServerSession).not.toHaveBeenCalled();
  });
});
