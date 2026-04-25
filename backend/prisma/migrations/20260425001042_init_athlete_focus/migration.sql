-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'corredor',
    "phone" TEXT,
    "document" TEXT,
    "birthDate" DATETIME,
    "slug" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "uf" TEXT,
    "publicProfile" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "raceCatalogId" TEXT,
    "raceName" TEXT NOT NULL,
    "raceDate" DATETIME NOT NULL,
    "raceCity" TEXT,
    "raceUf" TEXT,
    "distanceMeters" INTEGER NOT NULL,
    "netTimeSeconds" INTEGER NOT NULL,
    "grossTimeSeconds" INTEGER,
    "generalRank" INTEGER,
    "categoryName" TEXT,
    "categoryRank" INTEGER,
    "certificateUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Result_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");

-- CreateIndex
CREATE INDEX "Result_userId_raceDate_idx" ON "Result"("userId", "raceDate");

-- CreateIndex
CREATE INDEX "Result_userId_distanceMeters_idx" ON "Result"("userId", "distanceMeters");
