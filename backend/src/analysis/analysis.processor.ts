import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SolvedAcService } from '../solved-ac/solved-ac.service';
import { GitHubAnalysisService } from '../github/github-analysis.service';
import { ScoringService } from '../scoring/scoring.service';
import { EventsGateway } from '../events/events.gateway';
import { CircuitBreakerService } from '../common/circuit-breaker.service';

export interface SolvedAcSyncJobData {
  jobId: string;
  batchSize?: number;
  force?: boolean;
}

export interface GitHubAnalysisJobData {
  jobId: string;
  batchSize?: number;
  reposPerCandidate?: number;
}

const SOLVED_AC_CIRCUIT = 'solved-ac';
const GITHUB_CIRCUIT = 'github-analysis';

@Processor('analysis-queue')
export class AnalysisProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    private prisma: PrismaService,
    private solvedAcService: SolvedAcService,
    private githubAnalysisService: GitHubAnalysisService,
    private scoringService: ScoringService,
    private eventsGateway: EventsGateway,
    private circuitBreaker: CircuitBreakerService,
  ) {
    super();
  }

  onModuleInit() {
    this.circuitBreaker.register({
      name: SOLVED_AC_CIRCUIT,
      failureThreshold: 3,
      resetTimeoutMs: 60000,
      halfOpenMaxAttempts: 2,
    });

    this.circuitBreaker.register({
      name: GITHUB_CIRCUIT,
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      halfOpenMaxAttempts: 3,
    });
  }

  async process(job: Job<SolvedAcSyncJobData | GitHubAnalysisJobData>): Promise<unknown> {
    if (job.name === 'sync-solved-ac') {
      return this.processSolvedAcSync(job as Job<SolvedAcSyncJobData>);
    } else if (job.name === 'analyze-github') {
      return this.processGitHubAnalysis(job as Job<GitHubAnalysisJobData>);
    }
    throw new Error(`Unknown job type: ${job.name}`);
  }

  private async processSolvedAcSync(job: Job<SolvedAcSyncJobData>) {
    const { jobId, batchSize = 100, force = false } = job.data;
    
    this.logger.log(`Starting solved.ac sync (batchSize: ${batchSize}, force: ${force})`);
    this.eventsGateway.sendProgress({
      jobId,
      status: 'processing',
      message: 'solved.ac 동기화 시작...',
    });

    const candidates = await this.prisma.candidate.findMany({
      where: force ? {} : { solvedAcProfile: null },
      select: { id: true, githubUsername: true, bio: true, blog: true },
      take: batchSize,
    });

    let synced = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      
      const result = await this.circuitBreaker.execute(
        SOLVED_AC_CIRCUIT,
        async () => {
          const success = await this.solvedAcService.syncCandidateSolvedAc(candidate.id);
          return success;
        },
      );

      if (result === true) {
        synced++;
      } else if (result === false) {
        skipped++;
      } else {
        failed++;
      }

      if ((i + 1) % 10 === 0) {
        this.eventsGateway.sendProgress({
          jobId,
          status: 'processing',
          message: `solved.ac 동기화 중... (${i + 1}/${candidates.length})`,
          progress: Math.round(((i + 1) / candidates.length) * 100),
        });
      }
    }

    this.eventsGateway.sendProgress({
      jobId,
      status: 'processing',
      message: `solved.ac 완료 (${synced}명). 재스코어링 중...`,
    });

    const scoreResult = await this.rescoreSyncedCandidates(candidates.map(c => c.id));

    this.eventsGateway.sendProgress({
      jobId,
      status: 'finished',
      message: `완료! solved.ac: ${synced}명 동기화, ${scoreResult.scored}명 재스코어링`,
    });

    return { synced, skipped, failed, rescored: scoreResult.scored };
  }

  private async processGitHubAnalysis(job: Job<GitHubAnalysisJobData>) {
    const { jobId, batchSize = 50, reposPerCandidate = 5 } = job.data;

    this.logger.log(`Starting GitHub analysis (batchSize: ${batchSize}, reposPerCandidate: ${reposPerCandidate})`);
    this.eventsGateway.sendProgress({
      jobId,
      status: 'processing',
      message: 'GitHub 레포 분석 시작...',
    });

    const candidates = await this.prisma.candidate.findMany({
      where: {
        repositories: {
          some: { analysis: null },
        },
      },
      select: { id: true, githubUsername: true },
      take: batchSize,
    });

    let analyzedRepos = 0;
    let analyzedCandidates = 0;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];

      const repos = await this.prisma.repository.findMany({
        where: { candidateId: candidate.id, analysis: null },
        select: { id: true, fullName: true },
        take: reposPerCandidate,
        orderBy: { starCount: 'desc' },
      });

      for (const repo of repos) {
        const result = await this.circuitBreaker.execute(
          GITHUB_CIRCUIT,
          async () => {
            await this.githubAnalysisService.analyzeAndSaveRepository(repo.id);
            return true;
          },
        );

        if (result) {
          analyzedRepos++;
        }
      }

      analyzedCandidates++;

      if ((i + 1) % 5 === 0) {
        this.eventsGateway.sendProgress({
          jobId,
          status: 'processing',
          message: `GitHub 분석 중... (${analyzedCandidates}/${candidates.length}명, ${analyzedRepos}개 레포)`,
          progress: Math.round(((i + 1) / candidates.length) * 100),
        });
      }
    }

    this.eventsGateway.sendProgress({
      jobId,
      status: 'processing',
      message: `분석 완료 (${analyzedRepos}개 레포). 재스코어링 중...`,
    });

    const scoreResult = await this.rescoreSyncedCandidates(candidates.map(c => c.id));

    this.eventsGateway.sendProgress({
      jobId,
      status: 'finished',
      message: `완료! ${analyzedRepos}개 레포 분석, ${scoreResult.scored}명 재스코어링`,
    });

    return { analyzedCandidates, analyzedRepos, rescored: scoreResult.scored };
  }

  private async rescoreSyncedCandidates(candidateIds: string[]): Promise<{ scored: number; failed: number }> {
    let scored = 0;
    let failed = 0;

    for (const id of candidateIds) {
      try {
        await this.scoringService.scoreCandidate(id);
        scored++;
      } catch (error) {
        this.logger.error(`Failed to rescore candidate ${id}:`, error);
        failed++;
      }
    }

    return { scored, failed };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Analysis job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`Analysis job ${job?.id} failed:`, error.message);
  }
}
