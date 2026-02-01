import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SourceType, Prisma } from '@prisma/client';
import { SourceCategory } from '../config/crawl-sources.config';
export interface CrawlJobData {
    sourceId?: string;
    sourceName: string;
    sourceType: SourceType;
    sourceUrl: string;
    config?: Record<string, unknown>;
}
export interface StartCrawlOptions {
    categories?: SourceCategory[];
    sourceNames?: string[];
}
export declare class CrawlerService {
    private crawlQueue;
    private prisma;
    private readonly logger;
    constructor(crawlQueue: Queue, prisma: PrismaService);
    startCrawl(options?: StartCrawlOptions): Promise<{
        jobId: string;
        message: string;
        sourcesCount: number;
    }>;
    syncSourcesFromConfig(): Promise<{
        created: number;
        updated: number;
    }>;
    getSourcesStats(): Promise<{
        config: {
            total: number;
            enabled: number;
            byCategory: Record<SourceCategory, number>;
            byType: Record<string, number>;
            expectedCandidates: number;
        };
        database: (Prisma.PickEnumerable<Prisma.CrawlSourceGroupByOutputType, ("type" | "enabled")[]> & {
            _count: {
                id: number;
            };
        })[];
        recentCrawls: {
            name: string;
            lastCrawled: Date | null;
        }[];
    }>;
    crawlSource(sourceName: string): Promise<{
        jobId: string;
    }>;
    getCrawlStatus(jobId: string): Promise<{
        pendingTasks: number;
        error: string | null;
        id: string;
        status: import(".prisma/client").$Enums.JobStatus;
        createdAt: Date;
        sourceId: string | null;
        totalTasks: number;
        completedTasks: number;
        candidatesFound: number;
        candidatesNew: number;
        startedAt: Date | null;
        completedAt: Date | null;
    } | null>;
    getLatestCrawlJob(): Promise<{
        error: string | null;
        id: string;
        status: import(".prisma/client").$Enums.JobStatus;
        createdAt: Date;
        sourceId: string | null;
        totalTasks: number;
        completedTasks: number;
        candidatesFound: number;
        candidatesNew: number;
        startedAt: Date | null;
        completedAt: Date | null;
    } | null>;
    toggleSource(name: string, enabled: boolean): Promise<{
        id: string;
        name: string;
        url: string;
        type: import(".prisma/client").$Enums.SourceType;
        config: Prisma.JsonValue | null;
        enabled: boolean;
        lastCrawled: Date | null;
        createdAt: Date;
    }>;
    addSource(data: {
        name: string;
        displayName?: string;
        type: SourceType;
        url: string;
        config: Record<string, unknown>;
    }): Promise<{
        id: string;
        name: string;
        url: string;
        type: import(".prisma/client").$Enums.SourceType;
        config: Prisma.JsonValue | null;
        enabled: boolean;
        lastCrawled: Date | null;
        createdAt: Date;
    }>;
    getSources(): Promise<{
        displayName: string;
        category: string;
        description: string | undefined;
        tags: string[];
        expectedCandidates: number | undefined;
        priority: number;
        id: string;
        name: string;
        url: string;
        type: import(".prisma/client").$Enums.SourceType;
        config: Prisma.JsonValue | null;
        enabled: boolean;
        lastCrawled: Date | null;
        createdAt: Date;
    }[]>;
    getSourcesByCategory(category: SourceCategory): Promise<{
        displayName: string;
        category: string;
        description: string | undefined;
        tags: string[];
        expectedCandidates: number | undefined;
        priority: number;
        id: string;
        name: string;
        url: string;
        type: import(".prisma/client").$Enums.SourceType;
        config: Prisma.JsonValue | null;
        enabled: boolean;
        lastCrawled: Date | null;
        createdAt: Date;
    }[]>;
    private getSourceNamesByCategories;
    private sortSourcesByPriority;
    private getSourcePriority;
    seedDefaultSources(): Promise<void>;
}
