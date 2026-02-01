import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitError } from '../common/circuit-breaker.service';

export interface SolvedAcUser {
  handle: string;
  bio: string | null;
  organizations: SolvedAcOrganization[];
  tier: number;
  rating: number;
  ratingByProblemsSum: number;
  ratingByClass: number;
  ratingBySolvedCount: number;
  ratingByVoteCount: number;
  class: number;
  classDecoration: 'none' | 'silver' | 'gold';
  solvedCount: number;
  voteCount: number;
  exp: number;
  rank: number;
  maxStreak: number;
  prolesRank: number | null;
}

export interface SolvedAcOrganization {
  organizationId: number;
  name: string;
  type: string;
  rating: number;
  userCount: number;
  voteCount: number;
  solvedCount: number;
  color: string;
}

export interface SolvedAcTagStat {
  tag: {
    key: string;
    displayNames: Array<{ language: string; name: string; short: string }>;
  };
  solved: number;
  partial: number;
  tried: number;
}

export interface SolvedAcProblemTag {
  key: string;
  solved: number;
}

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

@Injectable()
export class SolvedAcService {
  private readonly logger = new Logger(SolvedAcService.name);
  private readonly API_BASE = 'https://solved.ac/api/v3';
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL_MS = 200;
  private rateLimitResetTime = 0;

  constructor(private prisma: PrismaService) {}

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();

    if (this.rateLimitResetTime > now) {
      throw new RateLimitError(
        `solved.ac rate limited until ${new Date(this.rateLimitResetTime).toISOString()}`,
        this.rateLimitResetTime,
      );
    }

    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.MIN_REQUEST_INTERVAL_MS) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL_MS - elapsed));
    }

    this.lastRequestTime = Date.now();
  }

  private handleRateLimitResponse(response: Response): void {
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      this.rateLimitResetTime = Date.now() + waitMs;
      throw new RateLimitError(
        `solved.ac rate limit hit`,
        this.rateLimitResetTime,
      );
    }
  }

  async getUserProfile(handle: string): Promise<SolvedAcUser | null> {
    try {
      await this.waitForRateLimit();

      const response = await fetch(
        `${this.API_BASE}/user/show?handle=${encodeURIComponent(handle)}`,
      );

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

      const data: SolvedAcUser = await response.json();
      return data;
    } catch (error) {
      // Re-throw RateLimitError as it should be handled by circuit breaker
      if (error instanceof RateLimitError) {
        throw error;
      }
      this.logger.warn(`Failed to get solved.ac profile for ${handle}:`, error);
      return null;
    }
  }

  async getUserTagStats(handle: string): Promise<SolvedAcProblemTag[]> {
    await this.waitForRateLimit();

    const response = await fetch(
      `${this.API_BASE}/user/problem_tag_stats?handle=${encodeURIComponent(handle)}`,
    );

    if (response.status === 429) {
      this.handleRateLimitResponse(response);
    }

    if (!response.ok) {
      return [];
    }

    const data: { count: number; items: SolvedAcTagStat[] } = await response.json();

    return data.items.map((item) => ({
      key: item.tag.key,
      solved: item.solved,
    }));
  }

  getTierName(tier: number): string {
    if (tier < 0 || tier >= TIER_NAMES.length) {
      return 'Unknown';
    }
    return TIER_NAMES[tier];
  }

  extractSolvedAcHandle(bio: string | null, blog: string | null): string | null {
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

  async fetchAndSaveProfile(
    candidateId: string,
    handle: string,
  ): Promise<boolean> {
    const user = await this.getUserProfile(handle);

    if (!user) {
      return false;
    }

    const tagStats = await this.getUserTagStats(handle);
    const tagStatsMap: Record<string, number> = {};
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

    this.logger.log(
      `Saved solved.ac profile for ${handle}: ${this.getTierName(user.tier)} (${user.solvedCount} solved)`,
    );

    return true;
  }

  async syncCandidateSolvedAc(candidateId: string): Promise<boolean> {
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

  async syncAllCandidates(options?: {
    force?: boolean;
    limit?: number;
  }): Promise<{ synced: number; failed: number; skipped: number }> {
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
        } else {
          skipped++;
        }
      } catch (error) {
        failed++;
        this.logger.error(`Failed to sync ${candidate.githubUsername}:`, error);
      }
    }

    this.logger.log(`Sync complete: ${synced} synced, ${skipped} skipped, ${failed} failed`);
    return { synced, failed, skipped };
  }
}
