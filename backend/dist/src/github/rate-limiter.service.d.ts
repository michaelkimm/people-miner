import { ConfigService } from '@nestjs/config';
interface RateLimitState {
    remaining: number;
    limit: number;
    resetAt: number;
}
export declare class RateLimiterService {
    private configService;
    private readonly logger;
    private redis;
    constructor(configService: ConfigService);
    getState(): Promise<RateLimitState>;
    updateFromHeaders(headers: {
        'x-ratelimit-remaining'?: string;
        'x-ratelimit-limit'?: string;
        'x-ratelimit-reset'?: string;
    }): Promise<void>;
    waitForRateLimit(): Promise<void>;
    canMakeRequest(): Promise<{
        allowed: boolean;
        waitMs?: number;
    }>;
    decrementRemaining(): Promise<void>;
    getRemainingRequests(): Promise<number>;
    getStatus(): Promise<{
        remaining: number;
        limit: number;
        resetAt: Date;
        secondsUntilReset: number;
    }>;
    onModuleDestroy(): Promise<void>;
}
export {};
