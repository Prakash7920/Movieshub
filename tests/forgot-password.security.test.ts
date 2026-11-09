import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  count: vi.fn(),
  deleteMany: vi.fn(),
  create: vi.fn(),
  consumeAuthRateLimit: vi.fn(),
  consumeRateLimit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rateLimitBucket: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockImplementation(async ({ create }) => ({ count: 1, expiresAt: create.expiresAt })),
    },
    authRateLimit: { upsert: vi.fn().mockResolvedValue({ count: 1 }) },
    user: { findUnique: mocks.findUnique },
    passwordResetToken: {
      count: mocks.count,
      deleteMany: mocks.deleteMany,
      create: mocks.create,
    },
  },
}));
vi.mock("@/lib/auth-rate-limit", () => ({ consumeAuthRateLimit: mocks.consumeAuthRateLimit }));
vi.mock("@/lib/security/rate-limit", () => ({ consumeRateLimit: mocks.consumeRateLimit }));

import { POST } from "../app/api/auth/forgot-password/route";

const genericMessage = "If an account exists for that email, a password reset link will be sent.";
const credentialUser = {
  id: "test-user-id",
  email: "member@example.test",
  passwordHash: "not-a-real-password-hash",
  provider: "CREDENTIALS",
};

function request(email = "member@example.test") {
  return new Request("https://nexafilm.example/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://nexafilm.example", "x-vercel-forwarded-for": "192.0.2.10" },
    body: JSON.stringify({ email }),
  });
}

async function publicResult(response: Response) {
  return { status: response.status, body: await response.json() };
}

describe("forgot-password public response security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.RATE_LIMIT_SECRET = "test-rate-limit-secret-at-least-32-chars";
    process.env.NEXTAUTH_URL = "https://nexafilm.example";
    mocks.consumeAuthRateLimit.mockResolvedValue(true);
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.findUnique.mockResolvedValue(null);
    mocks.count.mockResolvedValue(0);
    mocks.deleteMany.mockResolvedValue({ count: 0 });
    mocks.create.mockResolvedValue({ id: "test-token-id" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
  });

  it("returns the same generic response for an unknown account and a valid credential account", async () => {
    const unknown = await publicResult(await POST(request("unknown@example.test")));
    mocks.findUnique.mockResolvedValueOnce(credentialUser);
    const known = await publicResult(await POST(request()));

    expect(unknown).toEqual(known);
    expect(known).toEqual({ status: 200, body: { message: genericMessage } });
  });

  it("does not disclose database lookup failures", async () => {
    mocks.findUnique.mockRejectedValueOnce(new Error("simulated database outage"));
    const result = await publicResult(await POST(request()));
    expect(result).toEqual({ status: 202, body: { message: genericMessage } });
  });

  it("does not disclose email-provider failures", async () => {
    mocks.findUnique.mockResolvedValueOnce(credentialUser);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("provider failure", { status: 503 })));
    const result = await publicResult(await POST(request()));
    expect(result).toEqual({ status: 200, body: { message: genericMessage } });
  });

  it("does not disclose rate-limiter/database failures", async () => {
    mocks.consumeAuthRateLimit.mockRejectedValueOnce(new Error("simulated limiter outage"));
    const result = await publicResult(await POST(request()));
    expect(result).toEqual({ status: 200, body: { message: genericMessage } });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("sets no-store headers on generic responses", async () => {
    const response = await POST(request("unknown@example.test"));
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
