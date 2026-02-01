"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var StrategyRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyRegistry = void 0;
const common_1 = require("@nestjs/common");
const scoring_strategy_interface_1 = require("./scoring-strategy.interface");
let StrategyRegistry = StrategyRegistry_1 = class StrategyRegistry {
    constructor(strategies) {
        this.logger = new common_1.Logger(StrategyRegistry_1.name);
        this.strategies = new Map();
        this.configs = new Map();
        for (const strategy of strategies) {
            this.register(strategy);
        }
    }
    register(strategy) {
        this.strategies.set(strategy.name, strategy);
        this.configs.set(strategy.name, {
            name: strategy.name,
            enabled: true,
            weight: strategy.defaultWeight,
        });
        this.logger.log(`Registered strategy: ${strategy.name} (weight: ${strategy.defaultWeight})`);
    }
    getStrategy(name) {
        return this.strategies.get(name);
    }
    getEnabledStrategies() {
        const result = [];
        for (const [name, strategy] of this.strategies) {
            const config = this.configs.get(name);
            if (config?.enabled) {
                result.push({ strategy, config });
            }
        }
        return result;
    }
    getAllStrategies() {
        const result = [];
        for (const [name, strategy] of this.strategies) {
            const config = this.configs.get(name);
            result.push({ strategy, config });
        }
        return result;
    }
    updateConfig(name, updates) {
        const config = this.configs.get(name);
        if (!config) {
            throw new Error(`Strategy ${name} not found`);
        }
        this.configs.set(name, { ...config, ...updates });
        this.logger.log(`Updated strategy config: ${name}`, updates);
    }
    setWeight(name, weight) {
        if (weight < 0 || weight > 1) {
            throw new Error('Weight must be between 0 and 1');
        }
        this.updateConfig(name, { weight });
    }
    enable(name) {
        this.updateConfig(name, { enabled: true });
    }
    disable(name) {
        this.updateConfig(name, { enabled: false });
    }
    getNormalizedWeights() {
        const enabled = this.getEnabledStrategies();
        const totalWeight = enabled.reduce((sum, { config }) => sum + config.weight, 0);
        const normalized = new Map();
        for (const { config } of enabled) {
            normalized.set(config.name, totalWeight > 0 ? config.weight / totalWeight : 0);
        }
        return normalized;
    }
};
exports.StrategyRegistry = StrategyRegistry;
exports.StrategyRegistry = StrategyRegistry = StrategyRegistry_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(scoring_strategy_interface_1.SCORING_STRATEGY)),
    __metadata("design:paramtypes", [Array])
], StrategyRegistry);
//# sourceMappingURL=strategy-registry.js.map