-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "hasTilRepo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tilRepoCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "longestProjectMonths" INTEGER NOT NULL DEFAULT 0;
