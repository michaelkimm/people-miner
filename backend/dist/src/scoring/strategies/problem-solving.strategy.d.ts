import { ScoringStrategy, StrategyScore, CandidateWithRelations } from './scoring-strategy.interface';
export declare class ProblemSolvingStrategy implements ScoringStrategy {
    readonly name = "problemSolving";
    readonly description = "Scores based on problem-solving indicators: algorithms, OSS contributions";
    readonly defaultWeight = 0.25;
    private readonly algorithmPatterns;
    private readonly prestigiousOrgs;
    calculate(candidate: CandidateWithRelations): Promise<StrategyScore>;
    private scoreAlgorithmPractice;
    private scoreSourceQuality;
    private scoreProjectComplexity;
    private scoreProblemDiversity;
}
