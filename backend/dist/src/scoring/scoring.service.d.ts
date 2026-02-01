import { PrismaService } from '../prisma/prisma.service';
import { StrategyRegistry, ScoringResult, CandidateWithRelations } from './strategies';
export declare class ScoringService {
    private prisma;
    private strategyRegistry;
    private readonly logger;
    constructor(prisma: PrismaService, strategyRegistry: StrategyRegistry);
    scoreCandidate(candidateId: string): Promise<ScoringResult>;
    calculateScore(candidate: CandidateWithRelations): Promise<ScoringResult>;
    private findStrategyScore;
    scoreAllCandidates(options?: {
        force?: boolean;
        batchSize?: number;
    }): Promise<{
        scored: number;
        failed: number;
    }>;
    getStrategies(): {
        name: string;
        description: string;
        enabled: boolean;
        weight: number;
        defaultWeight: number;
    }[];
    updateStrategyWeight(name: string, weight: number): void;
    enableStrategy(name: string): void;
    disableStrategy(name: string): void;
}
