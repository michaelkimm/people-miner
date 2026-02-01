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
var CrawlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlerService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../prisma/prisma.service");
const crawl_sources_config_1 = require("../config/crawl-sources.config");
let CrawlerService = CrawlerService_1 = class CrawlerService {
    constructor(crawlQueue, prisma) {
        this.crawlQueue = crawlQueue;
        this.prisma = prisma;
        this.logger = new common_1.Logger(CrawlerService_1.name);
    }
    async startCrawl(options) {
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
            sources = sources.filter((s) => options.sourceNames.includes(s.name));
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
            await this.crawlQueue.add('crawl-source', {
                sourceId: source.id,
                sourceName: source.name,
                sourceType: source.type,
                sourceUrl: source.url,
                config: source.config,
                crawlJobId: crawlJob.id,
            }, {
                jobId: `${crawlJob.id}-${source.id}`,
                priority: this.getSourcePriority(source.name),
            });
        }
        this.logger.log(`Started crawl job ${crawlJob.id} with ${sources.length} sources`);
        return {
            jobId: crawlJob.id,
            message: `Started crawling ${sources.length} sources`,
            sourcesCount: sources.length,
        };
    }
    async syncSourcesFromConfig() {
        let created = 0;
        let updated = 0;
        for (const sourceConfig of crawl_sources_config_1.ALL_CRAWL_SOURCES) {
            const existing = await this.prisma.crawlSource.findUnique({
                where: { name: sourceConfig.name },
            });
            if (existing) {
                await this.prisma.crawlSource.update({
                    where: { name: sourceConfig.name },
                    data: {
                        type: sourceConfig.type,
                        url: sourceConfig.url,
                        config: sourceConfig.config,
                        enabled: sourceConfig.enabled,
                    },
                });
                updated++;
            }
            else {
                await this.prisma.crawlSource.create({
                    data: {
                        name: sourceConfig.name,
                        type: sourceConfig.type,
                        url: sourceConfig.url,
                        config: sourceConfig.config,
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
        const configSummary = (0, crawl_sources_config_1.getSourcesSummary)();
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
    async crawlSource(sourceName) {
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
        await this.crawlQueue.add('crawl-source', {
            sourceId: source.id,
            sourceName: source.name,
            sourceType: source.type,
            sourceUrl: source.url,
            config: source.config,
            crawlJobId: crawlJob.id,
        }, { jobId: `${crawlJob.id}-${source.id}` });
        return { jobId: crawlJob.id };
    }
    async getCrawlStatus(jobId) {
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
    async toggleSource(name, enabled) {
        return this.prisma.crawlSource.update({
            where: { name },
            data: { enabled },
        });
    }
    async addSource(data) {
        return this.prisma.crawlSource.create({
            data: {
                name: data.name,
                type: data.type,
                url: data.url,
                config: data.config,
                enabled: true,
            },
        });
    }
    async getSources() {
        const dbSources = await this.prisma.crawlSource.findMany({
            orderBy: { name: 'asc' },
        });
        return dbSources.map((dbSource) => {
            const configSource = crawl_sources_config_1.ALL_CRAWL_SOURCES.find((s) => s.name === dbSource.name);
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
    async getSourcesByCategory(category) {
        const sources = await this.getSources();
        return sources.filter((s) => s.category === category);
    }
    getSourceNamesByCategories(categories) {
        return crawl_sources_config_1.ALL_CRAWL_SOURCES.filter((s) => categories.includes(s.category)).map((s) => s.name);
    }
    sortSourcesByPriority(sources) {
        const priorityMap = new Map(crawl_sources_config_1.ALL_CRAWL_SOURCES.map((s) => [s.name, s.priority]));
        return [...sources].sort((a, b) => {
            const priorityA = priorityMap.get(a.name) || 99;
            const priorityB = priorityMap.get(b.name) || 99;
            return priorityA - priorityB;
        });
    }
    getSourcePriority(name) {
        const source = crawl_sources_config_1.ALL_CRAWL_SOURCES.find((s) => s.name === name);
        return source?.priority || 50;
    }
    async seedDefaultSources() {
        return this.syncSourcesFromConfig().then(() => { });
    }
};
exports.CrawlerService = CrawlerService;
exports.CrawlerService = CrawlerService = CrawlerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('crawl-queue')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        prisma_service_1.PrismaService])
], CrawlerService);
//# sourceMappingURL=crawler.service.js.map