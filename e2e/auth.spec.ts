import { expect, test } from "@playwright/test";
import { PrismaClient, Role, AuthProvider, ContentStatus, LicenseStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createOneTimeToken } from "../lib/security/tokens";

const prisma = new PrismaClient();
const testPassword = "MoviesHub-Test-Password-2026!";
let isolatedDatabaseValidated = false;

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
  isolatedDatabaseValidated = true;
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
  if (isolatedDatabaseValidated) {
    await prisma.user.deleteMany({ where: { email: { endsWith: "@movieshub-e2e.test" } } });
  }
  await prisma.$disconnect();
});

test("registration, login, logout and protected routes work on mobile", async ({ page }) => {
  const email = `register-${Date.now()}@movieshub-e2e.test`;
  await page.setViewportSize({ width: 390, height: 844 });
  const registerResponse = await page.goto("/auth/register");
  const securityHeaders = registerResponse?.headers() ?? {};
  expect(securityHeaders["x-content-type-options"]).toBe("nosniff");
  expect(securityHeaders["x-frame-options"]).toBe("DENY");
  expect(securityHeaders["referrer-policy"]).toBe("strict-origin-when-cross-origin");

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
  await page.locator('input[type="password"]').fill("Incorrect-Test-Password!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("alert")).toContainText("Email or password is incorrect");

  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/dashboard/);
  const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name.includes("session-token"));
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.sameSite).toBe("Lax");
  await expect(page.locator('header button[aria-label="Logout"]')).toBeVisible();
  const browserContext = page.context().browser();
  if (!browserContext) throw new Error("Browser context unavailable for concurrent-session test.");
  const concurrentContext = await browserContext.newContext({ storageState: await page.context().storageState() });
  const concurrentPage = await concurrentContext.newPage();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);

  await page.locator('header button[aria-label="Logout"]').click();
  await expect(page).toHaveURL("/");
  const revokedSession = await concurrentPage.request.get("/api/subscription/status");
  expect(revokedSession.status()).toBe(401);
  await concurrentContext.close();
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

  const expiredToken = createOneTimeToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: expiredToken.tokenHash, expiresAt: new Date(Date.now() - 60_000) },
  });
  const expiredResponse = await page.request.post("/api/auth/reset-password", {
    headers: { origin: "http://127.0.0.1:3000", "content-type": "application/json" },
    data: { token: expiredToken.token, password: "MoviesHub-New-Password-2026!" },
  });
  expect(expiredResponse.status()).toBe(400);

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

  const expiredToken = createOneTimeToken();
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: expiredToken.tokenHash, expiresAt: new Date(Date.now() - 60_000) },
  });
  const expiredResponse = await page.request.post("/api/auth/verify-email", {
    headers: { origin: "http://127.0.0.1:3000", "content-type": "application/json" },
    data: { token: expiredToken.token },
  });
  expect(expiredResponse.status()).toBe(400);

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
  expect(payload.user).not.toHaveProperty("passwordHash");
  expect(payload.user).not.toHaveProperty("passwordResetTokens");
  const created = await prisma.user.findUnique({ where: { id: payload.user.id }, select: { role: true } });
  expect(created?.role).toBe("USER");

  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(ordinary.email);
  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin access required" })).toBeVisible();
  const forbidden = await page.request.get("/api/admin/movies");
  expect(forbidden.status()).toBe(403);

  await page.locator('header button[aria-label="Logout"]').click();
  const adminEmail = `admin-${Date.now()}@movieshub-e2e.test`;
  await createUser(adminEmail, Role.ADMIN);
  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin · Movie Management" })).toBeVisible();
  const adminAccess = await page.request.get("/api/admin/movies");
  expect(adminAccess.status()).toBe(200);
  const adminBody = await adminAccess.json();
  expect(JSON.stringify(adminBody)).not.toContain("passwordHash");
  expect(JSON.stringify(adminBody)).not.toContain("tokenHash");
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

  const allowedSlug = `territory-allowed-${Date.now()}`;
  const allowedMovie = await prisma.movie.create({
    data: {
      titleEn: "E2E Territory Allowed",
      titleTa: "E2E Territory Allowed",
      slug: allowedSlug,
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
      allowedCountries: ["IN"],
      license: {
        create: {
          owner: "Test rights holder",
          status: LicenseStatus.ACTIVE,
          startDate: new Date(Date.now() - 60_000),
          expiryDate: new Date(Date.now() + 60_000),
          allowedCountries: ["IN"],
        },
      },
    },
    select: { id: true },
  });

  const response = await page.request.get("/api/movies", { headers: { "x-vercel-ip-country": "IN" } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.movies.some((item: { slug: string }) => item.slug === slug)).toBe(false);
  expect(body.movies.some((item: { slug: string }) => item.slug === allowedSlug)).toBe(true);

  const missingCountry = await page.request.get("/api/movies");
  expect(missingCountry.status()).toBe(503);
  const invalidCountry = await page.request.get("/api/movies", { headers: { "x-vercel-ip-country": "India" } });
  expect(invalidCountry.status()).toBe(503);

  await prisma.movie.deleteMany({ where: { id: { in: [movie.id, allowedMovie.id] } } });
});

