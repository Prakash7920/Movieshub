import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getServerSession: vi.fn(),
  userFindUnique: vi.fn(),
  movieFindMany: vi.fn(),
  movieCount: vi.fn(),
  genreFindMany: vi.fn(),
  licenseFindMany: vi.fn(),
}));

vi.mock("next-auth/next", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    movie: { findMany: mocks.movieFindMany, count: mocks.movieCount },
    genre: { findMany: mocks.genreFindMany },
    license: { findMany: mocks.licenseFindMany },
  },
}));

import { GET as adminMoviesGet, POST as adminMoviesPost } from "../app/api/admin/movies/route";
import { GET as adminLicensesGet } from "../app/api/admin/licenses/route";

const USER_ID = "session-user-123";
const ORIGIN = "https://nexafilm.example";
const getRequest = () => new Request(`${ORIGIN}/api/admin/movies`);

function postRequest(body: Record<string, unknown>) {
  return new Request("https://nexafilm.example/api/admin/movies", {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin API authorization", () => {
  beforeEach(() => {
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", ORIGIN);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", ORIGIN);
    mocks.getServerSession.mockReset().mockResolvedValue({ user: { id: USER_ID } });
    mocks.userFindUnique.mockReset();
    mocks.movieFindMany.mockReset().mockResolvedValue([]);
    mocks.movieCount.mockReset().mockResolvedValue(0);
    mocks.genreFindMany.mockReset().mockResolvedValue([]);
    mocks.licenseFindMany.mockReset().mockResolvedValue([]);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("denies a normal user even when the client session claims ADMIN", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: USER_ID, role: "ADMIN" } });
    mocks.userFindUnique.mockResolvedValue({ role: "USER", isBanned: false });
    const response = await adminMoviesGet(getRequest());
    expect(response?.status).toBe(403);
    expect(mocks.movieFindMany).not.toHaveBeenCalled();
  });

  it("denies a banned administrator", async () => {
    mocks.userFindUnique.mockResolvedValue({ role: "ADMIN", isBanned: true });
    const response = await adminLicensesGet(getRequest());
    expect(response?.status).toBe(403);
    expect(mocks.licenseFindMany).not.toHaveBeenCalled();
  });

  it("denies a missing database account", async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    const response = await adminMoviesGet(getRequest());
    expect(response?.status).toBe(403);
    expect(mocks.movieFindMany).not.toHaveBeenCalled();
  });

  it.each(["ADMIN", "SUPERADMIN"])("allows an active %s based on the database role", async (role) => {
    mocks.userFindUnique.mockResolvedValue({ role, isBanned: false });
    const response = await adminMoviesGet(getRequest());
    expect(response?.status).toBe(200);
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: { role: true, isBanned: true, email: true },
    });
    expect(mocks.movieFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.genreFindMany).toHaveBeenCalledTimes(1);
  });

  it("blocks a forged client role before a state-changing admin operation", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: USER_ID, role: "SUPERADMIN" } });
    mocks.userFindUnique.mockResolvedValue({ role: "USER", isBanned: false });
    const response = await adminMoviesPost(postRequest({ role: "SUPERADMIN" }));
    expect(response?.status).toBe(403);
    expect(mocks.movieFindMany).not.toHaveBeenCalled();
  });
});
