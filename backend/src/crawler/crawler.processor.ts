import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
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

@Processor('crawl-queue')
export class CrawlerProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlerProcessor.name);

  constructor(
    private prisma: PrismaService,
    private githubOrgCrawler: GithubOrgCrawler,
    private devEventCrawler: DevEventCrawler,
    private techBlogCrawler: TechBlogCrawler,
    private eventsGateway: EventsGateway,
    @InjectQueue('score-queue') private scoreQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<CrawlJobData>): Promise<{ found: number; new: number }> {
    const { sourceType, sourceName, config, crawlJobId } = job.data;

    this.logger.log(`Processing ${sourceName} (${sourceType})`);
    this.eventsGateway.sendProgress({
      jobId: crawlJobId,
      source: sourceName,
      status: 'processing',
      message: `크롤링 시작: ${sourceName}`,
    });

    let result: { found: number; new: number };

    try {
      switch (sourceType) {
        case SourceType.GITHUB_ORG:
          result = await this.githubOrgCrawler.crawl(
            config?.orgName as string,
            sourceName,
          );
          break;

        case SourceType.DEV_EVENT:
          result = await this.devEventCrawler.crawl(
            config?.repoPath as string,
            sourceName,
          );
          break;

        case SourceType.TECH_BLOG:
          result = await this.techBlogCrawler.crawl(
            config?.blogKey as string,
            sourceName,
          );
          break;

        default:
          throw new Error(`Unknown source type: ${sourceType}`);
      }

      await this.prisma.crawlSource.update({
        where: { id: job.data.sourceId },
        data: { lastCrawled: new Date() },
      });

      this.eventsGateway.sendProgress({
        jobId: crawlJobId,
        source: sourceName,
        status: 'completed',
        message: `완료: ${sourceName} (발견: ${result.found}, 신규: ${result.new})`,
        found: result.found,
        new: result.new,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to crawl ${sourceName}:`, error);
      this.eventsGateway.sendProgress({
        jobId: crawlJobId,
        source: sourceName,
        status: 'error',
        message: `실패: ${sourceName}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<CrawlJobData>) {
    this.logger.log(`Job ${job.id} completed`);
    await this.checkAndFinalizeJob(job.data.crawlJobId);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<CrawlJobData> | undefined, error: Error) {
    this.logger.error(`Job ${job?.id} failed:`, error.message);
    if (job?.data.crawlJobId) {
      await this.checkAndFinalizeJob(job.data.crawlJobId);
    }
  }

  private async checkAndFinalizeJob(crawlJobId: string) {
    const result = await this.prisma.crawlJob.updateMany({
      where: { id: crawlJobId, status: 'RUNNING' },
      data: { completedTasks: { increment: 1 } },
    });

    if (result.count === 0) {
      return;
    }

    const updatedJob = await this.prisma.crawlJob.findUnique({
      where: { id: crawlJobId },
    });

    if (!updatedJob) {
      return;
    }

    this.logger.log(
      `Job ${crawlJobId}: ${updatedJob.completedTasks}/${updatedJob.totalTasks} tasks completed`,
    );

    if (updatedJob.completedTasks >= updatedJob.totalTasks) {
      const totalCandidates = await this.prisma.candidate.count();
      const jobStartTime = updatedJob.startedAt || updatedJob.createdAt;
      const recentCandidates = await this.prisma.candidate.count({
        where: { crawledAt: { gte: jobStartTime } },
      });

      await this.prisma.crawlJob.update({
        where: { id: crawlJobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          candidatesFound: totalCandidates,
          candidatesNew: recentCandidates,
        },
      });

      this.eventsGateway.sendProgress({
        jobId: crawlJobId,
        status: 'scoring',
        message: `크롤링 완료! 총 ${totalCandidates}명 (신규: ${recentCandidates}명). 분석 및 스코어링 시작...`,
      });

      this.logger.log(`Crawl job ${crawlJobId} finished! Starting scoring...`);

      const scoreJobId = `score-after-crawl-${crawlJobId}`;
      await this.scoreQueue.add(
        'score-batch',
        { jobId: scoreJobId, force: false, batchSize: 100 },
        { jobId: scoreJobId },
      );
    }
  }
}
