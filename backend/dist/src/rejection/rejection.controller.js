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
exports.RejectionController = void 0;
const common_1 = require("@nestjs/common");
const rejection_service_1 = require("./rejection.service");
const rejection_learning_service_1 = require("./rejection-learning.service");
const feedback_dto_1 = require("./dto/feedback.dto");
let RejectionController = class RejectionController {
    constructor(rejectionService, learningService) {
        this.rejectionService = rejectionService;
        this.learningService = learningService;
    }
    async getStats() {
        return this.rejectionService.getStats();
    }
    async getRules() {
        return this.rejectionService.getRules();
    }
    async createRule(dto) {
        return this.rejectionService.createRule(dto);
    }
    async updateRule(id, dto) {
        return this.rejectionService.updateRule(id, dto);
    }
    async deleteRule(id) {
        return this.rejectionService.deleteRule(id);
    }
    async analyzePatterns() {
        const patterns = await this.learningService.analyzePatterns();
        return { patterns };
    }
    async generateRules() {
        const created = await this.learningService.generateRulesFromPatterns();
        return { created };
    }
    async checkAutoExclude(candidateId) {
        return this.rejectionService.checkAutoExclude(candidateId);
    }
};
exports.RejectionController = RejectionController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RejectionController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RejectionController.prototype, "getRules", null);
__decorate([
    (0, common_1.Post)('rules'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [feedback_dto_1.CreateRuleDto]),
    __metadata("design:returntype", Promise)
], RejectionController.prototype, "createRule", null);
__decorate([
    (0, common_1.Patch)('rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, feedback_dto_1.UpdateRuleDto]),
    __metadata("design:returntype", Promise)
], RejectionController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Delete)('rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RejectionController.prototype, "deleteRule", null);
__decorate([
    (0, common_1.Post)('analyze'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RejectionController.prototype, "analyzePatterns", null);
__decorate([
    (0, common_1.Post)('generate-rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RejectionController.prototype, "generateRules", null);
__decorate([
    (0, common_1.Get)('check/:candidateId'),
    __param(0, (0, common_1.Param)('candidateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RejectionController.prototype, "checkAutoExclude", null);
exports.RejectionController = RejectionController = __decorate([
    (0, common_1.Controller)('rejection'),
    __metadata("design:paramtypes", [rejection_service_1.RejectionService,
        rejection_learning_service_1.RejectionLearningService])
], RejectionController);
//# sourceMappingURL=rejection.controller.js.map