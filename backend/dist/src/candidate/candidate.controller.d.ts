import { CandidateService } from './candidate.service';
import { RejectionService } from '../rejection/rejection.service';
import { RejectCandidateDto } from '../rejection/dto/feedback.dto';
import { TargetRole } from '../config/tech-stack.config';
export declare class CandidateController {
    private candidateService;
    private rejectionService;
    constructor(candidateService: CandidateService, rejectionService: RejectionService);
    findAll(page?: string, limit?: string, sortBy?: 'totalScore' | 'followers' | 'crawledAt', order?: 'asc' | 'desc', search?: string, source?: string, minScore?: string, maxScore?: string, excludeRejected?: string, autoExclude?: string, role?: TargetRole, recentActivityOnly?: string, activityMonths?: string): Promise<{
        data: ({
            sources: {
                id: string;
                candidateId: string;
                discoveredAt: Date;
                sourceName: string;
                sourceType: import(".prisma/client").$Enums.SourceType;
                sourceUrl: string | null;
            }[];
            repositories: {
                id: string;
                name: string;
                candidateId: string;
                fullName: string;
                description: string | null;
                language: string | null;
                starCount: number;
                forkCount: number;
                url: string;
                pushedAt: Date | null;
                analyzedAt: Date | null;
            }[];
            solvedAcProfile: {
                id: string;
                updatedAt: Date;
                candidateId: string;
                handle: string;
                tier: number;
                tierName: string;
                rating: number;
                solvedCount: number;
                voteCount: number;
                classLevel: number;
                classDecoration: string | null;
                maxStreak: number;
                rank: number | null;
                tagStats: import("@prisma/client/runtime/library").JsonValue | null;
                fetchedAt: Date;
            } | null;
        } & {
            id: string;
            githubUsername: string;
            githubId: number | null;
            name: string | null;
            email: string | null;
            bio: string | null;
            company: string | null;
            location: string | null;
            blog: string | null;
            avatarUrl: string | null;
            publicRepos: number;
            followers: number;
            following: number;
            totalCommits: number;
            readabilityScore: number | null;
            problemSolvingScore: number | null;
            cleanCodeScore: number | null;
            solvedAcScore: number | null;
            totalScore: number | null;
            hasTilRepo: boolean;
            tilRepoCount: number;
            longestProjectMonths: number;
            status: import(".prisma/client").$Enums.CandidateStatus;
            crawledAt: Date;
            updatedAt: Date;
            scoredAt: Date | null;
            lastActivityAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getStats(): Promise<{
        total: number;
        withScore: number;
        recentlyAdded: number;
        topCandidates: {
            id: string;
            githubUsername: string;
            name: string | null;
            company: string | null;
            avatarUrl: string | null;
            totalScore: number | null;
        }[];
    }>;
    getSources(): Promise<{
        name: string;
        count: number;
    }[]>;
    findOne(id: string): Promise<({
        sources: {
            id: string;
            candidateId: string;
            discoveredAt: Date;
            sourceName: string;
            sourceType: import(".prisma/client").$Enums.SourceType;
            sourceUrl: string | null;
        }[];
        repositories: {
            id: string;
            name: string;
            candidateId: string;
            fullName: string;
            description: string | null;
            language: string | null;
            starCount: number;
            forkCount: number;
            url: string;
            pushedAt: Date | null;
            analyzedAt: Date | null;
        }[];
        solvedAcProfile: {
            id: string;
            updatedAt: Date;
            candidateId: string;
            handle: string;
            tier: number;
            tierName: string;
            rating: number;
            solvedCount: number;
            voteCount: number;
            classLevel: number;
            classDecoration: string | null;
            maxStreak: number;
            rank: number | null;
            tagStats: import("@prisma/client/runtime/library").JsonValue | null;
            fetchedAt: Date;
        } | null;
    } & {
        id: string;
        githubUsername: string;
        githubId: number | null;
        name: string | null;
        email: string | null;
        bio: string | null;
        company: string | null;
        location: string | null;
        blog: string | null;
        avatarUrl: string | null;
        publicRepos: number;
        followers: number;
        following: number;
        totalCommits: number;
        readabilityScore: number | null;
        problemSolvingScore: number | null;
        cleanCodeScore: number | null;
        solvedAcScore: number | null;
        totalScore: number | null;
        hasTilRepo: boolean;
        tilRepoCount: number;
        longestProjectMonths: number;
        status: import(".prisma/client").$Enums.CandidateStatus;
        crawledAt: Date;
        updatedAt: Date;
        scoredAt: Date | null;
        lastActivityAt: Date | null;
    }) | null>;
    findByUsername(username: string): Promise<({
        sources: {
            id: string;
            candidateId: string;
            discoveredAt: Date;
            sourceName: string;
            sourceType: import(".prisma/client").$Enums.SourceType;
            sourceUrl: string | null;
        }[];
        repositories: {
            id: string;
            name: string;
            candidateId: string;
            fullName: string;
            description: string | null;
            language: string | null;
            starCount: number;
            forkCount: number;
            url: string;
            pushedAt: Date | null;
            analyzedAt: Date | null;
        }[];
        solvedAcProfile: {
            id: string;
            updatedAt: Date;
            candidateId: string;
            handle: string;
            tier: number;
            tierName: string;
            rating: number;
            solvedCount: number;
            voteCount: number;
            classLevel: number;
            classDecoration: string | null;
            maxStreak: number;
            rank: number | null;
            tagStats: import("@prisma/client/runtime/library").JsonValue | null;
            fetchedAt: Date;
        } | null;
    } & {
        id: string;
        githubUsername: string;
        githubId: number | null;
        name: string | null;
        email: string | null;
        bio: string | null;
        company: string | null;
        location: string | null;
        blog: string | null;
        avatarUrl: string | null;
        publicRepos: number;
        followers: number;
        following: number;
        totalCommits: number;
        readabilityScore: number | null;
        problemSolvingScore: number | null;
        cleanCodeScore: number | null;
        solvedAcScore: number | null;
        totalScore: number | null;
        hasTilRepo: boolean;
        tilRepoCount: number;
        longestProjectMonths: number;
        status: import(".prisma/client").$Enums.CandidateStatus;
        crawledAt: Date;
        updatedAt: Date;
        scoredAt: Date | null;
        lastActivityAt: Date | null;
    }) | null>;
    rejectCandidate(id: string, dto: RejectCandidateDto): Promise<{
        success: boolean;
        status: "REJECTED";
    }>;
    shortlistCandidate(id: string): Promise<{
        success: boolean;
        status: "SHORTLISTED";
    }>;
    undoFeedback(id: string): Promise<{
        success: boolean;
        status: "ACTIVE";
    }>;
}
