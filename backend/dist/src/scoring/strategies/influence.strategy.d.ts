import { ScoringStrategy, StrategyScore, CandidateWithRelations } from './scoring-strategy.interface';
export declare class InfluenceStrategy implements ScoringStrategy {
    readonly name = "influence";
    readonly description = "Scores based on community influence: followers, stars, forks";
    readonly defaultWeight = 0.2;
    calculate(candidate: CandidateWithRelations): Promise<StrategyScore>;
    private scoreFollowers;
    private scoreStars;
    private scoreForks;
    private scoreNetwork;
}
