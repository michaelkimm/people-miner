import { SourceType } from '@prisma/client';
export declare enum SourceCategory {
    BOOTCAMP = "bootcamp",
    UNIVERSITY_PROGRAM = "university",
    IT_CLUB = "it_club",
    UNIVERSITY_CLUB = "univ_club",
    TECH_GIANT = "tech_giant",
    UNICORN = "unicorn",
    STARTUP = "startup",
    OPEN_SOURCE = "open_source",
    CONFERENCE = "conference",
    TECH_BLOG = "tech_blog"
}
export interface CrawlSourceConfig {
    name: string;
    displayName: string;
    type: SourceType;
    category: SourceCategory;
    url: string;
    config: Record<string, unknown>;
    enabled: boolean;
    priority: number;
    description?: string;
    tags?: string[];
    expectedCandidates?: number;
}
export declare const BOOTCAMP_SOURCES: CrawlSourceConfig[];
export declare const UNIVERSITY_PROGRAM_SOURCES: CrawlSourceConfig[];
export declare const IT_CLUB_SOURCES: CrawlSourceConfig[];
export declare const UNIVERSITY_CLUB_SOURCES: CrawlSourceConfig[];
export declare const TECH_GIANT_SOURCES: CrawlSourceConfig[];
export declare const UNICORN_SOURCES: CrawlSourceConfig[];
export declare const STARTUP_SOURCES: CrawlSourceConfig[];
export declare const OPEN_SOURCE_SOURCES: CrawlSourceConfig[];
export declare const TECH_BLOG_SOURCES: CrawlSourceConfig[];
export declare const ALL_CRAWL_SOURCES: CrawlSourceConfig[];
export declare function getEnabledSources(): CrawlSourceConfig[];
export declare function getSourcesByCategory(category: SourceCategory): CrawlSourceConfig[];
export declare function getSourcesByType(type: SourceType): CrawlSourceConfig[];
export declare function getSourcesByPriority(): CrawlSourceConfig[];
export declare function getSourcesByTag(tag: string): CrawlSourceConfig[];
export declare function getExpectedTotalCandidates(): number;
export declare function getSourcesSummary(): {
    total: number;
    enabled: number;
    byCategory: Record<SourceCategory, number>;
    byType: Record<string, number>;
    expectedCandidates: number;
};
