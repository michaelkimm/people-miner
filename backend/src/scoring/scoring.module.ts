import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScoringService } from './scoring.service';
import { ScoringController } from './scoring.controller';
import { ScoringProcessor } from './scoring.processor';
import { GithubModule } from '../github/github.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  SCORING_STRATEGY,
  StrategyRegistry,
  ActivityStrategy,
  InfluenceStrategy,
  CodeQualityStrategy,
  ProblemSolvingStrategy,
  SolvedAcStrategy,
} from './strategies';
import { SolvedAcModule } from '../solved-ac/solved-ac.module';

export const SCORE_QUEUE = 'score-queue';

const strategies = [
  ActivityStrategy,
  InfluenceStrategy,
  CodeQualityStrategy,
  ProblemSolvingStrategy,
  SolvedAcStrategy,
];

@Module({
  imports: [
    BullModule.registerQueue({
      name: SCORE_QUEUE,
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
    GithubModule,
    SolvedAcModule,
    PrismaModule,
  ],
  controllers: [ScoringController],
  providers: [
    ...strategies,
    {
      provide: SCORING_STRATEGY,
      useFactory: (...strategyInstances) => strategyInstances,
      inject: strategies,
    },
    StrategyRegistry,
    ScoringService,
    ScoringProcessor,
  ],
  exports: [ScoringService, StrategyRegistry],
})
export class ScoringModule {}
