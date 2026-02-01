-- CreateTable
CREATE TABLE "repo_analyses" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "hasTests" BOOLEAN NOT NULL DEFAULT false,
    "testFramework" TEXT,
    "hasCI" BOOLEAN NOT NULL DEFAULT false,
    "ciPlatform" TEXT,
    "hasReadme" BOOLEAN NOT NULL DEFAULT false,
    "hasContributing" BOOLEAN NOT NULL DEFAULT false,
    "hasLicense" BOOLEAN NOT NULL DEFAULT false,
    "hasDocs" BOOLEAN NOT NULL DEFAULT false,
    "hasLinter" BOOLEAN NOT NULL DEFAULT false,
    "hasTypeCheck" BOOLEAN NOT NULL DEFAULT false,
    "hasDockerfile" BOOLEAN NOT NULL DEFAULT false,
    "conventionalCommitRatio" DOUBLE PRECISION,
    "avgCommitMessageLength" INTEGER,
    "totalCommits" INTEGER NOT NULL DEFAULT 0,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repo_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oss_contributions" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "externalRepo" TEXT NOT NULL,
    "prTitle" TEXT NOT NULL,
    "prUrl" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "mergedAt" TIMESTAMP(3),
    "state" TEXT NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "isSignificant" BOOLEAN NOT NULL DEFAULT false,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oss_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repo_analyses_repositoryId_key" ON "repo_analyses"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "oss_contributions_prUrl_key" ON "oss_contributions"("prUrl");

-- CreateIndex
CREATE INDEX "oss_contributions_candidateId_idx" ON "oss_contributions"("candidateId");

-- AddForeignKey
ALTER TABLE "repo_analyses" ADD CONSTRAINT "repo_analyses_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oss_contributions" ADD CONSTRAINT "oss_contributions_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
