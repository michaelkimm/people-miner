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
var AnalysisProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../prisma/prisma.service");
const solved_ac_service_1 = require("../solved-ac/solved-ac.service");
const github_analysis_service_1 = require("../github/github-analysis.service");
const scoring_service_1 = require("../scoring/scoring.service");
const events_gateway_1 = require("../events/events.gateway");
const circuit_breaker_service_1 = require("../common/circuit-breaker.service");
const SOLVED_AC_CIRCUIT = 'solved-ac';
const GITHUB_CIRCUIT = 'github-analysis';
let AnalysisProcessor = AnalysisProcessor_1 = class AnalysisProcessor extends bullmq_1.WorkerHost {
    constructor(prisma, solvedAcService, githubAnalysisService, scoringService, eventsGateway, circuitBreaker) {
        super();
        this.prisma = prisma;
        this.solvedAcService = solvedAcService;
        this.githubAnalysisService = githubAnalysisService;
        this.scoringService = scoringService;
        this.eventsGateway = eventsGateway;
        this.circuitBreaker = circuitBreaker;
        this.logger = new common_1.Logger(AnalysisProcessor_1.name);
    }
    onModuleInit() {
        this.circuitBreaker.register({
            name: SOLVED_AC_CIRCUIT,
            failureThreshold: 3,
            resetTimeoutMs: 60000,
            halfOpenMaxAttempts: 2,
        });
        this.circuitBreaker.register({
            name: GITHUB_CIRCUIT,
            failureThreshold: 5,
            resetTimeoutMs: 60000,
            halfOpenMaxAttempts: 3,
        });
    }
    async process(job) {
        if (job.name === 'sync-solved-ac') {
            return this.processSolvedAcSync(job);
        }
        else if (job.name === 'analyze-github') {
            return this.processGitHubAnalysis(job);
        }
        throw new Error(`Unknown job type: ${job.name}`);
    }
    async processSolvedAcSync(job) {
        const { jobId, batchSize = 100, force = false } = job.data;
        this.logger.log(`Starting solved.ac sync (batchSize: ${batchSize}, force: ${force})`);
        this.eventsGateway.sendProgress({
            jobId,
            status: 'processing',
            message: 'solved.ac 동기화 시작...',
        });
        const candidates = await this.prisma.candidate.findMany({
            where: force ? {} : { solvedAcProfile: null },
            select: { id: true, githubUsername: true, bio: true, blog: true },
            take: batchSize,
        });
        let synced = 0;
        let failed = 0;
        let skipped = 0;
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            const result = await this.circuitBreaker.execute(SOLVED_AC_CIRCUIT, async () => {
                const success = await this.solvedAcService.syncCandidateSolvedAc(candidate.id);
                return success;
            });
            if (result === true) {
                synced++;
            }
            else if (result === false) {
                skipped++;
            }
            else {
                failed++;
            }
            if ((i + 1) % 10 === 0) {
                this.eventsGateway.sendProgress({
                    jobId,
                    status: 'processing',
                    message: `solved.ac 동기화 중... (${i + 1}/${candidates.length})`,
                    progress: Math.round(((i + 1) / candidates.length) * 100),
                });
            }
        }
        this.eventsGateway.sendProgress({
            jobId,
            status: 'processing',
            message: `solved.ac 완료 (${synced}명). 재스코어링 중...`,
        });
        const scoreResult = await this.rescoreSyncedCandidates(candidates.map(c => c.id));
        this.eventsGateway.sendProgress({
            jobId,
            status: 'finished',
            message: `완료! solved.ac: ${synced}명 동기화, ${scoreResult.scored}명 재스코어링`,
        });
        return { synced, skipped, failed, rescored: scoreResult.scored };
    }
    async processGitHubAnalysis(job) {
        const { jobId, batchSize = 50, reposPerCandidate = 5 } = job.data;
        this.logger.log(`Starting GitHub analysis (batchSize: ${batchSize}, reposPerCandidate: ${reposPerCandidate})`);
        this.eventsGateway.sendProgress({
            jobId,
            status: 'processing',
            message: 'GitHub 레포 분석 시작...',
        });
        const candidates = await this.prisma.candidate.findMany({
            where: {
                repositories: {
                    some: { analysis: null },
                },
            },
            select: { id: true, githubUsername: true },
            take: batchSize,
        });
        let analyzedRepos = 0;
        let analyzedCandidates = 0;
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            const repos = await this.prisma.repository.findMany({
                where: { candidateId: candidate.id, analysis: null },
                select: { id: true, fullName: true },
                take: reposPerCandidate,
                orderBy: { starCount: 'desc' },
            });
            for (const repo of repos) {
                const result = await this.circuitBreaker.execute(GITHUB_CIRCUIT, async () => {
                    await this.githubAnalysisService.analyzeAndSaveRepository(repo.id);
                    return true;
                });
                if (result) {
                    analyzedRepos++;
                }
            }
            analyzedCandidates++;
            if ((i + 1) % 5 === 0) {
                this.eventsGateway.sendProgress({
                    jobId,
                    status: 'processing',
                    message: `GitHub 분석 중... (${analyzedCandidates}/${candidates.length}명, ${analyzedRepos}개 레포)`,
                    progress: Math.round(((i + 1) / candidates.length) * 100),
                });
            }
        }
        this.eventsGateway.sendProgress({
            jobId,
            status: 'processing',
            message: `분석 완료 (${analyzedRepos}개 레포). 재스코어링 중...`,
        });
        const scoreResult = await this.rescoreSyncedCandidates(candidates.map(c => c.id));
        this.eventsGateway.sendProgress({
            jobId,
            status: 'finished',
            message: `완료! ${analyzedRepos}개 레포 분석, ${scoreResult.scored}명 재스코어링`,
        });
        return { analyzedCandidates, analyzedRepos, rescored: scoreResult.scored };
    }
    async rescoreSyncedCandidates(candidateIds) {
        let scored = 0;
        let failed = 0;
        for (const id of candidateIds) {
            try {
                await this.scoringService.scoreCandidate(id);
                scored++;
            }
            catch (error) {
                this.logger.error(`Failed to rescore candidate ${id}:`, error);
                failed++;
            }
        }
        return { scored, failed };
    }
    onCompleted(job) {
        this.logger.log(`Analysis job ${job.id} completed`);
    }
    onFailed(job, error) {
        this.logger.error(`Analysis job ${job?.id} failed:`, error.message);
    }
};
exports.AnalysisProcessor = AnalysisProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], AnalysisProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], AnalysisProcessor.prototype, "onFailed", null);
exports.AnalysisProcessor = AnalysisProcessor = AnalysisProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('analysis-queue'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        solved_ac_service_1.SolvedAcService,
        github_analysis_service_1.GitHubAnalysisService,
        scoring_service_1.ScoringService,
        events_gateway_1.EventsGateway,
        circuit_breaker_service_1.CircuitBreakerService])
], AnalysisProcessor);
//# sourceMappingURL=analysis.processor.js.map