import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  consumeAuthRateLimit: vi.fn(),
  hash: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique, create: mocks.create } },
}));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit: mocks.consumeRateLimit }));
vi.mock("@/lib/auth-rate-limit", () => ({
  consumeAuthRateLimit: mocks.consumeAuthRateLimit,
}));
vi.mock("bcryptjs", () => ({ default: { hash: mocks.hash } }));

import { POST } from "../app/api/auth/register/route";

const registrationMessage =
  "If registration can be completed with these details, it has been processed. Try signing in; if you already have an account, use the password reset option if needed.";

function request(email = "member@example.test", extra: Record<string, unknown> = {}) {
  return new Request("https://nexafilm.example/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://nexafilm.example",
      "x-vercel-forwarded-for": "192.0.2.20",
    },
    body: JSON.stringify({
      name: "Test Member",
      email,
      password: "strong-test-password",
      confirmPassword: "strong-test-password",
      ...extra,
    }),
  });
}

async function publicResult(response: Response) {
  return { status: response.status, body: await response.json() };
}

describe("registration account enumeration protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeAuthRateLimit.mockResolvedValue(true);
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({
      id: "new-user-id",
      name: "Test Member",
      email: "member@example.test",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.hash.mockResolvedValue("test-password-hash");
  });

  it("returns the same status and public body for a new email and an existing email", async () => {
    const newlyCreated = await publicResult(await POST(request()));

    mocks.findUnique.mockResolvedValueOnce({ id: "existing-user-id" });
    const alreadyRegistered = await publicResult(await POST(request()));

    expect(newlyCreated).toEqual(alreadyRegistered);
    expect(newlyCreated).toEqual({
      status: 202,
      body: { message: registrationMessage },
    });
  });


  it("ignores client-supplied privileged role and ban fields during account creation", async () => {
    const response = await POST(request("privilege-attempt@example.test", {
      role: "SUPERADMIN",
      isBanned: false,
      adminUser: { create: {} },
    }));

    expect(response.status).toBe(202);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    const createArgs = mocks.create.mock.calls[0][0];
    expect(createArgs.data).toEqual({
      name: "Test Member",
      email: "privilege-attempt@example.test",
      passwordHash: "test-password-hash",
      provider: "CREDENTIALS",
      profiles: {
        create: { displayName: "Test Member", languagePreference: "en" },
      },
    });
    expect(createArgs.data).not.toHaveProperty("role");
    expect(createArgs.data).not.toHaveProperty("isBanned");
    expect(createArgs.data).not.toHaveProperty("adminUser");
  });

  it("does not create a second account when the email already exists", async () => {
    mocks.findUnique.mockResolvedValueOnce({ id: "existing-user-id" });

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.hash).not.toHaveBeenCalled();
  });

  it("returns the same generic response for a concurrent unique-email conflict", async () => {
    const { Prisma } = await import("@prisma/client");
    mocks.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0",
      }),
    );

    const result = await publicResult(await POST(request()));

    expect(result).toEqual({
      status: 202,
      body: { message: registrationMessage },
    });
  });

  it("fails closed when the registration rate limiter is unavailable", async () => {
    mocks.consumeAuthRateLimit.mockRejectedValueOnce(new Error("simulated limiter outage"));

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("sets no-store headers on registration responses", async () => {
    const response = await POST(request());

    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
