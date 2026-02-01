import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { RateLimiterService } from './rate-limiter.service';

export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  pushed_at: string | null;
  created_at: string | null;
}

export interface GitHubOrgMember {
  login: string;
  id: number;
  avatar_url: string;
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private octokit: Octokit;

  constructor(
    private configService: ConfigService,
    private rateLimiter: RateLimiterService,
  ) {
    this.octokit = new Octokit({
      auth: this.configService.get('GITHUB_TOKEN'),
    });
  }

  private async waitForRateLimit(): Promise<void> {
    const check = await this.rateLimiter.canMakeRequest();

    if (!check.allowed && check.waitMs) {
      this.logger.warn(`Rate limited. Waiting ${check.waitMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, check.waitMs));
    }
  }

  private extractRateLimitHeaders(
    headers: Record<string, unknown>,
  ): Record<string, string> {
    const result: Record<string, string> = {};

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

  async getUser(username: string): Promise<GitHubUser | null> {
    await this.waitForRateLimit();
    await this.rateLimiter.decrementRemaining();

    try {
      const response = await this.octokit.users.getByUsername({ username });
      await this.rateLimiter.updateFromHeaders(
        this.extractRateLimitHeaders(response.headers),
      );

      return response.data as GitHubUser;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error) {
        const err = error as { status: number; response?: { headers: Record<string, unknown> } };
        if (err.status === 404) {
          return null;
        }
        if (err.response?.headers) {
          await this.rateLimiter.updateFromHeaders(
            this.extractRateLimitHeaders(err.response.headers),
          );
        }
      }
      this.logger.error(`Failed to fetch user ${username}:`, error);
      throw error;
    }
  }

  async getUserRepos(
    username: string,
    perPage = 30,
  ): Promise<GitHubRepo[]> {
    await this.waitForRateLimit();
    await this.rateLimiter.decrementRemaining();

    try {
      const response = await this.octokit.repos.listForUser({
        username,
        per_page: perPage,
        sort: 'updated',
        direction: 'desc',
      });

      await this.rateLimiter.updateFromHeaders(
        this.extractRateLimitHeaders(response.headers),
      );

      return response.data as GitHubRepo[];
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { headers: Record<string, unknown> } };
        if (err.response?.headers) {
          await this.rateLimiter.updateFromHeaders(
            this.extractRateLimitHeaders(err.response.headers),
          );
        }
      }
      this.logger.error(`Failed to fetch repos for ${username}:`, error);
      throw error;
    }
  }

  async getOrgMembers(
    org: string,
    perPage = 100,
  ): Promise<GitHubOrgMember[]> {
    await this.waitForRateLimit();
    await this.rateLimiter.decrementRemaining();

    try {
      const response = await this.octokit.orgs.listPublicMembers({
        org,
        per_page: perPage,
      });

      await this.rateLimiter.updateFromHeaders(
        this.extractRateLimitHeaders(response.headers),
      );

      return response.data as GitHubOrgMember[];
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { headers: Record<string, unknown> } };
        if (err.response?.headers) {
          await this.rateLimiter.updateFromHeaders(
            this.extractRateLimitHeaders(err.response.headers),
          );
        }
      }
      this.logger.error(`Failed to fetch members for org ${org}:`, error);
      throw error;
    }
  }

  async getAllOrgMembers(org: string): Promise<GitHubOrgMember[]> {
    const allMembers: GitHubOrgMember[] = [];
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

        await this.rateLimiter.updateFromHeaders(
          this.extractRateLimitHeaders(response.headers),
        );

        const members = response.data as GitHubOrgMember[];
        allMembers.push(...members);

        if (members.length < perPage) {
          break;
        }

        page++;
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
          const err = error as { response?: { headers: Record<string, unknown> } };
          if (err.response?.headers) {
            await this.rateLimiter.updateFromHeaders(
              this.extractRateLimitHeaders(err.response.headers),
            );
          }
        }
        this.logger.error(`Failed to fetch members for org ${org} page ${page}:`, error);
        throw error;
      }
    }

    return allMembers;
  }

  async getRateLimitStatus(): Promise<{
    remaining: number;
    limit: number;
    resetAt: Date;
  }> {
    const response = await this.octokit.rateLimit.get();
    const core = response.data.rate;

    return {
      remaining: core.remaining,
      limit: core.limit,
      resetAt: new Date(core.reset * 1000),
    };
  }

  /**
   * Search for GitHub users by query
   * Used to find GitHub profiles from blog author names
   */
  async searchUsers(
    query: string,
    perPage = 5,
  ): Promise<GitHubOrgMember[]> {
    await this.waitForRateLimit();
    await this.rateLimiter.decrementRemaining();

    try {
      const response = await this.octokit.search.users({
        q: query,
        per_page: perPage,
      });

      await this.rateLimiter.updateFromHeaders(
        this.extractRateLimitHeaders(response.headers),
      );

      return response.data.items.map((user) => ({
        login: user.login,
        id: user.id,
        avatar_url: user.avatar_url,
      }));
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { headers: Record<string, unknown> } };
        if (err.response?.headers) {
          await this.rateLimiter.updateFromHeaders(
            this.extractRateLimitHeaders(err.response.headers),
          );
        }
      }
      this.logger.error(`Failed to search users with query "${query}":`, error);
      return [];
    }
  }
}
