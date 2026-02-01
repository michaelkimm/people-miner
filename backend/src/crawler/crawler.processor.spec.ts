import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { CrawlerProcessor } from './crawler.processor';
import { PrismaService } from '../prisma/prisma.service';
import { GithubOrgCrawler } from './sources/github-org.crawler';
import { DevEventCrawler } from './sources/dev-event.crawler';
import { TechBlogCrawler } from './sources/tech-blog.crawler';
import { EventsGateway } from '../events/events.gateway';
import { SourceType } from '@prisma/client';

describe('CrawlerProcessor', () => {
  let processor: CrawlerProcessor;

  const mockPrisma = {
    crawlSource: { update: jest.fn() },
    crawlJob: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    candidate: { count: jest.fn() },
  };

  const mockGithubOrgCrawler = { crawl: jest.fn() };
  const mockDevEventCrawler = { crawl: jest.fn() };
  const mockTechBlogCrawler = { crawl: jest.fn() };
  const mockEventsGateway = { sendProgress: jest.fn() };
  const mockScoreQueue = { add: jest.fn() };

  const createMockJob = (data: Record<string, unknown>) => ({
    id: 'job-1',
    data,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrawlerProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GithubOrgCrawler, useValue: mockGithubOrgCrawler },
        { provide: DevEventCrawler, useValue: mockDevEventCrawler },
        { provide: TechBlogCrawler, useValue: mockTechBlogCrawler },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: getQueueToken('score-queue'), useValue: mockScoreQueue },
      ],
    }).compile();

    processor = module.get<CrawlerProcessor>(CrawlerProcessor);
  });

  describe('process', () => {
    it('should crawl GITHUB_ORG source successfully', async () => {
      const job = createMockJob({
        sourceId: 's1',
        sourceName: 'Test Org',
        sourceType: SourceType.GITHUB_ORG,
        sourceUrl: 'https://github.com/test-org',
        config: { orgName: 'test-org' },
        crawlJobId: 'cj1',
      });

      mockGithubOrgCrawler.crawl.mockResolvedValueOnce({ found: 10, new: 5 });
      mockPrisma.crawlSource.update.mockResolvedValueOnce({});

      const result = await processor.process(job as any);

      expect(result).toEqual({ found: 10, new: 5 });
      expect(mockGithubOrgCrawler.crawl).toHaveBeenCalledWith('test-org', 'Test Org');
      expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'processing' })
      );
      expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed', found: 10, new: 5 })
      );
    });

    it('should crawl DEV_EVENT source successfully', async () => {
      const job = createMockJob({
        sourceId: 's2',
        sourceName: 'Dev Events',
        sourceType: SourceType.DEV_EVENT,
        sourceUrl: 'https://github.com/dev-event',
        config: { repoPath: '/path/to/repo' },
        crawlJobId: 'cj2',
      });

      mockDevEventCrawler.crawl.mockResolvedValueOnce({ found: 20, new: 8 });
      mockPrisma.crawlSource.update.mockResolvedValueOnce({});

      const result = await processor.process(job as any);

      expect(result).toEqual({ found: 20, new: 8 });
      expect(mockDevEventCrawler.crawl).toHaveBeenCalledWith('/path/to/repo', 'Dev Events');
    });

    it('should throw error for unknown source type', async () => {
      const job = createMockJob({
        sourceId: 's3',
        sourceName: 'Unknown',
        sourceType: 'UNKNOWN_TYPE',
        crawlJobId: 'cj3',
      });

      await expect(processor.process(job as any)).rejects.toThrow('Unknown source type');
      expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error' })
      );
    });

    it('should send error progress on crawl failure', async () => {
      const job = createMockJob({
        sourceId: 's1',
        sourceName: 'Test Org',
        sourceType: SourceType.GITHUB_ORG,
        config: { orgName: 'test-org' },
        crawlJobId: 'cj1',
      });

      mockGithubOrgCrawler.crawl.mockRejectedValueOnce(new Error('API Error'));

      await expect(processor.process(job as any)).rejects.toThrow('API Error');
      expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', error: 'API Error' })
      );
    });
  });

  describe('checkAndFinalizeJob', () => {
    it('should trigger scoring when all tasks completed', async () => {
      mockPrisma.crawlJob.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.crawlJob.findUnique.mockResolvedValueOnce({
        id: 'cj1',
        completedTasks: 3,
        totalTasks: 3,
        startedAt: new Date(),
        createdAt: new Date(),
      });
      mockPrisma.candidate.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(10);
      mockPrisma.crawlJob.update.mockResolvedValueOnce({});
      mockScoreQueue.add.mockResolvedValueOnce({});

      const job = createMockJob({ crawlJobId: 'cj1' });
      await processor.onCompleted(job as any);

      expect(mockScoreQueue.add).toHaveBeenCalledWith(
        'score-batch',
        expect.objectContaining({ jobId: 'score-after-crawl-cj1' }),
        expect.any(Object)
      );
      expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'scoring' })
      );
    });

    it('should not trigger scoring when tasks still pending', async () => {
      mockPrisma.crawlJob.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.crawlJob.findUnique.mockResolvedValueOnce({
        id: 'cj1',
        completedTasks: 1,
        totalTasks: 3,
      });

      const job = createMockJob({ crawlJobId: 'cj1' });
      await processor.onCompleted(job as any);

      expect(mockScoreQueue.add).not.toHaveBeenCalled();
    });

    it('should handle already completed job gracefully', async () => {
      mockPrisma.crawlJob.updateMany.mockResolvedValueOnce({ count: 0 });

      const job = createMockJob({ crawlJobId: 'cj1' });
      await processor.onCompleted(job as any);

      expect(mockPrisma.crawlJob.findUnique).not.toHaveBeenCalled();
    });
  });
});
