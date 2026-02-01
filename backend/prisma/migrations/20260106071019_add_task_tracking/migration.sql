-- AlterTable
ALTER TABLE "crawl_jobs" ADD COLUMN     "completedTasks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTasks" INTEGER NOT NULL DEFAULT 0;
