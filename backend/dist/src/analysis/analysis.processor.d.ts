import { WorkerHost } from '@nestjs/bullmq';
import { OnModuleInit } from '@nestjs/common';
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
export declare class AnalysisProcessor extends WorkerHost implements OnModuleInit {
    private prisma;
    private solvedAcService;
    private githubAnalysisService;
    private scoringService;
    private eventsGateway;
    private circuitBreaker;
    private readonly logger;
    constructor(prisma: PrismaService, solvedAcService: SolvedAcService, githubAnalysisService: GitHubAnalysisService, scoringService: ScoringService, eventsGateway: EventsGateway, circuitBreaker: CircuitBreakerService);
    onModuleInit(): void;
    process(job: Job<SolvedAcSyncJobData | GitHubAnalysisJobData>): Promise<unknown>;
    private processSolvedAcSync;
    private processGitHubAnalysis;
    private rescoreSyncedCandidates;
    onCompleted(job: Job): void;
    onFailed(job: Job | undefined, error: Error): void;
}
