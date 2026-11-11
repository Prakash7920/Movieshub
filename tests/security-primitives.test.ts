import assert from "node:assert/strict";
import { test } from "node:test";
import { createOneTimeToken, hashOneTimeToken, isWellFormedOneTimeToken } from "../lib/security/tokens";
import { getClientIp } from "../lib/security/client-identity";
import { hasValidJsonContentType, isSameOriginRequest } from "../lib/security/request-guards";
import { getVercelViewerCountry } from "../lib/licensing/territory";
import { getSessionRevocationId } from "../lib/security/session-revocation";
import { parseBoundedPagination } from "../lib/security/pagination";

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
  // Vercel Preview hostnames are unique and intentionally differ from NEXTAUTH_URL.
  const previewOrigin = "https://nexafilm-preview-123.vercel.app";
  const previewRequest = new Request(`${previewOrigin}/api/auth/revoke-session`, {
    method: "POST",
    headers: { origin: previewOrigin },
  });
  // Next.js can expose an internal URL while preserving the browser-facing Host.
  const proxiedLocalRequest = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" },
  });
  const foreignHostRequest = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { origin: "http://attacker.example", host: "127.0.0.1:3000" },
  });
  const missingOrigin = new Request(`${expectedOrigin}/api/auth/register`, { method: "POST" });

  assert.equal(isSameOriginRequest(sameOrigin), true);
  assert.equal(isSameOriginRequest(sameOriginReferer), true);
  assert.equal(isSameOriginRequest(previewRequest), true);
  assert.equal(isSameOriginRequest(proxiedLocalRequest), true);
  assert.equal(isSameOriginRequest(foreignOrigin), false);
  assert.equal(isSameOriginRequest(foreignHostRequest), false);
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

test("session revocation IDs are stable and prefer the JWT identifier", () => {
  assert.equal(getSessionRevocationId({ sid: "stable-session" }), "sid:stable-session");
  assert.equal(getSessionRevocationId({ jti: "session-jti" }), "jti:session-jti");
  const first = getSessionRevocationId({ sub: "user-1", iat: 100, exp: 200 });
  const second = getSessionRevocationId({ sub: "user-1", iat: 100, exp: 200 });
  const different = getSessionRevocationId({ sub: "user-1", iat: 101, exp: 200 });
  assert.ok(first);
  assert.equal(first, second);
  assert.notEqual(first, different);
  assert.equal(getSessionRevocationId({ sub: "user-1" }), null);
});


test("private API pagination accepts bounded values and rejects unsafe offsets", () => {
  assert.deepEqual(parseBoundedPagination(new URLSearchParams()), {
    page: 1, pageSize: 20, skip: 0, take: 20,
  });
  assert.deepEqual(parseBoundedPagination(new URLSearchParams("page=100&pageSize=50")), {
    page: 100, pageSize: 50, skip: 4950, take: 50,
  });
  for (const query of ["page=101", "page=10000", "page=0", "page=-1", "page=1.5", "page=abc", "pageSize=51", "pageSize=0", "pageSize=1e2"]) {
    assert.equal(parseBoundedPagination(new URLSearchParams(query)), null, query);
  }
});
