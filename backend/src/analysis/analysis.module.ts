import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalysisController } from './analysis.controller';
import { AnalysisProcessor } from './analysis.processor';
import { GithubModule } from '../github/github.module';
import { SolvedAcModule } from '../solved-ac/solved-ac.module';
import { ScoringModule } from '../scoring/scoring.module';
import { PrismaModule } from '../prisma/prisma.module';

export const ANALYSIS_QUEUE = 'analysis-queue';

@Module({
  imports: [
    BullModule.registerQueue({
      name: ANALYSIS_QUEUE,
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
    GithubModule,
    SolvedAcModule,
    ScoringModule,
    PrismaModule,
  ],
  controllers: [AnalysisController],
  providers: [AnalysisProcessor],
})
export class AnalysisModule {}
