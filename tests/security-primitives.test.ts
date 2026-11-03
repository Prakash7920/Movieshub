import assert from "node:assert/strict";
import { test } from "node:test";
import { createOneTimeToken, hashOneTimeToken, isWellFormedOneTimeToken } from "../lib/security/tokens";
import { getClientIp } from "../lib/security/client-identity";
import { hasValidJsonContentType, isSameOriginRequest } from "../lib/security/request-guards";
import { getVercelViewerCountry } from "../lib/licensing/territory";

test("one-time tokens are cryptographically random, fixed-length and hashable", () => {
  const first = createOneTimeToken();
  const second = createOneTimeToken();

  assert.equal(first.token.length, 64);
  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, hashOneTimeToken(first.token));
  assert.notEqual(first.tokenHash, first.token);
  assert.equal(isWellFormedOneTimeToken(first.token), true);
  assert.equal(isWellFormedOneTimeToken(first.token + "0"), false);
  assert.equal(isWellFormedOneTimeToken("not-a-token"), false);
  assert.equal(isWellFormedOneTimeToken(null), false);
});

test("client IP extraction prefers the proxy real-IP header", () => {
  const headers = new Headers({
    "x-real-ip": "203.0.113.10",
    "x-forwarded-for": "198.51.100.5, 203.0.113.11",
  });
  assert.equal(getClientIp(headers), "203.0.113.10");
});

test("client IP extraction uses the final forwarded hop as a fallback", () => {
  assert.equal(
    getClientIp({ "X-Forwarded-For": "198.51.100.5, 203.0.113.11" }),
    "203.0.113.11",
  );
  assert.equal(getClientIp({}), null);
});

test("state-changing API requests require a same-origin source", () => {
  const expectedOrigin = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).origin
    : process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : "https://movieshub.example";
  const sameOrigin = new Request(`${expectedOrigin}/api/auth/register`, {
    method: "POST",
    headers: { origin: expectedOrigin },
  });
  const sameOriginReferer = new Request(`${expectedOrigin}/api/auth/register`, {
    method: "POST",
    headers: { referer: `${expectedOrigin}/auth/register` },
  });
  const foreignOrigin = new Request(`${expectedOrigin}/api/auth/register`, {
    method: "POST",
    headers: { origin: "https://attacker.example" },
  });
  const missingOrigin = new Request(`${expectedOrigin}/api/auth/register`, { method: "POST" });

  assert.equal(isSameOriginRequest(sameOrigin), true);
  assert.equal(isSameOriginRequest(sameOriginReferer), true);
  assert.equal(isSameOriginRequest(foreignOrigin), false);
  assert.equal(isSameOriginRequest(missingOrigin), false);
});

test("JSON content type and actual body size are enforced", async () => {
  const valid = new Request("https://movieshub.example/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  const wrongType = new Request("https://movieshub.example/api", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "{}",
  });
  const oversized = new Request("https://movieshub.example/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "x".repeat(17 * 1024),
  });

  assert.equal(await hasValidJsonContentType(valid), true);
  assert.equal(await hasValidJsonContentType(wrongType), false);
  assert.equal(await hasValidJsonContentType(oversized), false);
});

test("territory resolver normalizes valid proxy country codes and fails closed", () => {
  assert.equal(getVercelViewerCountry(new Headers({ "x-vercel-ip-country": "in" })), "IN");
  assert.equal(getVercelViewerCountry(new Headers({ "x-vercel-ip-country": "US" })), "US");
  assert.equal(getVercelViewerCountry(new Headers({ "x-vercel-ip-country": "India" })), null);
  assert.equal(getVercelViewerCountry(new Headers()), null);
});
