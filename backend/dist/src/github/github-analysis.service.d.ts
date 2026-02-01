import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimiterService } from './rate-limiter.service';
interface PullRequestInfo {
    title: string;
    url: string;
    number: number;
    state: string;
    repository: string;
    mergedAt: string | null;
    additions: number;
    deletions: number;
}
export interface RepoAnalysisResult {
    hasTests: boolean;
    testFramework: string | null;
    hasCI: boolean;
    ciPlatform: string | null;
    hasReadme: boolean;
    hasContributing: boolean;
    hasLicense: boolean;
    hasDocs: boolean;
    hasLinter: boolean;
    hasTypeCheck: boolean;
    hasDockerfile: boolean;
    conventionalCommitRatio: number | null;
    avgCommitMessageLength: number | null;
    totalCommits: number;
}
export declare class GitHubAnalysisService {
    private configService;
    private prisma;
    private rateLimiter;
    private readonly logger;
    private octokit;
    constructor(configService: ConfigService, prisma: PrismaService, rateLimiter: RateLimiterService);
    private waitForRateLimit;
    analyzeRepository(owner: string, repo: string): Promise<RepoAnalysisResult>;
    private getRepoTree;
    private getRecentCommits;
    private detectTests;
    private detectCI;
    private analyzeCommitMessages;
    findExternalContributions(username: string): Promise<PullRequestInfo[]>;
    analyzeAndSaveRepository(repositoryId: string): Promise<boolean>;
    syncCandidateOSSContributions(candidateId: string): Promise<number>;
    analyzeAllCandidateRepos(candidateId: string): Promise<number>;
}
export {};
