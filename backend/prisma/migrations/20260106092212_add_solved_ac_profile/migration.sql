-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "solvedAcScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "solved_ac_profiles" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "tierName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "solvedCount" INTEGER NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "classLevel" INTEGER NOT NULL DEFAULT 0,
    "classDecoration" TEXT,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "tagStats" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solved_ac_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solved_ac_profiles_candidateId_key" ON "solved_ac_profiles"("candidateId");

-- CreateIndex
CREATE INDEX "solved_ac_profiles_tier_idx" ON "solved_ac_profiles"("tier" DESC);

-- CreateIndex
CREATE INDEX "solved_ac_profiles_rating_idx" ON "solved_ac_profiles"("rating" DESC);

-- AddForeignKey
ALTER TABLE "solved_ac_profiles" ADD CONSTRAINT "solved_ac_profiles_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
