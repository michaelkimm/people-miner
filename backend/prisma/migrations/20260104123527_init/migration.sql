-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('GITHUB_ORG', 'TECH_BLOG', 'PERSONAL_BLOG', 'COMMUNITY', 'DEV_EVENT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "githubUsername" TEXT NOT NULL,
    "githubId" INTEGER,
    "name" TEXT,
    "email" TEXT,
    "bio" TEXT,
    "company" TEXT,
    "location" TEXT,
    "blog" TEXT,
    "avatarUrl" TEXT,
    "publicRepos" INTEGER NOT NULL DEFAULT 0,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "totalCommits" INTEGER NOT NULL DEFAULT 0,
    "readabilityScore" DOUBLE PRECISION,
    "problemSolvingScore" DOUBLE PRECISION,
    "cleanCodeScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "crawledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scoredAt" TIMESTAMP(3),

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_sources" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT,
    "starCount" INTEGER NOT NULL DEFAULT 0,
    "forkCount" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3),

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "config" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCrawled" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawl_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_jobs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "candidatesFound" INTEGER NOT NULL DEFAULT 0,
    "candidatesNew" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawl_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidates_githubUsername_key" ON "candidates"("githubUsername");

-- CreateIndex
CREATE INDEX "candidates_totalScore_idx" ON "candidates"("totalScore" DESC);

-- CreateIndex
CREATE INDEX "candidates_crawledAt_idx" ON "candidates"("crawledAt");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_sources_candidateId_sourceType_sourceName_key" ON "candidate_sources"("candidateId", "sourceType", "sourceName");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_candidateId_fullName_key" ON "repositories"("candidateId", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "crawl_sources_name_key" ON "crawl_sources"("name");

-- CreateIndex
CREATE INDEX "crawl_jobs_status_idx" ON "crawl_jobs"("status");

-- CreateIndex
CREATE INDEX "crawl_jobs_createdAt_idx" ON "crawl_jobs"("createdAt");

-- AddForeignKey
ALTER TABLE "candidate_sources" ADD CONSTRAINT "candidate_sources_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
