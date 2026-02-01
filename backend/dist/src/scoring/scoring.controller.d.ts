import { Queue } from 'bullmq';
import { ScoringService } from './scoring.service';
export declare class ScoringController {
    private scoringService;
    private scoreQueue;
    constructor(scoringService: ScoringService, scoreQueue: Queue);
    startScoring(body?: {
        force?: boolean;
        batchSize?: number;
    }): Promise<{
        jobId: string;
        message: string;
    }>;
    scoreCandidate(candidateId: string): Promise<{
        jobId: string;
        candidateId: string;
        message: string;
    }>;
    getStrategies(): {
        name: string;
        description: string;
        enabled: boolean;
        weight: number;
        defaultWeight: number;
    }[];
    updateWeight(name: string, body: {
        weight: number;
    }): {
        success: boolean;
        name: string;
        weight: number;
    };
    enableStrategy(name: string): {
        success: boolean;
        name: string;
        enabled: boolean;
    };
    disableStrategy(name: string): {
        success: boolean;
        name: string;
        enabled: boolean;
    };
}
