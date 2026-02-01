import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScoringService } from './scoring.service';
import { EventsGateway } from '../events/events.gateway';

export interface ScoreJobData {
  candidateId: string;
  jobId: string;
}

export interface ScoreBatchJobData {
  jobId: string;
  force?: boolean;
  batchSize?: number;
}

@Processor('score-queue')
export class ScoringProcessor extends WorkerHost {
  private readonly logger = new Logger(ScoringProcessor.name);

  constructor(
    private scoringService: ScoringService,
    private eventsGateway: EventsGateway,
  ) {
    super();
  }

  async process(job: Job<ScoreJobData | ScoreBatchJobData>): Promise<unknown> {
    if ('candidateId' in job.data) {
      return this.processCandidate(job as Job<ScoreJobData>);
    } else {
      return this.processBatch(job as Job<ScoreBatchJobData>);
    }
  }

  private async processCandidate(job: Job<ScoreJobData>) {
    const { candidateId, jobId } = job.data;

    this.logger.log(`Scoring candidate ${candidateId}`);

    try {
      const result = await this.scoringService.scoreCandidate(candidateId);

      this.eventsGateway.sendProgress({
        jobId,
        status: 'scored',
        message: `후보자 점수 계산 완료: ${result.totalScore.toFixed(1)}점`,
        candidateId,
        score: result.totalScore,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to score candidate ${candidateId}:`, error);
      throw error;
    }
  }

  private async processBatch(job: Job<ScoreBatchJobData>) {
    const { jobId, force = false, batchSize = 100 } = job.data;

    this.logger.log(`Starting batch scoring (force: ${force}, batchSize: ${batchSize})`);

    try {
      this.eventsGateway.sendProgress({
        jobId,
        status: 'processing',
        message: '스코어링 중...',
      });

      const result = await this.scoringService.scoreAllCandidates({ force, batchSize });

      this.eventsGateway.sendProgress({
        jobId,
        status: 'finished',
        message: `완료! 스코어링: ${result.scored}명`,
        scored: result.scored,
        failed: result.failed,
      });

      return result;
    } catch (error) {
      this.logger.error('Batch scoring failed:', error);

      this.eventsGateway.sendProgress({
        jobId,
        status: 'error',
        message: '스코어링 실패',
      });

      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Score job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`Score job ${job?.id} failed:`, error.message);
  }
}
