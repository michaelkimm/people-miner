import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SourceType, Prisma } from '@prisma/client';
import {
  ALL_CRAWL_SOURCES,
  getEnabledSources,
  getSourcesSummary,
  CrawlSourceConfig,
  SourceCategory,
} from '../config/crawl-sources.config';

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

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    @InjectQueue('crawl-queue') private crawlQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async startCrawl(
    options?: StartCrawlOptions,
  ): Promise<{ jobId: string; message: string; sourcesCount: number }> {
    const dbSourceCount = await this.prisma.crawlSource.count();
    if (dbSourceCount === 0) {
      await this.syncSourcesFromConfig();
    }

    let sources = await this.prisma.crawlSource.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
    });

    if (options?.categories?.length) {
      const categoryNames = this.getSourceNamesByCategories(options.categories);
      sources = sources.filter((s) => categoryNames.includes(s.name));
    }

    if (options?.sourceNames?.length) {
      sources = sources.filter((s) => options.sourceNames!.includes(s.name));
    }

    if (sources.length === 0) {
      return {
        jobId: '',
        message: 'No sources to crawl',
        sourcesCount: 0,
      };
    }

    const crawlJob = await this.prisma.crawlJob.create({
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        totalTasks: sources.length,
        completedTasks: 0,
      },
    });

    const sortedSources = this.sortSourcesByPriority(sources);

    for (const source of sortedSources) {
      await this.crawlQueue.add(
        'crawl-source',
        {
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
          sourceUrl: source.url,
          config: source.config as Record<string, unknown>,
          crawlJobId: crawlJob.id,
        },
        {
          jobId: `${crawlJob.id}-${source.id}`,
          priority: this.getSourcePriority(source.name),
        },
      );
    }

    this.logger.log(
      `Started crawl job ${crawlJob.id} with ${sources.length} sources`,
    );

    return {
      jobId: crawlJob.id,
      message: `Started crawling ${sources.length} sources`,
      sourcesCount: sources.length,
    };
  }

  async syncSourcesFromConfig(): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const sourceConfig of ALL_CRAWL_SOURCES) {
      const existing = await this.prisma.crawlSource.findUnique({
        where: { name: sourceConfig.name },
      });

      if (existing) {
        await this.prisma.crawlSource.update({
          where: { name: sourceConfig.name },
          data: {
            type: sourceConfig.type,
            url: sourceConfig.url,
            config: sourceConfig.config as Prisma.InputJsonValue,
            enabled: sourceConfig.enabled,
          },
        });
        updated++;
      } else {
        await this.prisma.crawlSource.create({
          data: {
            name: sourceConfig.name,
            type: sourceConfig.type,
            url: sourceConfig.url,
            config: sourceConfig.config as Prisma.InputJsonValue,
            enabled: sourceConfig.enabled,
          },
        });
        created++;
      }
    }

    this.logger.log(`Synced sources: ${created} created, ${updated} updated`);
    return { created, updated };
  }

  async getSourcesStats() {
    const configSummary = getSourcesSummary();

    const dbStats = await this.prisma.crawlSource.groupBy({
      by: ['type', 'enabled'],
      _count: { id: true },
    });

    const lastCrawls = await this.prisma.crawlSource.findMany({
      where: { lastCrawled: { not: null } },
      orderBy: { lastCrawled: 'desc' },
      take: 10,
      select: {
        name: true,
        lastCrawled: true,
      },
    });

    return {
      config: configSummary,
      database: dbStats,
      recentCrawls: lastCrawls,
    };
  }

  async crawlSource(sourceName: string): Promise<{ jobId: string }> {
    const source = await this.prisma.crawlSource.findUnique({
      where: { name: sourceName },
    });

    if (!source) {
      throw new Error(`Source not found: ${sourceName}`);
    }

    const crawlJob = await this.prisma.crawlJob.create({
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        totalTasks: 1,
        completedTasks: 0,
      },
    });

    await this.crawlQueue.add(
      'crawl-source',
      {
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        sourceUrl: source.url,
        config: source.config as Record<string, unknown>,
        crawlJobId: crawlJob.id,
      },
      { jobId: `${crawlJob.id}-${source.id}` },
    );

    return { jobId: crawlJob.id };
  }

  async getCrawlStatus(jobId: string) {
    const job = await this.prisma.crawlJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return null;
    }

    const queueJobs = await this.crawlQueue.getJobs([
      'active',
      'waiting',
      'delayed',
    ]);
    const relatedJobs = queueJobs.filter((j) => j.id?.startsWith(jobId));

    return {
      ...job,
      pendingTasks: relatedJobs.length,
    };
  }

  async getLatestCrawlJob() {
    return this.prisma.crawlJob.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleSource(name: string, enabled: boolean) {
    return this.prisma.crawlSource.update({
      where: { name },
      data: { enabled },
    });
  }

  async addSource(data: {
    name: string;
    displayName?: string;
    type: SourceType;
    url: string;
    config: Record<string, unknown>;
  }) {
    return this.prisma.crawlSource.create({
      data: {
        name: data.name,
        type: data.type,
        url: data.url,
        config: data.config as Prisma.InputJsonValue,
        enabled: true,
      },
    });
  }

  async getSources() {
    const dbSources = await this.prisma.crawlSource.findMany({
      orderBy: { name: 'asc' },
    });

    return dbSources.map((dbSource) => {
      const configSource = ALL_CRAWL_SOURCES.find(
        (s) => s.name === dbSource.name,
      );
      return {
        ...dbSource,
        displayName: configSource?.displayName || dbSource.name,
        category: configSource?.category || 'unknown',
        description: configSource?.description,
        tags: configSource?.tags || [],
        expectedCandidates: configSource?.expectedCandidates,
        priority: configSource?.priority || 99,
      };
    });
  }

  async getSourcesByCategory(category: SourceCategory) {
    const sources = await this.getSources();
    return sources.filter((s) => s.category === category);
  }

  private getSourceNamesByCategories(categories: SourceCategory[]): string[] {
    return ALL_CRAWL_SOURCES.filter((s) => categories.includes(s.category)).map(
      (s) => s.name,
    );
  }

  private sortSourcesByPriority<T extends { name: string }>(sources: T[]): T[] {
    const priorityMap = new Map(
      ALL_CRAWL_SOURCES.map((s) => [s.name, s.priority]),
    );

    return [...sources].sort((a, b) => {
      const priorityA = priorityMap.get(a.name) || 99;
      const priorityB = priorityMap.get(b.name) || 99;
      return priorityA - priorityB;
    });
  }

  private getSourcePriority(name: string): number {
    const source = ALL_CRAWL_SOURCES.find((s) => s.name === name);
    return source?.priority || 50;
  }

  async seedDefaultSources(): Promise<void> {
    return this.syncSourcesFromConfig().then(() => {});
  }
}
