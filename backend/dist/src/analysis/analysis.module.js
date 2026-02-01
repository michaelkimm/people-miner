"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisModule = exports.ANALYSIS_QUEUE = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const analysis_controller_1 = require("./analysis.controller");
const analysis_processor_1 = require("./analysis.processor");
const github_module_1 = require("../github/github.module");
const solved_ac_module_1 = require("../solved-ac/solved-ac.module");
const scoring_module_1 = require("../scoring/scoring.module");
const prisma_module_1 = require("../prisma/prisma.module");
exports.ANALYSIS_QUEUE = 'analysis-queue';
let AnalysisModule = class AnalysisModule {
};
exports.AnalysisModule = AnalysisModule;
exports.AnalysisModule = AnalysisModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: exports.ANALYSIS_QUEUE,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    removeOnComplete: 50,
                    removeOnFail: 20,
                },
            }),
            github_module_1.GithubModule,
            solved_ac_module_1.SolvedAcModule,
            scoring_module_1.ScoringModule,
            prisma_module_1.PrismaModule,
        ],
        controllers: [analysis_controller_1.AnalysisController],
        providers: [analysis_processor_1.AnalysisProcessor],
    })
], AnalysisModule);
//# sourceMappingURL=analysis.module.js.map