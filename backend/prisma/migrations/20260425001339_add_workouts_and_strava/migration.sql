-- AlterTable
ALTER TABLE "User" ADD COLUMN "stravaAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "stravaAthleteId" TEXT;
ALTER TABLE "User" ADD COLUMN "stravaConnectedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "stravaExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "stravaLastSyncAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "stravaRefreshToken" TEXT;

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'RUN',
    "name" TEXT,
    "startedAt" DATETIME NOT NULL,
    "distanceMeters" INTEGER NOT NULL DEFAULT 0,
    "movingSeconds" INTEGER NOT NULL DEFAULT 0,
    "elevationGain" REAL,
    "averageHeartRate" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Workout_userId_startedAt_idx" ON "Workout"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workout_userId_source_externalId_key" ON "Workout"("userId", "source", "externalId");
