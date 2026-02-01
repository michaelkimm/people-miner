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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const tech_stack_filter_service_1 = require("../filter/tech-stack-filter.service");
let CandidateService = class CandidateService {
    constructor(prisma, techStackFilter) {
        this.prisma = prisma;
        this.techStackFilter = techStackFilter;
    }
    async findAll(options) {
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const sortBy = options?.sortBy || 'totalScore';
        const order = options?.order || 'desc';
        const skip = (page - 1) * limit;
        const whereClause = {};
        if (sortBy === 'totalScore') {
            whereClause.totalScore = { not: null };
        }
        if (options?.search) {
            whereClause.OR = [
                { githubUsername: { contains: options.search, mode: 'insensitive' } },
                { name: { contains: options.search, mode: 'insensitive' } },
                { company: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        if (options?.source) {
            whereClause.sources = { some: { sourceName: options.source } };
        }
        if (options?.minScore !== undefined || options?.maxScore !== undefined) {
            whereClause.totalScore = {
                ...(whereClause.totalScore || {}),
                ...(options.minScore !== undefined ? { gte: options.minScore } : {}),
                ...(options.maxScore !== undefined ? { lte: options.maxScore } : {}),
            };
        }
        if (options?.excludeRejected) {
            whereClause.status = { not: client_1.CandidateStatus.REJECTED };
        }
        if (options?.recentActivityOnly) {
            const months = options.activityMonths || 6;
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - months);
            whereClause.lastActivityAt = { gte: cutoffDate };
        }
        let candidates = await this.prisma.candidate.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [sortBy]: order },
            include: {
                sources: true,
                repositories: {
                    take: 5,
                    orderBy: { starCount: 'desc' },
                },
                solvedAcProfile: true,
            },
        });
        if (options?.autoExclude) {
            const enabledRules = await this.prisma.rejectionRule.findMany({
                where: { enabled: true },
            });
            if (enabledRules.length > 0) {
                candidates = candidates.filter((candidate) => {
                    for (const rule of enabledRules) {
                        const conditions = rule.conditions;
                        const matchesRule = conditions.every((condition) => {
                            const candidateValue = this.getCandidateFieldValue(candidate, condition.field);
                            return this.evaluateCondition(candidateValue, condition.operator, condition.value);
                        });
                        if (matchesRule) {
                            return false;
                        }
                    }
                    return true;
                });
            }
        }
        if (options?.role && options.role !== 'all') {
            candidates = candidates.filter((candidate) => {
                return this.techStackFilter.matchesRoleStrict({
                    repositories: candidate.repositories.map((r) => ({
                        language: r.language,
                        name: r.name,
                        description: r.description,
                    })),
                    bio: candidate.bio,
                    company: candidate.company,
                }, options.role);
            });
        }
        const total = await this.prisma.candidate.count({ where: whereClause });
        return {
            data: candidates,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
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
    evaluateCondition(value, operator, conditionValue) {
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
    async findOne(id) {
        return this.prisma.candidate.findUnique({
            where: { id },
            include: {
                sources: true,
                repositories: {
                    orderBy: { starCount: 'desc' },
                },
                solvedAcProfile: true,
            },
        });
    }
    async findByUsername(username) {
        return this.prisma.candidate.findUnique({
            where: { githubUsername: username },
            include: {
                sources: true,
                repositories: {
                    orderBy: { starCount: 'desc' },
                },
                solvedAcProfile: true,
            },
        });
    }
    async getStats() {
        const [total, withScore, recentlyAdded] = await Promise.all([
            this.prisma.candidate.count(),
            this.prisma.candidate.count({
                where: { totalScore: { not: null } },
            }),
            this.prisma.candidate.count({
                where: { crawledAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            }),
        ]);
        const topCandidates = await this.prisma.candidate.findMany({
            take: 10,
            where: { totalScore: { not: null } },
            orderBy: { totalScore: 'desc' },
            select: {
                id: true,
                githubUsername: true,
                name: true,
                avatarUrl: true,
                totalScore: true,
                company: true,
            },
        });
        return {
            total,
            withScore,
            recentlyAdded,
            topCandidates,
        };
    }
    async getSources() {
        const sources = await this.prisma.candidateSource.groupBy({
            by: ['sourceName'],
            _count: { sourceName: true },
            orderBy: { _count: { sourceName: 'desc' } },
        });
        return sources.map(s => ({
            name: s.sourceName,
            count: s._count.sourceName,
        }));
    }
    async deleteOldCandidates(monthsOld = 6) {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);
        const result = await this.prisma.candidate.deleteMany({
            where: { crawledAt: { lt: cutoffDate } },
        });
        return { deleted: result.count };
    }
};
exports.CandidateService = CandidateService;
exports.CandidateService = CandidateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tech_stack_filter_service_1.TechStackFilterService])
], CandidateService);
//# sourceMappingURL=candidate.service.js.map