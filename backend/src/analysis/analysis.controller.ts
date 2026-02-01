import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CircuitBreakerService } from '../common/circuit-breaker.service';
import { RateLimiterService } from '../github/rate-limiter.service';

@Controller('analysis')
export class AnalysisController {
  constructor(
    @InjectQueue('analysis-queue') private analysisQueue: Queue,
    private circuitBreaker: CircuitBreakerService,
    private rateLimiter: RateLimiterService,
  ) {}

  @Post('solved-ac/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async startSolvedAcSync(
    @Body() body?: { batchSize?: number; force?: boolean },
  ) {
    const jobId = `solved-ac-sync-${Date.now()}`;

    await this.analysisQueue.add(
      'sync-solved-ac',
      {
        jobId,
        batchSize: body?.batchSize ?? 100,
        force: body?.force ?? false,
      },
      { jobId },
    );

    return {
      jobId,
      message: 'solved.ac 동기화 작업이 시작되었습니다',
    };
  }

  @Post('github/analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  async startGitHubAnalysis(
    @Body() body?: { batchSize?: number; reposPerCandidate?: number },
  ) {
    const jobId = `github-analysis-${Date.now()}`;

    await this.analysisQueue.add(
      'analyze-github',
      {
        jobId,
        batchSize: body?.batchSize ?? 50,
        reposPerCandidate: body?.reposPerCandidate ?? 5,
      },
      { jobId },
    );

    return {
      jobId,
      message: 'GitHub 레포 분석 작업이 시작되었습니다',
    };
  }

  @Get('status')
  async getStatus() {
    const githubRateLimit = await this.rateLimiter.getStatus();
    const solvedAcCircuit = this.circuitBreaker.getStatus('solved-ac');
    const githubCircuit = this.circuitBreaker.getStatus('github-analysis');

    const queueCounts = await this.analysisQueue.getJobCounts();

    return {
      queue: {
        waiting: queueCounts.waiting,
        active: queueCounts.active,
        completed: queueCounts.completed,
        failed: queueCounts.failed,
      },
      rateLimits: {
        github: githubRateLimit,
      },
      circuitBreakers: {
        solvedAc: solvedAcCircuit,
        github: githubCircuit,
      },
    };
  }

  @Post('circuit-breaker/reset')
  resetCircuitBreaker(@Body() body: { name: string }) {
    this.circuitBreaker.reset(body.name);
    return { success: true, message: `Circuit breaker '${body.name}' reset` };
  }
}
