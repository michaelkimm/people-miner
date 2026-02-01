"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringModule = exports.SCORE_QUEUE = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const scoring_service_1 = require("./scoring.service");
const scoring_controller_1 = require("./scoring.controller");
const scoring_processor_1 = require("./scoring.processor");
const github_module_1 = require("../github/github.module");
const prisma_module_1 = require("../prisma/prisma.module");
const strategies_1 = require("./strategies");
const solved_ac_module_1 = require("../solved-ac/solved-ac.module");
exports.SCORE_QUEUE = 'score-queue';
const strategies = [
    strategies_1.ActivityStrategy,
    strategies_1.InfluenceStrategy,
    strategies_1.CodeQualityStrategy,
    strategies_1.ProblemSolvingStrategy,
    strategies_1.SolvedAcStrategy,
];
let ScoringModule = class ScoringModule {
};
exports.ScoringModule = ScoringModule;
exports.ScoringModule = ScoringModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: exports.SCORE_QUEUE,
                defaultJobOptions: {
                    attempts: 2,
                    backoff: {
                        type: 'exponential',
                        delay: 3000,
                    },
                    removeOnComplete: 100,
                    removeOnFail: 50,
                },
            }),
            github_module_1.GithubModule,
            solved_ac_module_1.SolvedAcModule,
            prisma_module_1.PrismaModule,
        ],
        controllers: [scoring_controller_1.ScoringController],
        providers: [
            ...strategies,
            {
                provide: strategies_1.SCORING_STRATEGY,
                useFactory: (...strategyInstances) => strategyInstances,
                inject: strategies,
            },
            strategies_1.StrategyRegistry,
            scoring_service_1.ScoringService,
            scoring_processor_1.ScoringProcessor,
        ],
        exports: [scoring_service_1.ScoringService, strategies_1.StrategyRegistry],
    })
], ScoringModule);
//# sourceMappingURL=scoring.module.js.map