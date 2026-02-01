"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const bullmq_1 = require("@nestjs/bullmq");
const crawler_processor_1 = require("./crawler.processor");
const prisma_service_1 = require("../prisma/prisma.service");
const github_org_crawler_1 = require("./sources/github-org.crawler");
const dev_event_crawler_1 = require("./sources/dev-event.crawler");
const tech_blog_crawler_1 = require("./sources/tech-blog.crawler");
const events_gateway_1 = require("../events/events.gateway");
const client_1 = require("@prisma/client");
describe('CrawlerProcessor', () => {
    let processor;
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
    const createMockJob = (data) => ({
        id: 'job-1',
        data,
    });
    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await testing_1.Test.createTestingModule({
            providers: [
                crawler_processor_1.CrawlerProcessor,
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
                { provide: github_org_crawler_1.GithubOrgCrawler, useValue: mockGithubOrgCrawler },
                { provide: dev_event_crawler_1.DevEventCrawler, useValue: mockDevEventCrawler },
                { provide: tech_blog_crawler_1.TechBlogCrawler, useValue: mockTechBlogCrawler },
                { provide: events_gateway_1.EventsGateway, useValue: mockEventsGateway },
                { provide: (0, bullmq_1.getQueueToken)('score-queue'), useValue: mockScoreQueue },
            ],
        }).compile();
        processor = module.get(crawler_processor_1.CrawlerProcessor);
    });
    describe('process', () => {
        it('should crawl GITHUB_ORG source successfully', async () => {
            const job = createMockJob({
                sourceId: 's1',
                sourceName: 'Test Org',
                sourceType: client_1.SourceType.GITHUB_ORG,
                sourceUrl: 'https://github.com/test-org',
                config: { orgName: 'test-org' },
                crawlJobId: 'cj1',
            });
            mockGithubOrgCrawler.crawl.mockResolvedValueOnce({ found: 10, new: 5 });
            mockPrisma.crawlSource.update.mockResolvedValueOnce({});
            const result = await processor.process(job);
            expect(result).toEqual({ found: 10, new: 5 });
            expect(mockGithubOrgCrawler.crawl).toHaveBeenCalledWith('test-org', 'Test Org');
            expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing' }));
            expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed', found: 10, new: 5 }));
        });
        it('should crawl DEV_EVENT source successfully', async () => {
            const job = createMockJob({
                sourceId: 's2',
                sourceName: 'Dev Events',
                sourceType: client_1.SourceType.DEV_EVENT,
                sourceUrl: 'https://github.com/dev-event',
                config: { repoPath: '/path/to/repo' },
                crawlJobId: 'cj2',
            });
            mockDevEventCrawler.crawl.mockResolvedValueOnce({ found: 20, new: 8 });
            mockPrisma.crawlSource.update.mockResolvedValueOnce({});
            const result = await processor.process(job);
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
            await expect(processor.process(job)).rejects.toThrow('Unknown source type');
            expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
        });
        it('should send error progress on crawl failure', async () => {
            const job = createMockJob({
                sourceId: 's1',
                sourceName: 'Test Org',
                sourceType: client_1.SourceType.GITHUB_ORG,
                config: { orgName: 'test-org' },
                crawlJobId: 'cj1',
            });
            mockGithubOrgCrawler.crawl.mockRejectedValueOnce(new Error('API Error'));
            await expect(processor.process(job)).rejects.toThrow('API Error');
            expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', error: 'API Error' }));
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
            await processor.onCompleted(job);
            expect(mockScoreQueue.add).toHaveBeenCalledWith('score-batch', expect.objectContaining({ jobId: 'score-after-crawl-cj1' }), expect.any(Object));
            expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'scoring' }));
        });
        it('should not trigger scoring when tasks still pending', async () => {
            mockPrisma.crawlJob.updateMany.mockResolvedValueOnce({ count: 1 });
            mockPrisma.crawlJob.findUnique.mockResolvedValueOnce({
                id: 'cj1',
                completedTasks: 1,
                totalTasks: 3,
            });
            const job = createMockJob({ crawlJobId: 'cj1' });
            await processor.onCompleted(job);
            expect(mockScoreQueue.add).not.toHaveBeenCalled();
        });
        it('should handle already completed job gracefully', async () => {
            mockPrisma.crawlJob.updateMany.mockResolvedValueOnce({ count: 0 });
            const job = createMockJob({ crawlJobId: 'cj1' });
            await processor.onCompleted(job);
            expect(mockPrisma.crawlJob.findUnique).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=crawler.processor.spec.js.map