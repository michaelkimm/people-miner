import { PrismaService } from '../prisma/prisma.service';
export interface SolvedAcUser {
    handle: string;
    bio: string | null;
    organizations: SolvedAcOrganization[];
    tier: number;
    rating: number;
    ratingByProblemsSum: number;
    ratingByClass: number;
    ratingBySolvedCount: number;
    ratingByVoteCount: number;
    class: number;
    classDecoration: 'none' | 'silver' | 'gold';
    solvedCount: number;
    voteCount: number;
    exp: number;
    rank: number;
    maxStreak: number;
    prolesRank: number | null;
}
export interface SolvedAcOrganization {
    organizationId: number;
    name: string;
    type: string;
    rating: number;
    userCount: number;
    voteCount: number;
    solvedCount: number;
    color: string;
}
export interface SolvedAcTagStat {
    tag: {
        key: string;
        displayNames: Array<{
            language: string;
            name: string;
            short: string;
        }>;
    };
    solved: number;
    partial: number;
    tried: number;
}
export interface SolvedAcProblemTag {
    key: string;
    solved: number;
}
export declare class SolvedAcService {
    private prisma;
    private readonly logger;
    private readonly API_BASE;
    private lastRequestTime;
    private readonly MIN_REQUEST_INTERVAL_MS;
    private rateLimitResetTime;
    constructor(prisma: PrismaService);
    private waitForRateLimit;
    private handleRateLimitResponse;
    getUserProfile(handle: string): Promise<SolvedAcUser | null>;
    getUserTagStats(handle: string): Promise<SolvedAcProblemTag[]>;
    getTierName(tier: number): string;
    extractSolvedAcHandle(bio: string | null, blog: string | null): string | null;
    fetchAndSaveProfile(candidateId: string, handle: string): Promise<boolean>;
    syncCandidateSolvedAc(candidateId: string): Promise<boolean>;
    syncAllCandidates(options?: {
        force?: boolean;
        limit?: number;
    }): Promise<{
        synced: number;
        failed: number;
        skipped: number;
    }>;
}
