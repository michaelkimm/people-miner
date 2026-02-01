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
var ScoringService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const strategies_1 = require("./strategies");
let ScoringService = ScoringService_1 = class ScoringService {
    constructor(prisma, strategyRegistry) {
        this.prisma = prisma;
        this.strategyRegistry = strategyRegistry;
        this.logger = new common_1.Logger(ScoringService_1.name);
    }
    async scoreCandidate(candidateId) {
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
            include: {
                repositories: {
                    include: { analysis: true },
                },
                sources: true,
                solvedAcProfile: true,
                ossContributions: true,
            },
        });
        if (!candidate) {
            throw new Error(`Candidate ${candidateId} not found`);
        }
        return this.calculateScore(candidate);
    }
    async calculateScore(candidate) {
        const enabledStrategies = this.strategyRegistry.getEnabledStrategies();
        const normalizedWeights = this.strategyRegistry.getNormalizedWeights();
        const strategyScores = [];
        let totalScore = 0;
        for (const { strategy, config } of enabledStrategies) {
            try {
                if (strategy.isApplicable && !strategy.isApplicable(candidate)) {
                    continue;
                }
                const result = await strategy.calculate(candidate);
                const normalizedWeight = normalizedWeights.get(config.name) || 0;
                const weightedScore = result.value * normalizedWeight;
                strategyScores.push({
                    strategyName: strategy.name,
                    score: result.value,
                    weight: normalizedWeight,
                    weightedScore,
                    breakdown: result.breakdown,
                });
                totalScore += weightedScore;
            }
            catch (error) {
                this.logger.error(`Strategy ${strategy.name} failed for ${candidate.id}:`, error);
            }
        }
        totalScore = Math.round(totalScore * 100) / 100;
        await this.prisma.candidate.update({
            where: { id: candidate.id },
            data: {
                totalScore,
                readabilityScore: this.findStrategyScore(strategyScores, 'codeQuality'),
                problemSolvingScore: this.findStrategyScore(strategyScores, 'problemSolving'),
                cleanCodeScore: this.findStrategyScore(strategyScores, 'activity'),
                solvedAcScore: this.findStrategyScore(strategyScores, 'solvedAc'),
                scoredAt: new Date(),
            },
        });
        return {
            candidateId: candidate.id,
            totalScore,
            strategyScores,
            scoredAt: new Date(),
        };
    }
    findStrategyScore(scores, strategyName) {
        const found = scores.find(s => s.strategyName === strategyName);
        return found?.score ?? null;
    }
    async scoreAllCandidates(options) {
        const { force = false, batchSize = 50 } = options || {};
        const whereClause = force
            ? {}
            : {
                OR: [
                    { scoredAt: null },
                    { scoredAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                ],
            };
        const candidates = await this.prisma.candidate.findMany({
            where: whereClause,
            include: {
                repositories: {
                    include: { analysis: true },
                },
                sources: true,
                solvedAcProfile: true,
                ossContributions: true,
            },
            take: batchSize,
        });
        let scored = 0;
        let failed = 0;
        for (const candidate of candidates) {
            try {
                await this.calculateScore(candidate);
                scored++;
                if (scored % 10 === 0) {
                    this.logger.log(`Scored ${scored}/${candidates.length} candidates`);
                }
            }
            catch (error) {
                this.logger.error(`Failed to score candidate ${candidate.id}:`, error);
                failed++;
            }
        }
        this.logger.log(`Scoring complete: ${scored} scored, ${failed} failed`);
        return { scored, failed };
    }
    getStrategies() {
        return this.strategyRegistry.getAllStrategies().map(({ strategy, config }) => ({
            name: strategy.name,
            description: strategy.description,
            enabled: config.enabled,
            weight: config.weight,
            defaultWeight: strategy.defaultWeight,
        }));
    }
    updateStrategyWeight(name, weight) {
        this.strategyRegistry.setWeight(name, weight);
    }
    enableStrategy(name) {
        this.strategyRegistry.enable(name);
    }
    disableStrategy(name) {
        this.strategyRegistry.disable(name);
    }
};
exports.ScoringService = ScoringService;
exports.ScoringService = ScoringService = ScoringService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        strategies_1.StrategyRegistry])
], ScoringService);
//# sourceMappingURL=scoring.service.js.map