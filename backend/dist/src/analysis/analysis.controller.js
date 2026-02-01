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
exports.AnalysisController = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const circuit_breaker_service_1 = require("../common/circuit-breaker.service");
const rate_limiter_service_1 = require("../github/rate-limiter.service");
let AnalysisController = class AnalysisController {
    constructor(analysisQueue, circuitBreaker, rateLimiter) {
        this.analysisQueue = analysisQueue;
        this.circuitBreaker = circuitBreaker;
        this.rateLimiter = rateLimiter;
    }
    async startSolvedAcSync(body) {
        const jobId = `solved-ac-sync-${Date.now()}`;
        await this.analysisQueue.add('sync-solved-ac', {
            jobId,
            batchSize: body?.batchSize ?? 100,
            force: body?.force ?? false,
        }, { jobId });
        return {
            jobId,
            message: 'solved.ac 동기화 작업이 시작되었습니다',
        };
    }
    async startGitHubAnalysis(body) {
        const jobId = `github-analysis-${Date.now()}`;
        await this.analysisQueue.add('analyze-github', {
            jobId,
            batchSize: body?.batchSize ?? 50,
            reposPerCandidate: body?.reposPerCandidate ?? 5,
        }, { jobId });
        return {
            jobId,
            message: 'GitHub 레포 분석 작업이 시작되었습니다',
        };
    }
    async getStatus() {
        const githubRateLimit = await this.rateLimiter.getStatus();
        const solvedAcCircuit = this.circuitBreaker.getStatus('solved-ac');
        const githubCircuit = this.circuitBreaker.getStatus('github-analysis');
        const queueCounts = await this.analysisQueue.getJobCounts();
        return {
            queue: {
                waiting: queueCounts.waiting,
                active: queueCounts.active,
                completed: queueCounts.completed,
                failed: queueCounts.failed,
            },
            rateLimits: {
                github: githubRateLimit,
            },
            circuitBreakers: {
                solvedAc: solvedAcCircuit,
                github: githubCircuit,
            },
        };
    }
    resetCircuitBreaker(body) {
        this.circuitBreaker.reset(body.name);
        return { success: true, message: `Circuit breaker '${body.name}' reset` };
    }
};
exports.AnalysisController = AnalysisController;
__decorate([
    (0, common_1.Post)('solved-ac/sync'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "startSolvedAcSync", null);
__decorate([
    (0, common_1.Post)('github/analyze'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "startGitHubAnalysis", null);
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalysisController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('circuit-breaker/reset'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnalysisController.prototype, "resetCircuitBreaker", null);
exports.AnalysisController = AnalysisController = __decorate([
    (0, common_1.Controller)('analysis'),
    __param(0, (0, bullmq_1.InjectQueue)('analysis-queue')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        circuit_breaker_service_1.CircuitBreakerService,
        rate_limiter_service_1.RateLimiterService])
], AnalysisController);
//# sourceMappingURL=analysis.controller.js.map