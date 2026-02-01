import { ScoringStrategy, StrategyConfig } from './scoring-strategy.interface';
export declare class StrategyRegistry {
    private readonly logger;
    private readonly strategies;
    private readonly configs;
    constructor(strategies: ScoringStrategy[]);
    register(strategy: ScoringStrategy): void;
    getStrategy(name: string): ScoringStrategy | undefined;
    getEnabledStrategies(): Array<{
        strategy: ScoringStrategy;
        config: StrategyConfig;
    }>;
    getAllStrategies(): Array<{
        strategy: ScoringStrategy;
        config: StrategyConfig;
    }>;
    updateConfig(name: string, updates: Partial<StrategyConfig>): void;
    setWeight(name: string, weight: number): void;
    enable(name: string): void;
    disable(name: string): void;
    getNormalizedWeights(): Map<string, number>;
}
