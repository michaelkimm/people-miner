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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlerController = void 0;
const common_1 = require("@nestjs/common");
const crawler_service_1 = require("./crawler.service");
const crawl_sources_config_1 = require("../config/crawl-sources.config");
let CrawlerController = class CrawlerController {
    constructor(crawlerService) {
        this.crawlerService = crawlerService;
    }
    async startCrawl(body) {
        return this.crawlerService.startCrawl(body);
    }
    async crawlSource(sourceName) {
        return this.crawlerService.crawlSource(sourceName);
    }
    async getCrawlStatus(jobId) {
        return this.crawlerService.getCrawlStatus(jobId);
    }
    async getLatestJob() {
        return this.crawlerService.getLatestCrawlJob();
    }
    async getSources(category, enabled) {
        let sources = await this.crawlerService.getSources();
        if (category) {
            sources = sources.filter((s) => s.category === category);
        }
        if (enabled !== undefined) {
            const isEnabled = enabled === 'true';
            sources = sources.filter((s) => s.enabled === isEnabled);
        }
        return sources;
    }
    async getSourcesStats() {
        return this.crawlerService.getSourcesStats();
    }
    async syncSources() {
        return this.crawlerService.syncSourcesFromConfig();
    }
    async addSource(body) {
        return this.crawlerService.addSource(body);
    }
    async toggleSource(name, body) {
        return this.crawlerService.toggleSource(name, body.enabled);
    }
};
exports.CrawlerController = CrawlerController;
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "startCrawl", null);
__decorate([
    (0, common_1.Post)('crawl/:sourceName'),
    __param(0, (0, common_1.Param)('sourceName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "crawlSource", null);
__decorate([
    (0, common_1.Get)('status/:jobId'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "getCrawlStatus", null);
__decorate([
    (0, common_1.Get)('latest'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "getLatestJob", null);
__decorate([
    (0, common_1.Get)('sources'),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('enabled')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "getSources", null);
__decorate([
    (0, common_1.Get)('sources/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "getSourcesStats", null);
__decorate([
    (0, common_1.Post)('sources/sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "syncSources", null);
__decorate([
    (0, common_1.Post)('sources'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "addSource", null);
__decorate([
    (0, common_1.Patch)('sources/:name'),
    __param(0, (0, common_1.Param)('name')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "toggleSource", null);
exports.CrawlerController = CrawlerController = __decorate([
    (0, common_1.Controller)('crawler'),
    __metadata("design:paramtypes", [crawler_service_1.CrawlerService])
], CrawlerController);
//# sourceMappingURL=crawler.controller.js.map