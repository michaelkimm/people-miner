import { WorkerHost } from '@nestjs/bullmq';
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
export declare class ScoringProcessor extends WorkerHost {
    private scoringService;
    private eventsGateway;
    private readonly logger;
    constructor(scoringService: ScoringService, eventsGateway: EventsGateway);
    process(job: Job<ScoreJobData | ScoreBatchJobData>): Promise<unknown>;
    private processCandidate;
    private processBatch;
    onCompleted(job: Job): void;
    onFailed(job: Job | undefined, error: Error): void;
}