test("watchlist ownership is derived from the authenticated user, not request fields", async ({ page }) => {
  const ownerEmail = `owner-${Date.now()}@movieshub-e2e.test`;
  const otherEmail = `other-${Date.now()}@movieshub-e2e.test`;
  const owner = await createUser(ownerEmail);
  const other = await createUser(otherEmail);
  const slug = `owner-only-${Date.now()}`;
  const movie = await prisma.movie.create({
    data: {
      titleEn: "Owner Isolation Test",
      titleTa: "Owner Isolation Test",
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
      allowedCountries: ["IN"],
      license: {
        create: {
          owner: "Test rights holder",
          status: LicenseStatus.ACTIVE,
          startDate: new Date(Date.now() - 60_000),
          expiryDate: new Date(Date.now() + 60_000),
          allowedCountries: ["IN"],
        },
      },
    },
    select: { id: true },
  });

  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(owner.email);
  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/dashboard/);

  const privateHeaders = {
    origin: "http://127.0.0.1:3000",
    "content-type": "application/json",
    "x-vercel-ip-country": "IN",
  };
  const saved = await page.request.post("/api/watchlist", {
    headers: privateHeaders,
    data: { slug, userId: other.id },
  });
  expect(saved.status()).toBe(201);
  const historySaved = await page.request.post("/api/watch-history", {
    headers: privateHeaders,
    data: { slug, progress: 50, userId: other.id },
  });
  expect(historySaved.status()).toBe(200);

  const ownerList = await page.request.get(`/api/watchlist?userId=${other.id}`, {
    headers: { "x-vercel-ip-country": "IN" },
  });
  expect(ownerList.status()).toBe(200);
  const ownerBody = await ownerList.json();
  expect(ownerBody.items.some((item: { movie: { slug: string } }) => item.movie.slug === slug)).toBe(true);
  const ownerHistory = await page.request.get(`/api/watch-history?userId=${other.id}`, {
    headers: { "x-vercel-ip-country": "IN" },
  });
  expect((await ownerHistory.json()).items.some((item: { movie: { slug: string } }) => item.movie.slug === slug)).toBe(true);

  await page.locator('header button[aria-label="Logout"]').click();
  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(other.email);
  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/dashboard/);

  const otherList = await page.request.get("/api/watchlist", {
    headers: { "x-vercel-ip-country": "IN" },
  });
  expect(otherList.status()).toBe(200);
  const otherBody = await otherList.json();
  expect(otherBody.items.some((item: { movie: { slug: string } }) => item.movie.slug === slug)).toBe(false);
  const otherHistory = await page.request.get("/api/watch-history", {
    headers: { "x-vercel-ip-country": "IN" },
  });
  expect((await otherHistory.json()).items.some((item: { movie: { slug: string } }) => item.movie.slug === slug)).toBe(false);

  await prisma.movie.delete({ where: { id: movie.id } });
});

test("password change invalidates the current session and permits the new password", async ({ page }) => {
  const email = `change-${Date.now()}@movieshub-e2e.test`;
  await createUser(email);

  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/auth/change-password");
  const fields = page.locator('input[type="password"]');
  await fields.nth(0).fill(testPassword);
  await fields.nth(1).fill("MoviesHub-Changed-Password-2026!");
  await fields.nth(2).fill("MoviesHub-Changed-Password-2026!");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL(/auth\/login/);

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("MoviesHub-Changed-Password-2026!");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/dashboard/);
});

test("verification resend uses the same response for known and unknown addresses", async ({ page }) => {
  const knownEmail = `resend-known-${Date.now()}@movieshub-e2e.test`;
  await createUser(knownEmail, Role.USER, false);
  const headers = { origin: "http://127.0.0.1:3000", "content-type": "application/json" };
  const known = await page.request.post("/api/auth/resend-verification", { headers, data: { email: knownEmail } });
  const unknown = await page.request.post("/api/auth/resend-verification", {
    headers,
    data: { email: `resend-unknown-${Date.now()}@movieshub-e2e.test` },
  });
  expect(known.status()).toBe(202);
  expect(unknown.status()).toBe(202);
  expect(await known.json()).toEqual(await unknown.json());
});

test("account suspension and deletion invalidate existing JWT sessions", async ({ page }) => {
  const bannedEmail = `banned-${Date.now()}@movieshub-e2e.test`;
  const bannedUser = await createUser(bannedEmail);
  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(bannedEmail);
  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await prisma.user.update({ where: { id: bannedUser.id }, data: { isBanned: true } });
  expect((await page.request.get("/api/subscription/status")).status()).toBe(401);

  const deletedEmail = `deleted-${Date.now()}@movieshub-e2e.test`;
  const deletedUser = await createUser(deletedEmail);
  await page.goto("/auth/login");
  await page.locator('input[type="email"]').fill(deletedEmail);
  await page.locator('input[type="password"]').fill(testPassword);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await prisma.user.delete({ where: { id: deletedUser.id } });
  expect((await page.request.get("/api/subscription/status")).status()).toBe(401);
});
