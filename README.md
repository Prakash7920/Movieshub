# MoviesHub

MoviesHub is a legal OTT-style platform prototype for Indian-language cinema. The repository contains sample metadata only. Playback remains disabled until distribution rights and secure media delivery are verified.

## Stack

- Next.js App Router (Vercel server runtime)
- Neon PostgreSQL
- Prisma ORM
- NextAuth v4 credentials authentication
- bcrypt password hashing

## Local setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Create a Neon database (or local PostgreSQL) and set both `DATABASE_URL` (pooled runtime URL) and `DIRECT_URL` (direct migration URL).
5. Generate a strong secret and set `NEXTAUTH_SECRET` (at least 32 characters).
6. Set `NEXTAUTH_URL=http://localhost:3000` and `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
7. Run `npx prisma migrate deploy` against a development database, then `npm run dev`.

For local schema development, use `npm run prisma:migrate` and review/commit the generated migration.

## Vercel + Neon deployment

1. Import this GitHub repository into Vercel and select the `main` branch.
2. Create a Neon PostgreSQL project in a region close to the Vercel deployment region.
3. Set Neon’s pooled connection string as `DATABASE_URL` and its direct connection string as `DIRECT_URL`. Keep credentials private.
4. Add `NEXTAUTH_SECRET` using a secure random value of at least 32 characters. Optionally set a separate `RATE_LIMIT_SECRET` (also at least 32 characters); otherwise the limiter derives keys from `NEXTAUTH_SECRET`.
5. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to the final HTTPS Vercel domain.
6. Configure `RESEND_API_KEY` and a verified-domain `RESEND_FROM_EMAIL` before relying on password reset or verification email delivery.
7. Set `REQUIRE_EMAIL_VERIFICATION=false` initially. Enable it only after existing accounts have a reviewed verification/backfill plan.
8. Add the variables to Preview and Production environments as appropriate. Validate migrations on staging and confirm a current backup before production deployment.

Do not commit real environment values or paste secrets into chat.

## Authentication and security

- Registration uses server-side Zod validation, bcrypt password hashing, and database-backed throttling.
- Login uses NextAuth Credentials with JWT sessions, secure production cookies, account-state checks, and shared throttling.
- Password reset uses cryptographically random tokens, SHA-256 token hashes, 30-minute expiry, single-use claims, and password-change session invalidation.
- Email verification uses hashed, expiring, single-use tokens. Verification is optional for sign-in until `REQUIRE_EMAIL_VERIFICATION=true` is explicitly enabled after an account migration/communication plan.
- Password reset and verification email delivery require a Resend API key and a sender address verified with Resend. The Resend test sender is not a production sender.
- PostgreSQL-backed rate limits are shared across application instances; HMAC-derived identifiers are stored instead of raw email/IP values.
- A working database and the environment variables above are required; GitHub Pages static hosting cannot run these server APIs.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run test`
- `npm run test:integration` (requires a migrated test database)
- `npm run prisma:generate`
- `npm run prisma:migrate`

## Database operations and backups

The Vercel build command runs `prisma migrate deploy`. Validate each migration against staging and confirm a recent encrypted Neon backup/PITR recovery point before production deployment. Do not use `prisma migrate reset` or destructive schema commands against production. The application repository cannot verify Neon backup retention or execute a production restore; those remain operator checks.

## Legal and security notes

All movie metadata and media references are demo placeholders. Publish or stream only content with documented distribution rights. Keep private media behind an authorized backend and short-lived signed URLs; never expose private storage credentials or raw private media URLs.
