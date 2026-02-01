import { ScoringStrategy, StrategyScore, CandidateWithRelations } from './scoring-strategy.interface';
export declare class ActivityStrategy implements ScoringStrategy {
    readonly name = "activity";
    readonly description = "Scores based on GitHub activity: repos, commits, contributions";
    readonly defaultWeight = 0.25;
    calculate(candidate: CandidateWithRelations): Promise<StrategyScore>;
    private scoreRepositoryCount;
    private scoreRepositoryQuality;
    private scoreLanguageDiversity;
    private scoreCommitActivity;
    private scoreTilBonus;
    private scoreLongTermProject;
}
