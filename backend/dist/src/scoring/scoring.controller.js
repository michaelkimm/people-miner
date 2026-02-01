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
exports.ScoringController = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const scoring_service_1 = require("./scoring.service");
let ScoringController = class ScoringController {
    constructor(scoringService, scoreQueue) {
        this.scoringService = scoringService;
        this.scoreQueue = scoreQueue;
    }
    async startScoring(body) {
        const jobId = `score-${Date.now()}`;
        await this.scoreQueue.add('score-batch', {
            jobId,
            force: body?.force ?? false,
            batchSize: body?.batchSize ?? 50,
        }, { jobId });
        return {
            jobId,
            message: 'Scoring job started',
        };
    }
    async scoreCandidate(candidateId) {
        const jobId = `score-${candidateId}-${Date.now()}`;
        await this.scoreQueue.add('score-candidate', { candidateId, jobId }, { jobId });
        return {
            jobId,
            candidateId,
            message: 'Scoring job queued',
        };
    }
    getStrategies() {
        return this.scoringService.getStrategies();
    }
    updateWeight(name, body) {
        this.scoringService.updateStrategyWeight(name, body.weight);
        return { success: true, name, weight: body.weight };
    }
    enableStrategy(name) {
        this.scoringService.enableStrategy(name);
        return { success: true, name, enabled: true };
    }
    disableStrategy(name) {
        this.scoringService.disableStrategy(name);
        return { success: true, name, enabled: false };
    }
};
exports.ScoringController = ScoringController;
__decorate([
    (0, common_1.Post)('start'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ScoringController.prototype, "startScoring", null);
__decorate([
    (0, common_1.Post)('candidate/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScoringController.prototype, "scoreCandidate", null);
__decorate([
    (0, common_1.Get)('strategies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ScoringController.prototype, "getStrategies", null);
__decorate([
    (0, common_1.Patch)('strategies/:name/weight'),
    __param(0, (0, common_1.Param)('name')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ScoringController.prototype, "updateWeight", null);
__decorate([
    (0, common_1.Patch)('strategies/:name/enable'),
    __param(0, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ScoringController.prototype, "enableStrategy", null);
__decorate([
    (0, common_1.Patch)('strategies/:name/disable'),
    __param(0, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ScoringController.prototype, "disableStrategy", null);
exports.ScoringController = ScoringController = __decorate([
    (0, common_1.Controller)('scoring'),
    __param(1, (0, bullmq_1.InjectQueue)('score-queue')),
    __metadata("design:paramtypes", [scoring_service_1.ScoringService,
        bullmq_2.Queue])
], ScoringController);
//# sourceMappingURL=scoring.controller.js.map