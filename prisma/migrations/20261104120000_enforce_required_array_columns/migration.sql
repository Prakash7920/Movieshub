-- Align PostgreSQL nullability with Prisma's required String[] fields.
-- Preflight on the isolated Preview database confirmed zero NULL values
-- in all four columns. This migration intentionally does not touch Production.

ALTER TABLE "Movie"
  ALTER COLUMN "audioLanguages" SET NOT NULL,
  ALTER COLUMN "subtitleLanguages" SET NOT NULL,
  ALTER COLUMN "allowedCountries" SET NOT NULL;

ALTER TABLE "License"
  ALTER COLUMN "allowedCountries" SET NOT NULL;
