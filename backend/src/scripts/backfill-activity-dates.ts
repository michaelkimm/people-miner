/**
 * Backfill script to populate lastActivityAt for existing candidates
 *
 * Usage:
 *   npx ts-node src/scripts/backfill-activity-dates.ts
 *
 * This script:
 * 1. Finds candidates without lastActivityAt
 * 2. For each candidate, queries their repositories' pushedAt
 * 3. If repos have no pushedAt, fetches from GitHub API
 * 4. Updates candidate.lastActivityAt with the most recent date
 */

import { PrismaClient } from '@prisma/client';
import { Octokit } from '@octokit/rest';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const BATCH_SIZE = 50;
const RATE_LIMIT_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRepoPushedAt(
  username: string,
  repoName: string,
): Promise<Date | null> {
  try {
    const response = await octokit.repos.get({
      owner: username,
      repo: repoName,
    });
    return response.data.pushed_at ? new Date(response.data.pushed_at) : null;
  } catch (error) {
    console.warn(`Failed to fetch repo ${username}/${repoName}:`, error);
    return null;
  }
}

async function backfillCandidate(candidateId: string): Promise<boolean> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      repositories: {
        orderBy: { starCount: 'desc' },
        take: 10,
      },
    },
  });

  if (!candidate) {
    return false;
  }

  // First, check if any repos already have pushedAt
  const reposWithPushedAt = candidate.repositories.filter((r) => r.pushedAt);

  if (reposWithPushedAt.length > 0) {
    // Use existing pushedAt data
    const lastActivityAt = reposWithPushedAt
      .map((r) => r.pushedAt!)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { lastActivityAt },
    });

    console.log(
      `Updated ${candidate.githubUsername} from existing repo data: ${lastActivityAt.toISOString()}`,
    );
    return true;
  }

  // If no pushedAt data, fetch from GitHub API
  const pushedAtDates: Date[] = [];

  for (const repo of candidate.repositories) {
    await sleep(RATE_LIMIT_DELAY_MS);

    const pushedAt = await fetchRepoPushedAt(
      candidate.githubUsername,
      repo.name,
    );

    if (pushedAt) {
      pushedAtDates.push(pushedAt);

      // Update repo with pushedAt
      await prisma.repository.update({
        where: { id: repo.id },
        data: { pushedAt },
      });
    }
  }

  if (pushedAtDates.length > 0) {
    const lastActivityAt = pushedAtDates.sort(
      (a, b) => b.getTime() - a.getTime(),
    )[0];

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { lastActivityAt },
    });

    console.log(
      `Updated ${candidate.githubUsername} from GitHub API: ${lastActivityAt.toISOString()}`,
    );
    return true;
  }

  console.log(`No activity data found for ${candidate.githubUsername}`);
  return false;
}

async function main(): Promise<void> {
  console.log('Starting backfill of lastActivityAt...');

  // Find candidates without lastActivityAt
  const candidatesWithoutActivity = await prisma.candidate.findMany({
    where: { lastActivityAt: null },
    select: { id: true, githubUsername: true },
  });

  console.log(
    `Found ${candidatesWithoutActivity.length} candidates without lastActivityAt`,
  );

  let processed = 0;
  let updated = 0;

  for (let i = 0; i < candidatesWithoutActivity.length; i += BATCH_SIZE) {
    const batch = candidatesWithoutActivity.slice(i, i + BATCH_SIZE);

    for (const candidate of batch) {
      const success = await backfillCandidate(candidate.id);
      processed++;
      if (success) {
        updated++;
      }

      if (processed % 10 === 0) {
        console.log(`Progress: ${processed}/${candidatesWithoutActivity.length} (${updated} updated)`);
      }
    }

    // Check rate limit
    const rateLimit = await octokit.rateLimit.get();
    const remaining = rateLimit.data.rate.remaining;

    if (remaining < 100) {
      const resetAt = new Date(rateLimit.data.rate.reset * 1000);
      const waitMs = resetAt.getTime() - Date.now() + 1000;
      console.log(`Rate limit low (${remaining}). Waiting ${Math.round(waitMs / 1000)}s...`);
      await sleep(waitMs);
    }
  }

  console.log(`\nBackfill complete!`);
  console.log(`Total processed: ${processed}`);
  console.log(`Total updated: ${updated}`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
