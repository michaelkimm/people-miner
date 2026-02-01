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
var GithubOrgCrawler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubOrgCrawler = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const github_service_1 = require("../../github/github.service");
const client_1 = require("@prisma/client");
const tech_stack_filter_service_1 = require("../../filter/tech-stack-filter.service");
const til_detection_constants_1 = require("../../scoring/constants/til-detection.constants");
let GithubOrgCrawler = GithubOrgCrawler_1 = class GithubOrgCrawler {
    constructor(prisma, githubService, techStackFilter) {
        this.prisma = prisma;
        this.githubService = githubService;
        this.techStackFilter = techStackFilter;
        this.logger = new common_1.Logger(GithubOrgCrawler_1.name);
    }
    async crawl(orgName, sourceName) {
        this.logger.log(`Crawling GitHub org: ${orgName}`);
        const members = await this.githubService.getAllOrgMembers(orgName);
        this.logger.log(`Found ${members.length} members in ${orgName}`);
        let newCount = 0;
        for (const member of members) {
            const existingCandidate = await this.prisma.candidate.findUnique({
                where: { githubUsername: member.login },
            });
            if (existingCandidate) {
                await this.ensureSourceExists(existingCandidate.id, sourceName);
                continue;
            }
            const userDetails = await this.githubService.getUser(member.login);
            if (!userDetails) {
                continue;
            }
            const repos = await this.githubService.getUserRepos(member.login, 10);
            const matchesRole = this.techStackFilter.matchesTargetRole({
                repositories: repos.map((r) => ({
                    language: r.language,
                    name: r.name,
                    description: r.description,
                })),
                bio: userDetails.bio,
                company: userDetails.company,
            });
            if (!matchesRole) {
                this.logger.debug(`Skipped ${member.login}: does not match target role "${this.techStackFilter.getTargetRole()}"`);
                continue;
            }
            const lastActivityAt = repos
                .filter((r) => r.pushed_at)
                .map((r) => new Date(r.pushed_at))
                .sort((a, b) => b.getTime() - a.getTime())[0] || null;
            const tilInfo = this.detectTilRepos(repos);
            const longestProjectMonths = this.calculateLongestProjectMonths(repos);
            const candidate = await this.prisma.candidate.create({
                data: {
                    githubUsername: userDetails.login,
                    githubId: userDetails.id,
                    name: userDetails.name,
                    email: userDetails.email,
                    bio: userDetails.bio,
                    company: userDetails.company,
                    location: userDetails.location,
                    blog: userDetails.blog,
                    avatarUrl: userDetails.avatar_url,
                    publicRepos: userDetails.public_repos,
                    followers: userDetails.followers,
                    following: userDetails.following,
                    lastActivityAt,
                    hasTilRepo: tilInfo.hasTil,
                    tilRepoCount: tilInfo.count,
                    longestProjectMonths,
                    sources: {
                        create: {
                            sourceType: client_1.SourceType.GITHUB_ORG,
                            sourceName,
                            sourceUrl: `https://github.com/${orgName}`,
                        },
                    },
                    repositories: {
                        create: repos.map((repo) => ({
                            name: repo.name,
                            fullName: repo.full_name,
                            description: repo.description,
                            language: repo.language,
                            starCount: repo.stargazers_count,
                            forkCount: repo.forks_count,
                            url: repo.html_url,
                            pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
                        })),
                    },
                },
            });
            this.logger.debug(`Created candidate: ${candidate.githubUsername}`);
            newCount++;
        }
        this.logger.log(`Completed crawling ${orgName}: ${members.length} found, ${newCount} new`);
        return { found: members.length, new: newCount };
    }
    detectTilRepos(repos) {
        const tilRepos = repos.filter(repo => {
            const name = repo.name;
            if (til_detection_constants_1.TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test(name)))
                return false;
            return til_detection_constants_1.TIL_REPO_PATTERNS.some(p => p.test(name));
        });
        return { hasTil: tilRepos.length > 0, count: tilRepos.length };
    }
    calculateLongestProjectMonths(repos) {
        let longest = 0;
        for (const repo of repos) {
            if (!repo.created_at || !repo.pushed_at)
                continue;
            const created = new Date(repo.created_at);
            const pushed = new Date(repo.pushed_at);
            const months = (pushed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);
            if (months > longest)
                longest = Math.floor(months);
        }
        return longest;
    }
    async ensureSourceExists(candidateId, sourceName) {
        const existingSource = await this.prisma.candidateSource.findUnique({
            where: {
                candidateId_sourceType_sourceName: {
                    candidateId,
                    sourceType: client_1.SourceType.GITHUB_ORG,
                    sourceName,
                },
            },
        });
        if (!existingSource) {
            await this.prisma.candidateSource.create({
                data: {
                    candidateId,
                    sourceType: client_1.SourceType.GITHUB_ORG,
                    sourceName,
                    sourceUrl: `https://github.com/${sourceName}`,
                },
            });
        }
    }
};
exports.GithubOrgCrawler = GithubOrgCrawler;
exports.GithubOrgCrawler = GithubOrgCrawler = GithubOrgCrawler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        github_service_1.GithubService,
        tech_stack_filter_service_1.TechStackFilterService])
], GithubOrgCrawler);
//# sourceMappingURL=github-org.crawler.js.map