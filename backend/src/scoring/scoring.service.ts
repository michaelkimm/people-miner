import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  StrategyRegistry,
  ScoringResult,
  CandidateWithRelations,
} from './strategies';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private prisma: PrismaService,
    private strategyRegistry: StrategyRegistry,
  ) {}

  async scoreCandidate(candidateId: string): Promise<ScoringResult> {
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

  async calculateScore(candidate: CandidateWithRelations): Promise<ScoringResult> {
    const enabledStrategies = this.strategyRegistry.getEnabledStrategies();
    const normalizedWeights = this.strategyRegistry.getNormalizedWeights();

    const strategyScores: ScoringResult['strategyScores'] = [];
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
      } catch (error) {
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

  private findStrategyScore(
    scores: ScoringResult['strategyScores'],
    strategyName: string,
  ): number | null {
    const found = scores.find(s => s.strategyName === strategyName);
    return found?.score ?? null;
  }

  async scoreAllCandidates(options?: {
    force?: boolean;
    batchSize?: number;
  }): Promise<{ scored: number; failed: number }> {
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
      } catch (error) {
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

  updateStrategyWeight(name: string, weight: number) {
    this.strategyRegistry.setWeight(name, weight);
  }

  enableStrategy(name: string) {
    this.strategyRegistry.enable(name);
  }

  disableStrategy(name: string) {
    this.strategyRegistry.disable(name);
  }
}
