import { ScoringStrategy, StrategyScore, CandidateWithRelations } from './scoring-strategy.interface';
export declare class CodeQualityStrategy implements ScoringStrategy {
    readonly name = "codeQuality";
    readonly description = "Deep analysis of code quality based on actual repo structure";
    readonly defaultWeight = 0.3;
    calculate(candidate: CandidateWithRelations): Promise<StrategyScore>;
    private scoreTestingCulture;
    private scoreLegacyTesting;
    private scoreCICDMaturity;
    private scoreLegacyCI;
    private scoreDocumentation;
    private scoreCommitQuality;
    private scoreOSSContributions;
    private scoreTypeSafety;
}
