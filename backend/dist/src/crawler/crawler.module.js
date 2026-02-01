"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlerModule = exports.SCORE_QUEUE = exports.CRAWL_QUEUE = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const crawler_service_1 = require("./crawler.service");
const crawler_controller_1 = require("./crawler.controller");
const crawler_processor_1 = require("./crawler.processor");
const github_org_crawler_1 = require("./sources/github-org.crawler");
const dev_event_crawler_1 = require("./sources/dev-event.crawler");
const tech_blog_crawler_1 = require("./sources/tech-blog.crawler");
const github_module_1 = require("../github/github.module");
exports.CRAWL_QUEUE = 'crawl-queue';
exports.SCORE_QUEUE = 'score-queue';
let CrawlerModule = class CrawlerModule {
};
exports.CrawlerModule = CrawlerModule;
exports.CrawlerModule = CrawlerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: exports.CRAWL_QUEUE,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    removeOnComplete: 100,
                    removeOnFail: 50,
                },
            }),
            bullmq_1.BullModule.registerQueue({ name: exports.SCORE_QUEUE }),
            github_module_1.GithubModule,
        ],
        controllers: [crawler_controller_1.CrawlerController],
        providers: [
            crawler_service_1.CrawlerService,
            crawler_processor_1.CrawlerProcessor,
            github_org_crawler_1.GithubOrgCrawler,
            dev_event_crawler_1.DevEventCrawler,
            tech_blog_crawler_1.TechBlogCrawler,
        ],
        exports: [crawler_service_1.CrawlerService],
    })
], CrawlerModule);
//# sourceMappingURL=crawler.module.js.map