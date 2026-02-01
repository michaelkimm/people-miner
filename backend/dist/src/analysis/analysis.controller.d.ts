import { Queue } from 'bullmq';
import { CircuitBreakerService } from '../common/circuit-breaker.service';
import { RateLimiterService } from '../github/rate-limiter.service';
export declare class AnalysisController {
    private analysisQueue;
    private circuitBreaker;
    private rateLimiter;
    constructor(analysisQueue: Queue, circuitBreaker: CircuitBreakerService, rateLimiter: RateLimiterService);
    startSolvedAcSync(body?: {
        batchSize?: number;
        force?: boolean;
    }): Promise<{
        jobId: string;
        message: string;
    }>;
    startGitHubAnalysis(body?: {
        batchSize?: number;
        reposPerCandidate?: number;
    }): Promise<{
        jobId: string;
        message: string;
    }>;
    getStatus(): Promise<{
        queue: {
            waiting: number;
            active: number;
            completed: number;
            failed: number;
        };
        rateLimits: {
            github: {
                remaining: number;
                limit: number;
                resetAt: Date;
                secondsUntilReset: number;
            };
        };
        circuitBreakers: {
            solvedAc: {
                state: import("../common/circuit-breaker.service").CircuitState;
                failures: number;
                waitTimeMs: number;
            } | null;
            github: {
                state: import("../common/circuit-breaker.service").CircuitState;
                failures: number;
                waitTimeMs: number;
            } | null;
        };
    }>;
    resetCircuitBreaker(body: {
        name: string;
    }): {
        success: boolean;
        message: string;
    };
}
