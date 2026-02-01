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
var GithubService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const rest_1 = require("@octokit/rest");
const rate_limiter_service_1 = require("./rate-limiter.service");
let GithubService = GithubService_1 = class GithubService {
    constructor(configService, rateLimiter) {
        this.configService = configService;
        this.rateLimiter = rateLimiter;
        this.logger = new common_1.Logger(GithubService_1.name);
        this.octokit = new rest_1.Octokit({
            auth: this.configService.get('GITHUB_TOKEN'),
        });
    }
    async waitForRateLimit() {
        const check = await this.rateLimiter.canMakeRequest();
        if (!check.allowed && check.waitMs) {
            this.logger.warn(`Rate limited. Waiting ${check.waitMs}ms`);
            await new Promise((resolve) => setTimeout(resolve, check.waitMs));
        }
    }
    extractRateLimitHeaders(headers) {
        const result = {};
        if (headers['x-ratelimit-remaining'] !== undefined) {
            result['x-ratelimit-remaining'] = String(headers['x-ratelimit-remaining']);
        }
        if (headers['x-ratelimit-limit'] !== undefined) {
            result['x-ratelimit-limit'] = String(headers['x-ratelimit-limit']);
        }
        if (headers['x-ratelimit-reset'] !== undefined) {
            result['x-ratelimit-reset'] = String(headers['x-ratelimit-reset']);
        }
        return result;
    }
    async getUser(username) {
        await this.waitForRateLimit();
        await this.rateLimiter.decrementRemaining();
        try {
            const response = await this.octokit.users.getByUsername({ username });
            await this.rateLimiter.updateFromHeaders(this.extractRateLimitHeaders(response.headers));
            return response.data;
        }
        catch (error) {
            if (error && typeof error === 'object' && 'status' in error) {
                const err = error;
                if (err.status === 404) {
                    return null;
                }
                if (err.response?.headers) {
                    await this.rateLimiter.updateFromHeaders(this.extractRateLimitHeaders(err.response.headers));
                }
            }
            this.logger.error(`Failed to fetch user ${username}:`, error);
            throw error;
        }
    }
    async getUserRepos(username, perPage = 30) {
        await this.waitForRateLimit();
        await this.rateLimiter.decrementRemaining();
        try {
            const response = await this.octokit.repos.listForUser({
                username,
                per_page: perPage,
                sort: 'updated',
                direction: 'desc',
            });
            await this.rateLimiter.updateFromHeaders(this.extractRateLimitHeaders(response.headers));
            return response.data;
        }
        catch (error) {
            if (error && typeof error === 'object' && 'response' in error) {
                const err = error;
                if (err.response?.headers) {
                    await this.rateLimiter.updateFromHeaders(this.extractRateLimitHeaders(err.response.headers));
                }
            }
            this.logger.error(`Failed to fetch repos for ${username}:`, error);
            throw error;
        }
    }
    async getOrgMembers(org, perPage = 100) {
        await this.waitForRateLimit();
        await this.rateLimiter.decrementRemaining();
        try {
            const response = await this.octokit.orgs.listPublicMembers({
                org,
                per_page: perPage,
            });
            await this.rateLimiter.updateFromHeaders(this.extractRateLimitHeaders(response.headers));
            return response.data;
        }
        catch (error) {
            if (error && typeof error === 'object' && 'response' in error) {
                const err = error;
                if (err.response?.headers) {
                    await this.rateLimiter.updateFromHeaders(this.extractRateLimitHeaders(err.response.headers));
                }
            }
            this.logger.error(`Failed to fetch members for org ${org}:`, error);
            throw error;
        }
    }
    async getAllOrgMembers(org) {
        const allMembers = [];
        let page = 1;
        const perPage = 100;
        while (true) {
            await this.waitForRateLimit();
            await this.rateLimiter.decrementRemaining();
            try {
                const response = await this.octokit.orgs.listPublicMembers({
                    org,
                    per_page: perPage,
                    page,
                });
                await this.rateLimiter.updateFromHeaders(this.extractRateLimitHeaders(response.headers));
                const members = response.data;
                allMembers.push(...members);
                if (members.length < perPage) {
                    break;
                }
                page++;
            }
            catch (error) {
                if (error && typeof error === 'object' && 'response' in error) {
                    const err = error;
                    if (err.response?.headers) {
                        await this.rateLimiter.updateFromHeaders(this.extractRateLimitHeaders(err.response.headers));
                    }
                }
                this.logger.error(`Failed to fetch members for org ${org} page ${page}:`, error);
                throw error;
            }
        }
        return allMembers;
    }
    async getRateLimitStatus() {
        const response = await this.octokit.rateLimit.get();
        const core = response.data.rate;
        return {
            remaining: core.remaining,
            limit: core.limit,
            resetAt: new Date(core.reset * 1000),
        };
    }
    async searchUsers(query, perPage = 5) {
        await this.waitForRateLimit();
        await this.rateLimiter.decrementRemaining();
        try {
            const response = await this.octokit.search.users({
                q: query,
                per_page: perPage,
            });
            await this.rateLimiter.updateFromHeaders(this.extractRateLimitHeaders(response.headers));
            return response.data.items.map((user) => ({
                login: user.login,
                id: user.id,
                avatar_url: user.avatar_url,
            }));
        }
        catch (error) {
            if (error && typeof error === 'object' && 'response' in error) {
                const err = error;
                if (err.response?.headers) {
                    await this.rateLimiter.updateFromHeaders(this.extractRateLimitHeaders(err.response.headers));
                }
            }
            this.logger.error(`Failed to search users with query "${query}":`, error);
            return [];
        }
    }
};
exports.GithubService = GithubService;
exports.GithubService = GithubService = GithubService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        rate_limiter_service_1.RateLimiterService])
], GithubService);
//# sourceMappingURL=github.service.js.map