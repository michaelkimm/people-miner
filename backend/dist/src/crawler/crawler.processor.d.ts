import { WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { GithubOrgCrawler } from './sources/github-org.crawler';
import { DevEventCrawler } from './sources/dev-event.crawler';
import { TechBlogCrawler } from './sources/tech-blog.crawler';
import { SourceType } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
interface CrawlJobData {
    sourceId: string;
    sourceName: string;
    sourceType: SourceType;
    sourceUrl: string;
    config?: Record<string, unknown>;
    crawlJobId: string;
}
export declare class CrawlerProcessor extends WorkerHost {
    private prisma;
    private githubOrgCrawler;
    private devEventCrawler;
    private techBlogCrawler;
    private eventsGateway;
    private scoreQueue;
    private readonly logger;
    constructor(prisma: PrismaService, githubOrgCrawler: GithubOrgCrawler, devEventCrawler: DevEventCrawler, techBlogCrawler: TechBlogCrawler, eventsGateway: EventsGateway, scoreQueue: Queue);
    process(job: Job<CrawlJobData>): Promise<{
        found: number;
        new: number;
    }>;
    onCompleted(job: Job<CrawlJobData>): Promise<void>;
    onFailed(job: Job<CrawlJobData> | undefined, error: Error): Promise<void>;
    private checkAndFinalizeJob;
}
export {};
