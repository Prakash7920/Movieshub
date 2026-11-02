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
4. Create a Neon database (or local PostgreSQL) and set `DATABASE_URL`.
5. Generate a strong secret and set `NEXTAUTH_SECRET` (at least 32 characters).
6. Set `NEXTAUTH_URL=http://localhost:3000`.
7. Run `npx prisma migrate deploy` after migrations are prepared, then `npm run dev`.

For local schema development, use `npm run prisma:migrate` and review/commit the generated migration.

## Vercel + Neon deployment

1. Import this GitHub repository into Vercel and select the `main` branch.
2. Create a Neon PostgreSQL project in a region close to the Vercel deployment region.
3. Copy Neon’s pooled connection string into Vercel's `DATABASE_URL` environment variable. Keep credentials private.
4. Add `NEXTAUTH_SECRET` using a secure random value of at least 32 characters.
5. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to the final HTTPS Vercel domain.
6. Add the same variables to Preview and Production environments as appropriate.
7. Deploy, then run the Prisma migrations against the production database using the deployment workflow or a trusted local environment.

Do not commit real environment values or paste secrets into chat.

## Authentication currently implemented

- Registration API validates input, normalizes email, hashes passwords with bcrypt, and stores users and their initial profile in PostgreSQL.
- Login uses NextAuth credentials with JWT sessions.
- A working database and the environment variables above are required; GitHub Pages static hosting cannot run these server APIs.

Google OAuth, password reset email delivery, payments, subscription enforcement, admin authorization, and secure video delivery are not yet enabled.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run prisma:generate`
- `npm run prisma:migrate`

## Legal and security notes

All movie metadata and media references are demo placeholders. Publish or stream only content with documented distribution rights. Keep private media behind an authorized backend and short-lived signed URLs; never expose private storage credentials or raw private media URLs.
