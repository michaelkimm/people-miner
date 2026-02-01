import { Candidate, Repository, CandidateSource, SolvedAcProfile, RepoAnalysis, OSSContribution } from '@prisma/client';
export type RepositoryWithAnalysis = Repository & {
    analysis?: RepoAnalysis | null;
};
export type CandidateWithRelations = Candidate & {
    repositories: RepositoryWithAnalysis[];
    sources: CandidateSource[];
    solvedAcProfile?: SolvedAcProfile | null;
    ossContributions?: OSSContribution[];
};
export interface StrategyScore {
    value: number;
    breakdown?: Record<string, number>;
    metadata?: Record<string, unknown>;
}
export interface ScoringStrategy {
    readonly name: string;
    readonly description: string;
    readonly defaultWeight: number;
    calculate(candidate: CandidateWithRelations): Promise<StrategyScore>;
    isApplicable?(candidate: CandidateWithRelations): boolean;
}
export interface StrategyConfig {
    name: string;
    enabled: boolean;
    weight: number;
}
export interface ScoringResult {
    candidateId: string;
    totalScore: number;
    strategyScores: Array<{
        strategyName: string;
        score: number;
        weight: number;
        weightedScore: number;
        breakdown?: Record<string, number>;
    }>;
    scoredAt: Date;
}
export declare const SCORING_STRATEGY: unique symbol;
