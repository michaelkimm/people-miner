"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const common_module_1 = require("./common/common.module");
const prisma_module_1 = require("./prisma/prisma.module");
const github_module_1 = require("./github/github.module");
const solved_ac_module_1 = require("./solved-ac/solved-ac.module");
const crawler_module_1 = require("./crawler/crawler.module");
const candidate_module_1 = require("./candidate/candidate.module");
const scoring_module_1 = require("./scoring/scoring.module");
const analysis_module_1 = require("./analysis/analysis.module");
const events_module_1 = require("./events/events.module");
const rejection_module_1 = require("./rejection/rejection.module");
const filter_module_1 = require("./filter/filter.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '../.env',
            }),
            schedule_1.ScheduleModule.forRoot(),
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6380'),
                },
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', '..', 'frontend', 'dist'),
                exclude: ['/api*'],
            }),
            common_module_1.CommonModule,
            prisma_module_1.PrismaModule,
            filter_module_1.FilterModule,
            github_module_1.GithubModule,
            solved_ac_module_1.SolvedAcModule,
            crawler_module_1.CrawlerModule,
            candidate_module_1.CandidateModule,
            scoring_module_1.ScoringModule,
            analysis_module_1.AnalysisModule,
            events_module_1.EventsModule,
            rejection_module_1.RejectionModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map