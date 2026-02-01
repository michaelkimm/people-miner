import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RateLimitError } from '../common/circuit-breaker.service';

interface RateLimitState {
  remaining: number;
  limit: number;
  resetAt: number;
}

const RATE_LIMIT_KEY = 'github:rate_limit';
const BUFFER_SECONDS = 2;
const MIN_REMAINING_THRESHOLD = 100;

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6380),
    });
  }

  async getState(): Promise<RateLimitState> {
    const data = await this.redis.hgetall(RATE_LIMIT_KEY);

    if (!data || Object.keys(data).length === 0) {
      return {
        remaining: 5000,
        limit: 5000,
        resetAt: Math.floor(Date.now() / 1000) + 3600,
      };
    }

    return {
      remaining: parseInt(data.remaining || '5000'),
      limit: parseInt(data.limit || '5000'),
      resetAt: parseInt(data.resetAt || String(Math.floor(Date.now() / 1000) + 3600)),
    };
  }

  async updateFromHeaders(headers: {
    'x-ratelimit-remaining'?: string;
    'x-ratelimit-limit'?: string;
    'x-ratelimit-reset'?: string;
  }): Promise<void> {
    const remaining = headers['x-ratelimit-remaining'];
    const limit = headers['x-ratelimit-limit'];
    const resetAt = headers['x-ratelimit-reset'];

    const updates: Record<string, string> = {};

    if (remaining !== undefined) updates.remaining = remaining;
    if (limit !== undefined) updates.limit = limit;
    if (resetAt !== undefined) updates.resetAt = resetAt;

    if (Object.keys(updates).length > 0) {
      await this.redis.hset(RATE_LIMIT_KEY, updates);
    }

    if (remaining !== undefined) {
      const rem = parseInt(remaining);
      if (rem <= MIN_REMAINING_THRESHOLD && rem > 0) {
        this.logger.warn(`Rate limit low: ${rem} remaining`);
      } else if (rem === 0) {
        this.logger.warn(`Rate limit exhausted. Resets at ${new Date(parseInt(resetAt || '0') * 1000).toISOString()}`);
      }
    }
  }

  async waitForRateLimit(): Promise<void> {
    const state = await this.getState();
    const now = Math.floor(Date.now() / 1000);

    if (now >= state.resetAt) {
      await this.redis.hset(RATE_LIMIT_KEY, {
        remaining: String(state.limit),
        resetAt: String(now + 3600),
      });
      return;
    }

    if (state.remaining <= 0) {
      const resetAtMs = state.resetAt * 1000;
      throw new RateLimitError(
        `GitHub rate limit exhausted. Resets at ${new Date(resetAtMs).toISOString()}`,
        resetAtMs + BUFFER_SECONDS * 1000,
      );
    }
  }

  async canMakeRequest(): Promise<{ allowed: boolean; waitMs?: number }> {
    const state = await this.getState();
    const now = Math.floor(Date.now() / 1000);

    if (now >= state.resetAt) {
      await this.redis.hset(RATE_LIMIT_KEY, {
        remaining: String(state.limit),
        resetAt: String(now + 3600),
      });
      return { allowed: true };
    }

    if (state.remaining <= 0) {
      const waitMs = (state.resetAt - now + BUFFER_SECONDS) * 1000;
      return { allowed: false, waitMs };
    }

    return { allowed: true };
  }

  async decrementRemaining(): Promise<void> {
    await this.redis.hincrby(RATE_LIMIT_KEY, 'remaining', -1);
  }

  async getRemainingRequests(): Promise<number> {
    const state = await this.getState();
    return state.remaining;
  }

  async getStatus(): Promise<{ remaining: number; limit: number; resetAt: Date; secondsUntilReset: number }> {
    const state = await this.getState();
    const now = Math.floor(Date.now() / 1000);
    return {
      remaining: state.remaining,
      limit: state.limit,
      resetAt: new Date(state.resetAt * 1000),
      secondsUntilReset: Math.max(0, state.resetAt - now),
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
