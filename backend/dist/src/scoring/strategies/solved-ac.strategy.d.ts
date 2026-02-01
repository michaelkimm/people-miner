import { ScoringStrategy, StrategyScore, CandidateWithRelations } from './scoring-strategy.interface';
export declare class SolvedAcStrategy implements ScoringStrategy {
    readonly name = "solvedAc";
    readonly description = "Scores based on solved.ac tier and algorithm depth";
    readonly defaultWeight = 0.35;
    isApplicable(candidate: CandidateWithRelations): boolean;
    calculate(candidate: CandidateWithRelations): Promise<StrategyScore>;
    private scoreTier;
    private scoreAlgorithmDepth;
    private scoreConsistency;
    private scoreClass;
}
