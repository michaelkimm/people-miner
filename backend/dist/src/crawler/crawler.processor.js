"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CrawlerProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlerProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../prisma/prisma.service");
const github_org_crawler_1 = require("./sources/github-org.crawler");
const dev_event_crawler_1 = require("./sources/dev-event.crawler");
const tech_blog_crawler_1 = require("./sources/tech-blog.crawler");
const client_1 = require("@prisma/client");
const events_gateway_1 = require("../events/events.gateway");
let CrawlerProcessor = CrawlerProcessor_1 = class CrawlerProcessor extends bullmq_1.WorkerHost {
    constructor(prisma, githubOrgCrawler, devEventCrawler, techBlogCrawler, eventsGateway, scoreQueue) {
        super();
        this.prisma = prisma;
        this.githubOrgCrawler = githubOrgCrawler;
        this.devEventCrawler = devEventCrawler;
        this.techBlogCrawler = techBlogCrawler;
        this.eventsGateway = eventsGateway;
        this.scoreQueue = scoreQueue;
        this.logger = new common_1.Logger(CrawlerProcessor_1.name);
    }
    async process(job) {
        const { sourceType, sourceName, config, crawlJobId } = job.data;
        this.logger.log(`Processing ${sourceName} (${sourceType})`);
        this.eventsGateway.sendProgress({
            jobId: crawlJobId,
            source: sourceName,
            status: 'processing',
            message: `크롤링 시작: ${sourceName}`,
        });
        let result;
        try {
            switch (sourceType) {
                case client_1.SourceType.GITHUB_ORG:
                    result = await this.githubOrgCrawler.crawl(config?.orgName, sourceName);
                    break;
                case client_1.SourceType.DEV_EVENT:
                    result = await this.devEventCrawler.crawl(config?.repoPath, sourceName);
                    break;
                case client_1.SourceType.TECH_BLOG:
                    result = await this.techBlogCrawler.crawl(config?.blogKey, sourceName);
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
        }
        catch (error) {
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
    async onCompleted(job) {
        this.logger.log(`Job ${job.id} completed`);
        await this.checkAndFinalizeJob(job.data.crawlJobId);
    }
    async onFailed(job, error) {
        this.logger.error(`Job ${job?.id} failed:`, error.message);
        if (job?.data.crawlJobId) {
            await this.checkAndFinalizeJob(job.data.crawlJobId);
        }
    }
    async checkAndFinalizeJob(crawlJobId) {
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
        this.logger.log(`Job ${crawlJobId}: ${updatedJob.completedTasks}/${updatedJob.totalTasks} tasks completed`);
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
            await this.scoreQueue.add('score-batch', { jobId: scoreJobId, force: false, batchSize: 100 }, { jobId: scoreJobId });
        }
    }
};
exports.CrawlerProcessor = CrawlerProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", Promise)
], CrawlerProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", Promise)
], CrawlerProcessor.prototype, "onFailed", null);
exports.CrawlerProcessor = CrawlerProcessor = CrawlerProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('crawl-queue'),
    __param(5, (0, bullmq_1.InjectQueue)('score-queue')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        github_org_crawler_1.GithubOrgCrawler,
        dev_event_crawler_1.DevEventCrawler,
        tech_blog_crawler_1.TechBlogCrawler,
        events_gateway_1.EventsGateway,
        bullmq_2.Queue])
], CrawlerProcessor);
//# sourceMappingURL=crawler.processor.js.map