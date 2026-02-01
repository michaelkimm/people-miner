import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ScoringStrategy,
  StrategyConfig,
  SCORING_STRATEGY,
} from './scoring-strategy.interface';

@Injectable()
export class StrategyRegistry {
  private readonly logger = new Logger(StrategyRegistry.name);
  private readonly strategies: Map<string, ScoringStrategy> = new Map();
  private readonly configs: Map<string, StrategyConfig> = new Map();

  constructor(
    @Inject(SCORING_STRATEGY)
    strategies: ScoringStrategy[],
  ) {
    for (const strategy of strategies) {
      this.register(strategy);
    }
  }

  register(strategy: ScoringStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.configs.set(strategy.name, {
      name: strategy.name,
      enabled: true,
      weight: strategy.defaultWeight,
    });
    this.logger.log(`Registered strategy: ${strategy.name} (weight: ${strategy.defaultWeight})`);
  }

  getStrategy(name: string): ScoringStrategy | undefined {
    return this.strategies.get(name);
  }

  getEnabledStrategies(): Array<{ strategy: ScoringStrategy; config: StrategyConfig }> {
    const result: Array<{ strategy: ScoringStrategy; config: StrategyConfig }> = [];

    for (const [name, strategy] of this.strategies) {
      const config = this.configs.get(name);
      if (config?.enabled) {
        result.push({ strategy, config });
      }
    }

    return result;
  }

  getAllStrategies(): Array<{ strategy: ScoringStrategy; config: StrategyConfig }> {
    const result: Array<{ strategy: ScoringStrategy; config: StrategyConfig }> = [];

    for (const [name, strategy] of this.strategies) {
      const config = this.configs.get(name)!;
      result.push({ strategy, config });
    }

    return result;
  }

  updateConfig(name: string, updates: Partial<StrategyConfig>): void {
    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`Strategy ${name} not found`);
    }

    this.configs.set(name, { ...config, ...updates });
    this.logger.log(`Updated strategy config: ${name}`, updates);
  }

  setWeight(name: string, weight: number): void {
    if (weight < 0 || weight > 1) {
      throw new Error('Weight must be between 0 and 1');
    }
    this.updateConfig(name, { weight });
  }

  enable(name: string): void {
    this.updateConfig(name, { enabled: true });
  }

  disable(name: string): void {
    this.updateConfig(name, { enabled: false });
  }

  getNormalizedWeights(): Map<string, number> {
    const enabled = this.getEnabledStrategies();
    const totalWeight = enabled.reduce((sum, { config }) => sum + config.weight, 0);

    const normalized = new Map<string, number>();
    for (const { config } of enabled) {
      normalized.set(config.name, totalWeight > 0 ? config.weight / totalWeight : 0);
    }

    return normalized;
  }
}
