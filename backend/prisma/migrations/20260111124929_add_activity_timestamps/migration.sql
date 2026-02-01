-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "lastActivityAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "pushedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "candidates_lastActivityAt_idx" ON "candidates"("lastActivityAt" DESC);
