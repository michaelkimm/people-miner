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
exports.CandidateController = void 0;
const common_1 = require("@nestjs/common");
const candidate_service_1 = require("./candidate.service");
const rejection_service_1 = require("../rejection/rejection.service");
const feedback_dto_1 = require("../rejection/dto/feedback.dto");
let CandidateController = class CandidateController {
    constructor(candidateService, rejectionService) {
        this.candidateService = candidateService;
        this.rejectionService = rejectionService;
    }
    async findAll(page, limit, sortBy, order, search, source, minScore, maxScore, excludeRejected, autoExclude, role, recentActivityOnly, activityMonths) {
        return this.candidateService.findAll({
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            sortBy,
            order,
            search,
            source,
            minScore: minScore ? parseFloat(minScore) : undefined,
            maxScore: maxScore ? parseFloat(maxScore) : undefined,
            excludeRejected: excludeRejected === 'true',
            autoExclude: autoExclude === 'true',
            role,
            recentActivityOnly: recentActivityOnly === 'true',
            activityMonths: activityMonths ? parseInt(activityMonths) : undefined,
        });
    }
    async getStats() {
        return this.candidateService.getStats();
    }
    async getSources() {
        return this.candidateService.getSources();
    }
    async findOne(id) {
        return this.candidateService.findOne(id);
    }
    async findByUsername(username) {
        return this.candidateService.findByUsername(username);
    }
    async rejectCandidate(id, dto) {
        return this.rejectionService.rejectCandidate(id, dto.reason, dto.notes);
    }
    async shortlistCandidate(id) {
        return this.rejectionService.shortlistCandidate(id);
    }
    async undoFeedback(id) {
        return this.rejectionService.undoFeedback(id);
    }
};
exports.CandidateController = CandidateController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('sortBy')),
    __param(3, (0, common_1.Query)('order')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('source')),
    __param(6, (0, common_1.Query)('minScore')),
    __param(7, (0, common_1.Query)('maxScore')),
    __param(8, (0, common_1.Query)('excludeRejected')),
    __param(9, (0, common_1.Query)('autoExclude')),
    __param(10, (0, common_1.Query)('role')),
    __param(11, (0, common_1.Query)('recentActivityOnly')),
    __param(12, (0, common_1.Query)('activityMonths')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CandidateController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CandidateController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('sources'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CandidateController.prototype, "getSources", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CandidateController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('username/:username'),
    __param(0, (0, common_1.Param)('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CandidateController.prototype, "findByUsername", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, feedback_dto_1.RejectCandidateDto]),
    __metadata("design:returntype", Promise)
], CandidateController.prototype, "rejectCandidate", null);
__decorate([
    (0, common_1.Post)(':id/shortlist'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CandidateController.prototype, "shortlistCandidate", null);
__decorate([
    (0, common_1.Post)(':id/undo'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CandidateController.prototype, "undoFeedback", null);
exports.CandidateController = CandidateController = __decorate([
    (0, common_1.Controller)('candidates'),
    __metadata("design:paramtypes", [candidate_service_1.CandidateService,
        rejection_service_1.RejectionService])
], CandidateController);
//# sourceMappingURL=candidate.controller.js.map