import { expect, test } from "@playwright/test";
import { PrismaClient, Role, AuthProvider, ContentStatus, LicenseStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createOneTimeToken } from "../lib/security/tokens";

const prisma = new PrismaClient();
const testPassword = "MoviesHub-Test-Password-2026!";

function requireIsolatedTestDatabase() {
  if (process.env.MOVIESHUB_E2E !== "true") {
    throw new Error("E2E tests require MOVIESHUB_E2E=true.");
  }
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required for E2E tests.");
  const databaseUrl = new URL(raw);
  if (!["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname) ||
      !databaseUrl.pathname.includes("movieshub_test")) {
    throw new Error("E2E tests may only run against the isolated local movieshub_test database.");
  }
}

async function createUser(email: string, role: Role = Role.USER, isEmailVerified = true) {
  const passwordHash = await bcrypt.hash(testPassword, 4);
  return prisma.user.create({
    data: {
      email,
      name: "MoviesHub E2E",
      passwordHash,
      provider: AuthProvider.CREDENTIALS,
      role,
      isEmailVerified,
    },
    select: { id: true, email: true },
  });
}

test.beforeAll(async () => {
  requireIsolatedTestDatabase();
  await prisma.$connect();
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: "@movieshub-e2e.test" } } });
  await prisma.$disconnect();
});

test("registration, login, logout and protected routes work on mobile", async ({ page }) => {
  const email = `register-${Date.now()}@movieshub-e2e.test`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth/register");

  const inputs = page.locator("form input");
  await inputs.nth(0).fill("E2E User");
  await inputs.nth(1).fill(email);
  await inputs.nth(2).fill(testPassword);
  await inputs.nth(3).fill(testPassword);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("status")).toContainText("Account created");
  await expect.poll(async () => {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    return user?.role;
  }).toBe("USER");

  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('header button[aria-label="Logout"]')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);

  await page.locator('header button[aria-label="Logout"]').click();
  await expect(page).toHaveURL("/");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/auth\/login/);
});

test("password reset is single-use and invalidates the previous JWT", async ({ page }) => {
  const email = `reset-${Date.now()}@movieshub-e2e.test`;
  const user = await createUser(email);
  const oneTimeToken = createOneTimeToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: oneTimeToken.tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
  });

  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto(`/auth/reset-password?token=${oneTimeToken.token}`);
  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill("MoviesHub-New-Password-2026!");
  await passwordInputs.nth(1).fill("MoviesHub-New-Password-2026!");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status")).toContainText("Password updated");

  const oldSessionResponse = await page.request.get("/api/subscription/status");
  expect(oldSessionResponse.status()).toBe(401);

  const replayResponse = await page.request.post("/api/auth/reset-password", {
    headers: { origin: "http://127.0.0.1:3000", "content-type": "application/json" },
    data: { token: oneTimeToken.token, password: "MoviesHub-Another-Password!" },
  });
  expect(replayResponse.status()).toBe(400);

  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("MoviesHub-New-Password-2026!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/dashboard/);
});

test("email verification is expiring-token based and single-use", async ({ page }) => {
  const email = `verify-${Date.now()}@movieshub-e2e.test`;
  const user = await createUser(email, Role.USER, false);
  const oneTimeToken = createOneTimeToken();
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: oneTimeToken.tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });

  await page.goto(`/auth/verify-email?token=${oneTimeToken.token}`);
  await expect(page.getByRole("status")).toContainText("verified");
  const saved = await prisma.user.findUnique({ where: { id: user.id }, select: { isEmailVerified: true } });
  expect(saved?.isEmailVerified).toBe(true);

  await page.goto(`/auth/verify-email?token=${oneTimeToken.token}`);
  await expect(page.getByRole("alert")).toContainText("already used");
});

test("admin APIs reject anonymous and ordinary users, and ignore role escalation at registration", async ({ page, request }) => {
  const anonymous = await request.get("/api/admin/movies");
  expect(anonymous.status()).toBe(401);

  const userEmail = `ordinary-${Date.now()}@movieshub-e2e.test`;
  const ordinary = await createUser(userEmail);
  const response = await page.request.post("/api/auth/register", {
    headers: { origin: "http://127.0.0.1:3000", "content-type": "application/json" },
    data: { name: "Escalation", email: `escalation-${Date.now()}@movieshub-e2e.test`, password: testPassword, confirmPassword: testPassword, role: "ADMIN" },
  });
  expect(response.status()).toBe(201);
  const payload = await response.json();
  const created = await prisma.user.findUnique({ where: { id: payload.user.id }, select: { role: true } });
  expect(created?.role).toBe("USER");

  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(ordinary.email);
  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/dashboard/);
  const forbidden = await page.request.get("/api/admin/movies");
  expect(forbidden.status()).toBe(403);
});

test("territory restrictions fail closed and exclude non-permitted movies", async ({ page }) => {
  const user = await createUser(`territory-${Date.now()}@movieshub-e2e.test`);
  const slug = `territory-test-${Date.now()}`;
  const movie = await prisma.movie.create({
    data: {
      titleEn: "E2E Territory Test",
      titleTa: "E2E Territory Test",
      slug,
      descriptionEn: "Test metadata",
      descriptionTa: "Test metadata",
      posterUrl: "https://example.com/poster.jpg",
      backdropUrl: "https://example.com/backdrop.jpg",
      language: "en",
      audioLanguages: ["en"],
      subtitleLanguages: ["en"],
      releaseYear: 2026,
      runtimeMinutes: 90,
      ageRating: "U",
      isPublished: true,
      contentStatus: ContentStatus.PUBLISHED,
      allowedCountries: ["US"],
      license: {
        create: {
          owner: "Test rights holder",
          status: LicenseStatus.ACTIVE,
          startDate: new Date(Date.now() - 60_000),
          expiryDate: new Date(Date.now() + 60_000),
          allowedCountries: ["US"],
        },
      },
    },
    select: { id: true },
  });

  const response = await page.request.get("/api/movies", { headers: { "x-vercel-ip-country": "IN" } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.movies.some((item: { slug: string }) => item.slug === slug)).toBe(false);

  const failClosed = await page.request.get("/api/movies", { headers: { "x-vercel-ip-country": "India" } });
  expect(failClosed.status()).toBe(503);

  await prisma.movie.delete({ where: { id: movie.id } });
});
