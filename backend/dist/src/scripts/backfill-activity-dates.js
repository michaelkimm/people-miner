"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const rest_1 = require("@octokit/rest");
const dotenv = require("dotenv");
dotenv.config();
const prisma = new client_1.PrismaClient();
const octokit = new rest_1.Octokit({
    auth: process.env.GITHUB_TOKEN,
});
const BATCH_SIZE = 50;
const RATE_LIMIT_DELAY_MS = 1000;
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function fetchRepoPushedAt(username, repoName) {
    try {
        const response = await octokit.repos.get({
            owner: username,
            repo: repoName,
        });
        return response.data.pushed_at ? new Date(response.data.pushed_at) : null;
    }
    catch (error) {
        console.warn(`Failed to fetch repo ${username}/${repoName}:`, error);
        return null;
    }
}
async function backfillCandidate(candidateId) {
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
    const reposWithPushedAt = candidate.repositories.filter((r) => r.pushedAt);
    if (reposWithPushedAt.length > 0) {
        const lastActivityAt = reposWithPushedAt
            .map((r) => r.pushedAt)
            .sort((a, b) => b.getTime() - a.getTime())[0];
        await prisma.candidate.update({
            where: { id: candidateId },
            data: { lastActivityAt },
        });
        console.log(`Updated ${candidate.githubUsername} from existing repo data: ${lastActivityAt.toISOString()}`);
        return true;
    }
    const pushedAtDates = [];
    for (const repo of candidate.repositories) {
        await sleep(RATE_LIMIT_DELAY_MS);
        const pushedAt = await fetchRepoPushedAt(candidate.githubUsername, repo.name);
        if (pushedAt) {
            pushedAtDates.push(pushedAt);
            await prisma.repository.update({
                where: { id: repo.id },
                data: { pushedAt },
            });
        }
    }
    if (pushedAtDates.length > 0) {
        const lastActivityAt = pushedAtDates.sort((a, b) => b.getTime() - a.getTime())[0];
        await prisma.candidate.update({
            where: { id: candidateId },
            data: { lastActivityAt },
        });
        console.log(`Updated ${candidate.githubUsername} from GitHub API: ${lastActivityAt.toISOString()}`);
        return true;
    }
    console.log(`No activity data found for ${candidate.githubUsername}`);
    return false;
}
async function main() {
    console.log('Starting backfill of lastActivityAt...');
    const candidatesWithoutActivity = await prisma.candidate.findMany({
        where: { lastActivityAt: null },
        select: { id: true, githubUsername: true },
    });
    console.log(`Found ${candidatesWithoutActivity.length} candidates without lastActivityAt`);
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
//# sourceMappingURL=backfill-activity-dates.js.map