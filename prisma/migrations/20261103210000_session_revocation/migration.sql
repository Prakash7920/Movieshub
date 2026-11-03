CREATE TABLE "RevokedSessionToken" (
  "id" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevokedSessionToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RevokedSessionToken_tokenId_key" ON "RevokedSessionToken"("tokenId");
CREATE INDEX "RevokedSessionToken_userId_idx" ON "RevokedSessionToken"("userId");
CREATE INDEX "RevokedSessionToken_expiresAt_idx" ON "RevokedSessionToken"("expiresAt");

ALTER TABLE "RevokedSessionToken"
  ADD CONSTRAINT "RevokedSessionToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
