import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/auth-rate-limit", () => ({
  consumeAuthRateLimit: vi.fn(),
}));

describe("NextAuth cookie transport policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("forces secure cookies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOVIESHUB_E2E", "false");
    vi.stubEnv("NEXTAUTH_URL", "https://nexafilm.example");
    vi.resetModules();
    const { authOptions } = await import("../lib/auth-options");
    expect(authOptions.useSecureCookies).toBe(true);
  });

  it("keeps secure-cookie transport disabled for local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MOVIESHUB_E2E", "false");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.resetModules();
    const { authOptions } = await import("../lib/auth-options");
    expect(authOptions.useSecureCookies).toBe(false);
  });

  it("retains the configured 24-hour JWT session lifetime", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { authOptions } = await import("../lib/auth-options");
    expect(authOptions.session).toMatchObject({
      strategy: "jwt",
      maxAge: 24 * 60 * 60,
    });
  });
});
