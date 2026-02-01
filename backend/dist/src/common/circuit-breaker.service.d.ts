export declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
export interface CircuitBreakerConfig {
    name: string;
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenMaxAttempts: number;
}
export declare class RateLimitError extends Error {
    readonly resetAtMs: number;
    constructor(message: string, resetAtMs: number);
}
export declare class CircuitBreakerService {
    private readonly logger;
    private circuits;
    private configs;
    register(config: CircuitBreakerConfig): void;
    execute<T>(name: string, operation: () => Promise<T>, fallback?: () => T): Promise<T | null>;
    private onSuccess;
    private onFailure;
    private isRateLimitError;
    getStatus(name: string): {
        state: CircuitState;
        failures: number;
        waitTimeMs: number;
    } | null;
    reset(name: string): void;
}
