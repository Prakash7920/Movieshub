import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { consumeRateLimit } from "../lib/security/rate-limit";

const prisma = new PrismaClient();
let testKey: string | null = null;

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
  if (testKey) await prisma.rateLimitBucket.deleteMany({ where: { key: testKey } });
  await prisma.$disconnect();
});

test("rate limits are atomic and shared across concurrent requests", async () => {
  const scope = "integration-test";
  const identifier = randomUUID();
  const secret = process.env.RATE_LIMIT_SECRET || process.env.NEXTAUTH_SECRET;
  assert.ok(secret && secret.length >= 32);
  testKey = createHmac("sha256", secret).update(`${scope}:${identifier}`).digest("hex");

  const results = await Promise.all(
    Array.from({ length: 8 }, () => consumeRateLimit(scope, identifier, 3, 60)),
  );

  assert.equal(results.filter((result) => result.allowed).length, 3);
  assert.equal(results.filter((result) => !result.allowed).length, 5);
});
