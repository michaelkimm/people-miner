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
var DevEventCrawler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevEventCrawler = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const github_service_1 = require("../../github/github.service");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
const rest_1 = require("@octokit/rest");
const tech_stack_filter_service_1 = require("../../filter/tech-stack-filter.service");
let DevEventCrawler = DevEventCrawler_1 = class DevEventCrawler {
    constructor(prisma, githubService, configService, techStackFilter) {
        this.prisma = prisma;
        this.githubService = githubService;
        this.configService = configService;
        this.techStackFilter = techStackFilter;
        this.logger = new common_1.Logger(DevEventCrawler_1.name);
        this.octokit = new rest_1.Octokit({
            auth: this.configService.get('GITHUB_TOKEN'),
        });
    }
    async crawl(repoPath, sourceName) {
        this.logger.log(`Crawling Dev-Event contributors from: ${repoPath}`);
        const [owner, repo] = repoPath.split('/');
        const contributorsConfig = await this.fetchAllContributorsConfig(owner, repo);
        if (!contributorsConfig) {
            this.logger.warn(`No .all-contributorsrc found in ${repoPath}`);
            return { found: 0, new: 0 };
        }
        const contributors = contributorsConfig.contributors;
        this.logger.log(`Found ${contributors.length} contributors in Dev-Event`);
        let newCount = 0;
        for (const contributor of contributors) {
            const existingCandidate = await this.prisma.candidate.findUnique({
                where: { githubUsername: contributor.login },
            });
            if (existingCandidate) {
                await this.ensureSourceExists(existingCandidate.id, sourceName);
                continue;
            }
            const userDetails = await this.githubService.getUser(contributor.login);
            if (!userDetails) {
                continue;
            }
            const repos = await this.githubService.getUserRepos(contributor.login, 10);
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
                this.logger.debug(`Skipped ${contributor.login}: does not match target role "${this.techStackFilter.getTargetRole()}"`);
                continue;
            }
            const lastActivityAt = repos
                .filter((r) => r.pushed_at)
                .map((r) => new Date(r.pushed_at))
                .sort((a, b) => b.getTime() - a.getTime())[0] || null;
            await this.prisma.candidate.create({
                data: {
                    githubUsername: userDetails.login,
                    githubId: userDetails.id,
                    name: userDetails.name || contributor.name,
                    email: userDetails.email,
                    bio: userDetails.bio,
                    company: userDetails.company,
                    location: userDetails.location,
                    blog: userDetails.blog || contributor.profile,
                    avatarUrl: userDetails.avatar_url,
                    publicRepos: userDetails.public_repos,
                    followers: userDetails.followers,
                    following: userDetails.following,
                    lastActivityAt,
                    sources: {
                        create: {
                            sourceType: client_1.SourceType.DEV_EVENT,
                            sourceName,
                            sourceUrl: `https://github.com/${repoPath}`,
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
            this.logger.debug(`Created candidate: ${contributor.login}`);
            newCount++;
        }
        this.logger.log(`Completed crawling Dev-Event: ${contributors.length} found, ${newCount} new`);
        return { found: contributors.length, new: newCount };
    }
    async fetchAllContributorsConfig(owner, repo) {
        try {
            const response = await this.octokit.repos.getContent({
                owner,
                repo,
                path: '.all-contributorsrc',
            });
            if ('content' in response.data) {
                const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                return JSON.parse(content);
            }
            return null;
        }
        catch (error) {
            this.logger.error(`Failed to fetch .all-contributorsrc:`, error);
            return null;
        }
    }
    async ensureSourceExists(candidateId, sourceName) {
        const existingSource = await this.prisma.candidateSource.findUnique({
            where: {
                candidateId_sourceType_sourceName: {
                    candidateId,
                    sourceType: client_1.SourceType.DEV_EVENT,
                    sourceName,
                },
            },
        });
        if (!existingSource) {
            await this.prisma.candidateSource.create({
                data: {
                    candidateId,
                    sourceType: client_1.SourceType.DEV_EVENT,
                    sourceName,
                    sourceUrl: `https://github.com/brave-people/Dev-Event`,
                },
            });
        }
    }
};
exports.DevEventCrawler = DevEventCrawler;
exports.DevEventCrawler = DevEventCrawler = DevEventCrawler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        github_service_1.GithubService,
        config_1.ConfigService,
        tech_stack_filter_service_1.TechStackFilterService])
], DevEventCrawler);
//# sourceMappingURL=dev-event.crawler.js.map