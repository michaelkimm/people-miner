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
var SolvedAcService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolvedAcService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const circuit_breaker_service_1 = require("../common/circuit-breaker.service");
const TIER_NAMES = [
    'Unrated',
    'Bronze V', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
    'Silver V', 'Silver IV', 'Silver III', 'Silver II', 'Silver I',
    'Gold V', 'Gold IV', 'Gold III', 'Gold II', 'Gold I',
    'Platinum V', 'Platinum IV', 'Platinum III', 'Platinum II', 'Platinum I',
    'Diamond V', 'Diamond IV', 'Diamond III', 'Diamond II', 'Diamond I',
    'Ruby V', 'Ruby IV', 'Ruby III', 'Ruby II', 'Ruby I',
    'Master',
];
let SolvedAcService = SolvedAcService_1 = class SolvedAcService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SolvedAcService_1.name);
        this.API_BASE = 'https://solved.ac/api/v3';
        this.lastRequestTime = 0;
        this.MIN_REQUEST_INTERVAL_MS = 200;
        this.rateLimitResetTime = 0;
    }
    async waitForRateLimit() {
        const now = Date.now();
        if (this.rateLimitResetTime > now) {
            throw new circuit_breaker_service_1.RateLimitError(`solved.ac rate limited until ${new Date(this.rateLimitResetTime).toISOString()}`, this.rateLimitResetTime);
        }
        const elapsed = now - this.lastRequestTime;
        if (elapsed < this.MIN_REQUEST_INTERVAL_MS) {
            await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL_MS - elapsed));
        }
        this.lastRequestTime = Date.now();
    }
    handleRateLimitResponse(response) {
        if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
            this.rateLimitResetTime = Date.now() + waitMs;
            throw new circuit_breaker_service_1.RateLimitError(`solved.ac rate limit hit`, this.rateLimitResetTime);
        }
    }
    async getUserProfile(handle) {
        try {
            await this.waitForRateLimit();
            const response = await fetch(`${this.API_BASE}/user/show?handle=${encodeURIComponent(handle)}`);
            if (response.status === 404) {
                return null;
            }
            if (response.status === 429) {
                this.handleRateLimitResponse(response);
            }
            if (!response.ok) {
                this.logger.warn(`solved.ac API error for ${handle}: ${response.status}`);
                return null;
            }
            const data = await response.json();
            return data;
        }
        catch (error) {
            if (error instanceof circuit_breaker_service_1.RateLimitError) {
                throw error;
            }
            this.logger.warn(`Failed to get solved.ac profile for ${handle}:`, error);
            return null;
        }
    }
    async getUserTagStats(handle) {
        await this.waitForRateLimit();
        const response = await fetch(`${this.API_BASE}/user/problem_tag_stats?handle=${encodeURIComponent(handle)}`);
        if (response.status === 429) {
            this.handleRateLimitResponse(response);
        }
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return data.items.map((item) => ({
            key: item.tag.key,
            solved: item.solved,
        }));
    }
    getTierName(tier) {
        if (tier < 0 || tier >= TIER_NAMES.length) {
            return 'Unknown';
        }
        return TIER_NAMES[tier];
    }
    extractSolvedAcHandle(bio, blog) {
        const textToSearch = `${bio || ''} ${blog || ''}`;
        const patterns = [
            /solved\.ac\/profile\/(\w+)/i,
            /solved\.ac\/(@?)(\w+)/i,
            /boj[\s:]+(\w+)/i,
            /백준[\s:]+(\w+)/i,
            /baekjoon[\s:]+(\w+)/i,
            /solved\.ac[\s:]+(\w+)/i,
            /acmicpc\.net\/user\/(\w+)/i,
        ];
        for (const pattern of patterns) {
            const match = textToSearch.match(pattern);
            if (match) {
                const handle = match[2] || match[1];
                return handle.replace('@', '');
            }
        }
        return null;
    }
    async fetchAndSaveProfile(candidateId, handle) {
        const user = await this.getUserProfile(handle);
        if (!user) {
            return false;
        }
        const tagStats = await this.getUserTagStats(handle);
        const tagStatsMap = {};
        for (const tag of tagStats) {
            tagStatsMap[tag.key] = tag.solved;
        }
        await this.prisma.solvedAcProfile.upsert({
            where: { candidateId },
            update: {
                handle: user.handle,
                tier: user.tier,
                tierName: this.getTierName(user.tier),
                rating: user.rating,
                solvedCount: user.solvedCount,
                voteCount: user.voteCount,
                classLevel: user.class,
                classDecoration: user.classDecoration === 'none' ? null : user.classDecoration,
                maxStreak: user.maxStreak,
                rank: user.rank,
                tagStats: tagStatsMap,
                updatedAt: new Date(),
            },
            create: {
                candidateId,
                handle: user.handle,
                tier: user.tier,
                tierName: this.getTierName(user.tier),
                rating: user.rating,
                solvedCount: user.solvedCount,
                voteCount: user.voteCount,
                classLevel: user.class,
                classDecoration: user.classDecoration === 'none' ? null : user.classDecoration,
                maxStreak: user.maxStreak,
                rank: user.rank,
                tagStats: tagStatsMap,
            },
        });
        this.logger.log(`Saved solved.ac profile for ${handle}: ${this.getTierName(user.tier)} (${user.solvedCount} solved)`);
        return true;
    }
    async syncCandidateSolvedAc(candidateId) {
        const candidate = await this.prisma.candidate.findUnique({
            where: { id: candidateId },
            select: { bio: true, blog: true, githubUsername: true },
        });
        if (!candidate) {
            return false;
        }
        let handle = this.extractSolvedAcHandle(candidate.bio, candidate.blog);
        if (!handle) {
            const user = await this.getUserProfile(candidate.githubUsername);
            if (user) {
                handle = candidate.githubUsername;
            }
        }
        if (!handle) {
            this.logger.debug(`No solved.ac handle found for candidate ${candidateId}`);
            return false;
        }
        return this.fetchAndSaveProfile(candidateId, handle);
    }
    async syncAllCandidates(options) {
        const { force = false, limit = 100 } = options || {};
        const whereClause = force ? {} : { solvedAcProfile: null };
        const candidates = await this.prisma.candidate.findMany({
            where: whereClause,
            select: { id: true, githubUsername: true },
            take: limit,
        });
        let synced = 0;
        let failed = 0;
        let skipped = 0;
        for (const candidate of candidates) {
            try {
                const success = await this.syncCandidateSolvedAc(candidate.id);
                if (success) {
                    synced++;
                    this.logger.log(`[${synced}/${candidates.length}] Synced: ${candidate.githubUsername}`);
                }
                else {
                    skipped++;
                }
            }
            catch (error) {
                failed++;
                this.logger.error(`Failed to sync ${candidate.githubUsername}:`, error);
            }
        }
        this.logger.log(`Sync complete: ${synced} synced, ${skipped} skipped, ${failed} failed`);
        return { synced, failed, skipped };
    }
};
exports.SolvedAcService = SolvedAcService;
exports.SolvedAcService = SolvedAcService = SolvedAcService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SolvedAcService);
//# sourceMappingURL=solved-ac.service.js.map