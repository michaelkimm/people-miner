import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { GithubModule } from './github/github.module';
import { SolvedAcModule } from './solved-ac/solved-ac.module';
import { CrawlerModule } from './crawler/crawler.module';
import { CandidateModule } from './candidate/candidate.module';
import { ScoringModule } from './scoring/scoring.module';
import { AnalysisModule } from './analysis/analysis.module';
import { EventsModule } from './events/events.module';
import { RejectionModule } from './rejection/rejection.module';
import { FilterModule } from './filter/filter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),

    ScheduleModule.forRoot(),

    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380'),
      },
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
      exclude: ['/api*'],
    }),

    CommonModule,
    PrismaModule,
    FilterModule,
    GithubModule,
    SolvedAcModule,
    CrawlerModule,
    CandidateModule,
    ScoringModule,
    AnalysisModule,
    EventsModule,
    RejectionModule,
  ],
})
export class AppModule {}
