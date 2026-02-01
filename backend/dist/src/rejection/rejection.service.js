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
var RejectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let RejectionService = RejectionService_1 = class RejectionService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(RejectionService_1.name);
    }
    async rejectCandidate(candidateId, reason, notes) {
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
            include: {
                sources: true,
                repositories: { take: 1, orderBy: { starCount: 'desc' } },
            },
        });
        if (!candidate) {
            throw new common_1.NotFoundException(`Candidate ${candidateId} not found`);
        }
        const snapshot = {
            totalScore: candidate.totalScore,
            followers: candidate.followers,
            publicRepos: candidate.publicRepos,
            totalCommits: candidate.totalCommits,
            company: candidate.company,
            location: candidate.location,
            primaryLanguage: candidate.repositories[0]?.language || null,
            sources: candidate.sources.map((s) => s.sourceName),
        };
        await this.prisma.$transaction([
            this.prisma.candidate.update({
                where: { id: candidateId },
                data: { status: client_1.CandidateStatus.REJECTED },
            }),
            this.prisma.candidateFeedback.create({
                data: {
                    candidateId,
                    action: client_1.FeedbackAction.REJECT,
                    reason,
                    notes,
                    snapshot: snapshot,
                },
            }),
        ]);
        this.logger.log(`Candidate ${candidateId} rejected with reason: ${reason}`);
        return { success: true, status: client_1.CandidateStatus.REJECTED };
    }
    async shortlistCandidate(candidateId) {
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
        });
        if (!candidate) {
            throw new common_1.NotFoundException(`Candidate ${candidateId} not found`);
        }
        await this.prisma.$transaction([
            this.prisma.candidate.update({
                where: { id: candidateId },
                data: { status: client_1.CandidateStatus.SHORTLISTED },
            }),
            this.prisma.candidateFeedback.create({
                data: {
                    candidateId,
                    action: client_1.FeedbackAction.SHORTLIST,
                },
            }),
        ]);
        this.logger.log(`Candidate ${candidateId} shortlisted`);
        return { success: true, status: client_1.CandidateStatus.SHORTLISTED };
    }
    async undoFeedback(candidateId) {
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
        });
        if (!candidate) {
            throw new common_1.NotFoundException(`Candidate ${candidateId} not found`);
        }
        await this.prisma.$transaction([
            this.prisma.candidate.update({
                where: { id: candidateId },
                data: { status: client_1.CandidateStatus.ACTIVE },
            }),
            this.prisma.candidateFeedback.create({
                data: {
                    candidateId,
                    action: client_1.FeedbackAction.UNDO,
                },
            }),
        ]);
        this.logger.log(`Candidate ${candidateId} feedback undone`);
        return { success: true, status: client_1.CandidateStatus.ACTIVE };
    }
    async getStats() {
        const [totalRejected, totalShortlisted, activeRules, reasonCounts, recentRejections,] = await Promise.all([
            this.prisma.candidate.count({
                where: { status: client_1.CandidateStatus.REJECTED },
            }),
            this.prisma.candidate.count({
                where: { status: client_1.CandidateStatus.SHORTLISTED },
            }),
            this.prisma.rejectionRule.count({
                where: { enabled: true },
            }),
            this.prisma.candidateFeedback.groupBy({
                by: ['reason'],
                where: {
                    action: client_1.FeedbackAction.REJECT,
                    reason: { not: null },
                },
                _count: { reason: true },
            }),
            this.prisma.candidateFeedback.count({
                where: {
                    action: client_1.FeedbackAction.REJECT,
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                },
            }),
        ]);
        const totalReasons = reasonCounts.reduce((sum, r) => sum + r._count.reason, 0);
        const reasonDistribution = reasonCounts
            .filter((r) => r.reason !== null)
            .map((r) => ({
            reason: r.reason,
            count: r._count.reason,
            percentage: totalReasons > 0
                ? Math.round((r._count.reason / totalReasons) * 100)
                : 0,
        }))
            .sort((a, b) => b.count - a.count);
        return {
            totalRejected,
            totalShortlisted,
            activeRules,
            reasonDistribution,
            recentRejections,
        };
    }
    async getRules() {
        return this.prisma.rejectionRule.findMany({
            orderBy: [{ enabled: 'desc' }, { confidence: 'desc' }],
        });
    }
    async createRule(dto) {
        return this.prisma.rejectionRule.create({
            data: {
                name: dto.name,
                description: dto.description,
                conditions: dto.conditions,
                autoGenerated: false,
            },
        });
    }
    async updateRule(id, dto) {
        const rule = await this.prisma.rejectionRule.findUnique({
            where: { id },
        });
        if (!rule) {
            throw new common_1.NotFoundException(`Rule ${id} not found`);
        }
        return this.prisma.rejectionRule.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.conditions && {
                    conditions: dto.conditions,
                }),
                ...(dto.enabled !== undefined && { enabled: dto.enabled }),
            },
        });
    }
    async deleteRule(id) {
        const rule = await this.prisma.rejectionRule.findUnique({
            where: { id },
        });
        if (!rule) {
            throw new common_1.NotFoundException(`Rule ${id} not found`);
        }
        await this.prisma.rejectionRule.delete({ where: { id } });
        return { success: true };
    }
    async checkAutoExclude(candidateId) {
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
            include: {
                sources: true,
                repositories: { take: 1, orderBy: { starCount: 'desc' } },
            },
        });
        if (!candidate) {
            return { shouldExclude: false, matchedRules: [] };
        }
        const enabledRules = await this.prisma.rejectionRule.findMany({
            where: { enabled: true },
        });
        const matchedRules = [];
        for (const rule of enabledRules) {
            const conditions = rule.conditions;
            const matches = this.evaluateConditions(candidate, conditions);
            if (matches) {
                matchedRules.push(rule.name);
            }
        }
        return {
            shouldExclude: matchedRules.length > 0,
            matchedRules,
        };
    }
    evaluateConditions(candidate, conditions) {
        for (const condition of conditions) {
            const value = this.getCandidateFieldValue(candidate, condition.field);
            const matches = this.evaluateCondition(value, condition);
            if (!matches) {
                return false;
            }
        }
        return conditions.length > 0;
    }
    getCandidateFieldValue(candidate, field) {
        switch (field) {
            case 'totalScore':
                return candidate.totalScore;
            case 'followers':
                return candidate.followers;
            case 'publicRepos':
                return candidate.publicRepos;
            case 'totalCommits':
                return candidate.totalCommits;
            case 'company':
                return candidate.company;
            case 'location':
                return candidate.location;
            case 'primaryLanguage':
                return candidate.repositories[0]?.language;
            case 'sources':
                return candidate.sources.map((s) => s.sourceName);
            default:
                return undefined;
        }
    }
    evaluateCondition(value, condition) {
        const { operator, value: conditionValue } = condition;
        if (value === null || value === undefined) {
            return operator === '=' && conditionValue === null;
        }
        switch (operator) {
            case '<':
                return value < conditionValue;
            case '>':
                return value > conditionValue;
            case '<=':
                return value <= conditionValue;
            case '>=':
                return value >= conditionValue;
            case '=':
                return value === conditionValue;
            case '!=':
                return value !== conditionValue;
            case 'in':
                return conditionValue.includes(value);
            case 'notIn':
                return !conditionValue.includes(value);
            case 'contains':
                if (Array.isArray(value)) {
                    return value.includes(conditionValue);
                }
                return String(value).includes(String(conditionValue));
            default:
                return false;
        }
    }
};
exports.RejectionService = RejectionService;
exports.RejectionService = RejectionService = RejectionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RejectionService);
//# sourceMappingURL=rejection.service.js.map