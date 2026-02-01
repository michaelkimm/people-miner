import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { GitHubAnalysisService } from './github-analysis.service';
import { RateLimiterService } from './rate-limiter.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GithubService, GitHubAnalysisService, RateLimiterService],
  exports: [GithubService, GitHubAnalysisService, RateLimiterService],
})
export class GithubModule {}
