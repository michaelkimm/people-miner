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
var ScoringProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const scoring_service_1 = require("./scoring.service");
const events_gateway_1 = require("../events/events.gateway");
let ScoringProcessor = ScoringProcessor_1 = class ScoringProcessor extends bullmq_1.WorkerHost {
    constructor(scoringService, eventsGateway) {
        super();
        this.scoringService = scoringService;
        this.eventsGateway = eventsGateway;
        this.logger = new common_1.Logger(ScoringProcessor_1.name);
    }
    async process(job) {
        if ('candidateId' in job.data) {
            return this.processCandidate(job);
        }
        else {
            return this.processBatch(job);
        }
    }
    async processCandidate(job) {
        const { candidateId, jobId } = job.data;
        this.logger.log(`Scoring candidate ${candidateId}`);
        try {
            const result = await this.scoringService.scoreCandidate(candidateId);
            this.eventsGateway.sendProgress({
                jobId,
                status: 'scored',
                message: `후보자 점수 계산 완료: ${result.totalScore.toFixed(1)}점`,
                candidateId,
                score: result.totalScore,
            });
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to score candidate ${candidateId}:`, error);
            throw error;
        }
    }
    async processBatch(job) {
        const { jobId, force = false, batchSize = 100 } = job.data;
        this.logger.log(`Starting batch scoring (force: ${force}, batchSize: ${batchSize})`);
        try {
            this.eventsGateway.sendProgress({
                jobId,
                status: 'processing',
                message: '스코어링 중...',
            });
            const result = await this.scoringService.scoreAllCandidates({ force, batchSize });
            this.eventsGateway.sendProgress({
                jobId,
                status: 'finished',
                message: `완료! 스코어링: ${result.scored}명`,
                scored: result.scored,
                failed: result.failed,
            });
            return result;
        }
        catch (error) {
            this.logger.error('Batch scoring failed:', error);
            this.eventsGateway.sendProgress({
                jobId,
                status: 'error',
                message: '스코어링 실패',
            });
            throw error;
        }
    }
    onCompleted(job) {
        this.logger.log(`Score job ${job.id} completed`);
    }
    onFailed(job, error) {
        this.logger.error(`Score job ${job?.id} failed:`, error.message);
    }
};
exports.ScoringProcessor = ScoringProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], ScoringProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], ScoringProcessor.prototype, "onFailed", null);
exports.ScoringProcessor = ScoringProcessor = ScoringProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('score-queue'),
    __metadata("design:paramtypes", [scoring_service_1.ScoringService,
        events_gateway_1.EventsGateway])
], ScoringProcessor);
//# sourceMappingURL=scoring.processor.js.map