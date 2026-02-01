import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

interface CircuitStatus {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  halfOpenAttempts: number;
  rateLimitResetAt: number | null;
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly resetAtMs: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits = new Map<string, CircuitStatus>();
  private configs = new Map<string, CircuitBreakerConfig>();

  register(config: CircuitBreakerConfig): void {
    this.configs.set(config.name, config);
    this.circuits.set(config.name, {
      state: CircuitState.CLOSED,
      failures: 0,
      lastFailureTime: 0,
      halfOpenAttempts: 0,
      rateLimitResetAt: null,
    });
  }

  async execute<T>(
    name: string,
    operation: () => Promise<T>,
    fallback?: () => T,
  ): Promise<T | null> {
    const config = this.configs.get(name);
    const status = this.circuits.get(name);

    if (!config || !status) {
      throw new Error(`Circuit breaker '${name}' not registered`);
    }

    if (status.state === CircuitState.OPEN) {
      const now = Date.now();
      
      if (status.rateLimitResetAt && now < status.rateLimitResetAt) {
        const waitTime = status.rateLimitResetAt - now;
        this.logger.log(`Circuit '${name}' waiting for rate limit reset: ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        const timeSinceLastFailure = now - status.lastFailureTime;
        if (timeSinceLastFailure < config.resetTimeoutMs) {
          const waitTime = config.resetTimeoutMs - timeSinceLastFailure;
          this.logger.debug(`Circuit '${name}' is OPEN. Waiting ${Math.ceil(waitTime / 1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      status.state = CircuitState.HALF_OPEN;
      status.halfOpenAttempts = 0;
      status.rateLimitResetAt = null;
      this.logger.log(`Circuit '${name}' transitioning to HALF_OPEN`);
    }

    try {
      const result = await operation();
      this.onSuccess(name);
      return result;
    } catch (error) {
      this.onFailure(name, error);
      if (fallback) {
        return fallback();
      }
      return null;
    }
  }

  private onSuccess(name: string): void {
    const status = this.circuits.get(name);
    if (!status) return;

    if (status.state === CircuitState.HALF_OPEN) {
      status.halfOpenAttempts++;
      const config = this.configs.get(name)!;
      
      if (status.halfOpenAttempts >= config.halfOpenMaxAttempts) {
        status.state = CircuitState.CLOSED;
        status.failures = 0;
        this.logger.log(`Circuit '${name}' recovered, now CLOSED`);
      }
    } else {
      status.failures = 0;
    }
  }

  private onFailure(name: string, error: unknown): void {
    const status = this.circuits.get(name);
    const config = this.configs.get(name);
    if (!status || !config) return;

    status.failures++;
    status.lastFailureTime = Date.now();

    const isRateLimitErr = error instanceof RateLimitError;
    const isGenericRateLimitError = this.isRateLimitError(error);

    if (isRateLimitErr || isGenericRateLimitError || status.failures >= config.failureThreshold) {
      status.state = CircuitState.OPEN;
      
      if (isRateLimitErr) {
        status.rateLimitResetAt = error.resetAtMs;
        const waitSeconds = Math.ceil((error.resetAtMs - Date.now()) / 1000);
        this.logger.warn(
          `Circuit '${name}' opened due to rate limit. Reset at ${new Date(error.resetAtMs).toISOString()} (${waitSeconds}s)`
        );
      } else {
        this.logger.warn(
          `Circuit '${name}' opened after ${status.failures} failures. Will retry in ${Math.ceil(config.resetTimeoutMs / 1000)}s`
        );
      }
    }
  }

  private isRateLimitError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      const err = error as { status?: number; message?: string };
      return err.status === 429 || err.status === 403 || 
             (err.message?.toLowerCase().includes('rate limit') ?? false);
    }
    return false;
  }

  getStatus(name: string): { state: CircuitState; failures: number; waitTimeMs: number } | null {
    const status = this.circuits.get(name);
    const config = this.configs.get(name);
    if (!status || !config) return null;

    let waitTimeMs = 0;
    if (status.state === CircuitState.OPEN) {
      waitTimeMs = Math.max(0, config.resetTimeoutMs - (Date.now() - status.lastFailureTime));
    }

    return {
      state: status.state,
      failures: status.failures,
      waitTimeMs,
    };
  }

  reset(name: string): void {
    const status = this.circuits.get(name);
    if (status) {
      status.state = CircuitState.CLOSED;
      status.failures = 0;
      status.lastFailureTime = 0;
      status.halfOpenAttempts = 0;
      this.logger.log(`Circuit '${name}' manually reset`);
    }
  }
}
