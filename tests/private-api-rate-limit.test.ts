import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));
vi.mock("@/lib/security/client-identity", () => ({
  getClientIp: mocks.getClientIp,
}));

import { consumePrivateApiRateLimit } from "@/lib/security/private-api-rate-limit";

describe("consumePrivateApiRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClientIp.mockReturnValue("203.0.113.42");
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });

  it("checks independent user and IP buckets", async () => {
    const result = await consumePrivateApiRateLimit(
      new Request("https://nexafilm.example/api/private"),
      "user-123",
      { userScope: "test-user", userLimit: 5, ipScope: "test-ip", ipLimit: 10 },
    );

    expect(result).toMatchObject({ allowed: true, available: true });
    expect(mocks.consumeRateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.consumeRateLimit).toHaveBeenNthCalledWith(1, "test-user", "user-123", 5, 60);
    expect(mocks.consumeRateLimit).toHaveBeenNthCalledWith(2, "test-ip", "203.0.113.42", 10, 60);
  });

  it("retains the user bucket when client IP is unavailable", async () => {
    mocks.getClientIp.mockReturnValue(null);
    const result = await consumePrivateApiRateLimit(
      new Request("https://nexafilm.example/api/private"),
      "user-123",
      { userScope: "test-user", userLimit: 5, ipScope: "test-ip", ipLimit: 10 },
    );

    expect(result).toMatchObject({ allowed: true, available: true });
    expect(mocks.consumeRateLimit).toHaveBeenCalledTimes(1);
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith("test-user", "user-123", 5, 60);
  });

  it("fails closed when rate-limit storage throws", async () => {
    mocks.consumeRateLimit.mockRejectedValue(new Error("isolated storage failure"));
    const result = await consumePrivateApiRateLimit(
      new Request("https://nexafilm.example/api/private"),
      "user-123",
      { userScope: "test-user", userLimit: 5, ipScope: "test-ip", ipLimit: 10 },
    );

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 60, available: false });
  });
});
