import { ConfigService } from '@nestjs/config';
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
export declare class GithubService {
    private configService;
    private rateLimiter;
    private readonly logger;
    private octokit;
    constructor(configService: ConfigService, rateLimiter: RateLimiterService);
    private waitForRateLimit;
    private extractRateLimitHeaders;
    getUser(username: string): Promise<GitHubUser | null>;
    getUserRepos(username: string, perPage?: number): Promise<GitHubRepo[]>;
    getOrgMembers(org: string, perPage?: number): Promise<GitHubOrgMember[]>;
    getAllOrgMembers(org: string): Promise<GitHubOrgMember[]>;
    getRateLimitStatus(): Promise<{
        remaining: number;
        limit: number;
        resetAt: Date;
    }>;
    searchUsers(query: string, perPage?: number): Promise<GitHubOrgMember[]>;
}
