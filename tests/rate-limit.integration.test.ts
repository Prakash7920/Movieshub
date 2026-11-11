import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { consumeRateLimit } from "../lib/security/rate-limit";
import { consumePrivateApiRateLimit } from "../lib/security/private-api-rate-limit";

const prisma = new PrismaClient();
let testKeys: string[] = [];

before(async () => {
  if (process.env.MOVIESHUB_E2E !== "true") {
    throw new Error("Database integration tests require MOVIESHUB_E2E=true.");
  }
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required.");
  const databaseUrl = new URL(raw);
  if (!["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname) ||
      !databaseUrl.pathname.includes("movieshub_test")) {
    throw new Error("Database integration tests may only use the isolated movieshub_test database.");
  }
  await prisma.$connect();
});

after(async () => {
  if (testKeys.length) await prisma.rateLimitBucket.deleteMany({ where: { key: { in: testKeys } } });
  await prisma.$disconnect();
});

test("rate limits are atomic and shared across concurrent requests", async () => {
  const scope = "integration-test";
  const identifier = randomUUID();
  const secret = process.env.RATE_LIMIT_SECRET || process.env.NEXTAUTH_SECRET;
  assert.ok(secret && secret.length >= 32);
  testKeys.push(createHmac("sha256", secret).update(`${scope}:${identifier}`).digest("hex"));

  const results = await Promise.all(
    Array.from({ length: 8 }, () => consumeRateLimit(scope, identifier, 3, 60)),
  );

  assert.equal(results.filter((result) => result.allowed).length, 3);
  assert.equal(results.filter((result) => !result.allowed).length, 5);
});


test("private API limiter enforces both authenticated-user and client-IP buckets", async () => {
  const userId = randomUUID();
  const ip = "203.0.113.77";
  const userScope = "integration-private-user";
  const ipScope = "integration-private-ip";
  const secret = process.env.RATE_LIMIT_SECRET || process.env.NEXTAUTH_SECRET;
  assert.ok(secret && secret.length >= 32);
  testKeys.push(
    createHmac("sha256", secret).update(`${userScope}:${userId}`).digest("hex"),
    createHmac("sha256", secret).update(`${ipScope}:${ip}`).digest("hex"),
  );

  const request = new Request("https://nexafilm.example/api/private", {
    headers: { "x-real-ip": ip },
  });
  const options = { userScope, userLimit: 5, ipScope, ipLimit: 1, windowSeconds: 60 };

  const first = await consumePrivateApiRateLimit(request, userId, options);
  const second = await consumePrivateApiRateLimit(request, userId, options);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
  assert.ok(second.retryAfterSeconds >= 1);
});
