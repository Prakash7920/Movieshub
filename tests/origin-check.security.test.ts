import { afterEach, describe, expect, it, vi } from "vitest";
import { rejectCrossOriginRequest } from "../lib/security/origin-check";

const request = (headers: Record<string, string> = {}) =>
  new Request("https://nexafilm.example/api/watchlist", { method: "POST", headers });

describe("cookie-authenticated API origin validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows an exact configured application Origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "https://nexafilm.example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://nexafilm.example");
    expect(rejectCrossOriginRequest(request({ origin: "https://nexafilm.example" }))).toBeNull();
  });

  it("rejects an attacker-controlled Origin in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "https://nexafilm.example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://nexafilm.example");
    const response = rejectCrossOriginRequest(request({ origin: "https://nexafilm.example.attacker.test" }));
    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({ error: "Cross-origin request rejected." });
  });

  it("uses Referer origin when Origin is absent", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "https://nexafilm.example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://nexafilm.example");
    expect(rejectCrossOriginRequest(request({ referer: "https://nexafilm.example/dashboard" }))).toBeNull();
  });

  it("rejects missing Origin and Referer in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "https://nexafilm.example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://nexafilm.example");
    const response = rejectCrossOriginRequest(request());
    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({ error: "Request origin could not be verified." });
  });

  it("rejects malformed Origin values", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "https://nexafilm.example");
    expect(rejectCrossOriginRequest(request({ origin: "not-a-url" }))?.status).toBe(403);
  });

  it("allows requests without Origin metadata in local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(rejectCrossOriginRequest(request())).toBeNull();
  });

  it("allows configured localhost Origin during development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(rejectCrossOriginRequest(request({ origin: "http://localhost:3000" }))).toBeNull();
  });
});
