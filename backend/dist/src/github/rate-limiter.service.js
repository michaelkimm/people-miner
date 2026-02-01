"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RateLimiterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiterService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const circuit_breaker_service_1 = require("../common/circuit-breaker.service");
const RATE_LIMIT_KEY = 'github:rate_limit';
const BUFFER_SECONDS = 2;
const MIN_REMAINING_THRESHOLD = 100;
let RateLimiterService = RateLimiterService_1 = class RateLimiterService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RateLimiterService_1.name);
        this.redis = new ioredis_1.default({
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: this.configService.get('REDIS_PORT', 6380),
        });
    }
    async getState() {
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
    async updateFromHeaders(headers) {
        const remaining = headers['x-ratelimit-remaining'];
        const limit = headers['x-ratelimit-limit'];
        const resetAt = headers['x-ratelimit-reset'];
        const updates = {};
        if (remaining !== undefined)
            updates.remaining = remaining;
        if (limit !== undefined)
            updates.limit = limit;
        if (resetAt !== undefined)
            updates.resetAt = resetAt;
        if (Object.keys(updates).length > 0) {
            await this.redis.hset(RATE_LIMIT_KEY, updates);
        }
        if (remaining !== undefined) {
            const rem = parseInt(remaining);
            if (rem <= MIN_REMAINING_THRESHOLD && rem > 0) {
                this.logger.warn(`Rate limit low: ${rem} remaining`);
            }
            else if (rem === 0) {
                this.logger.warn(`Rate limit exhausted. Resets at ${new Date(parseInt(resetAt || '0') * 1000).toISOString()}`);
            }
        }
    }
    async waitForRateLimit() {
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
            throw new circuit_breaker_service_1.RateLimitError(`GitHub rate limit exhausted. Resets at ${new Date(resetAtMs).toISOString()}`, resetAtMs + BUFFER_SECONDS * 1000);
        }
    }
    async canMakeRequest() {
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
    async decrementRemaining() {
        await this.redis.hincrby(RATE_LIMIT_KEY, 'remaining', -1);
    }
    async getRemainingRequests() {
        const state = await this.getState();
        return state.remaining;
    }
    async getStatus() {
        const state = await this.getState();
        const now = Math.floor(Date.now() / 1000);
        return {
            remaining: state.remaining,
            limit: state.limit,
            resetAt: new Date(state.resetAt * 1000),
            secondsUntilReset: Math.max(0, state.resetAt - now),
        };
    }
    async onModuleDestroy() {
        await this.redis.quit();
    }
};
exports.RateLimiterService = RateLimiterService;
exports.RateLimiterService = RateLimiterService = RateLimiterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RateLimiterService);
//# sourceMappingURL=rate-limiter.service.js.map