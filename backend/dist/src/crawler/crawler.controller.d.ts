import { CrawlerService } from './crawler.service';
import { SourceType } from '@prisma/client';
import { SourceCategory } from '../config/crawl-sources.config';
export declare class CrawlerController {
    private crawlerService;
    constructor(crawlerService: CrawlerService);
    startCrawl(body?: {
        categories?: SourceCategory[];
        sourceNames?: string[];
    }): Promise<{
        jobId: string;
        message: string;
        sourcesCount: number;
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
    getLatestJob(): Promise<{
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
    getSources(category?: SourceCategory, enabled?: string): Promise<{
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
        config: import("@prisma/client/runtime/library").JsonValue | null;
        enabled: boolean;
        lastCrawled: Date | null;
        createdAt: Date;
    }[]>;
    getSourcesStats(): Promise<{
        config: {
            total: number;
            enabled: number;
            byCategory: Record<SourceCategory, number>;
            byType: Record<string, number>;
            expectedCandidates: number;
        };
        database: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.CrawlSourceGroupByOutputType, ("type" | "enabled")[]> & {
            _count: {
                id: number;
            };
        })[];
        recentCrawls: {
            name: string;
            lastCrawled: Date | null;
        }[];
    }>;
    syncSources(): Promise<{
        created: number;
        updated: number;
    }>;
    addSource(body: {
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
        config: import("@prisma/client/runtime/library").JsonValue | null;
        enabled: boolean;
        lastCrawled: Date | null;
        createdAt: Date;
    }>;
    toggleSource(name: string, body: {
        enabled: boolean;
    }): Promise<{
        id: string;
        name: string;
        url: string;
        type: import(".prisma/client").$Enums.SourceType;
        config: import("@prisma/client/runtime/library").JsonValue | null;
        enabled: boolean;
        lastCrawled: Date | null;
        createdAt: Date;
    }>;
}
