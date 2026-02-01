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
var TechBlogCrawler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechBlogCrawler = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const github_service_1 = require("../../github/github.service");
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const path = require("path");
let TechBlogCrawler = TechBlogCrawler_1 = class TechBlogCrawler {
    constructor(prisma, githubService) {
        this.prisma = prisma;
        this.githubService = githubService;
        this.logger = new common_1.Logger(TechBlogCrawler_1.name);
        this.pythonCrawlerPath = path.resolve(__dirname, '../../../../../korean-blog-crawler');
    }
    async crawl(blogKey, sourceName) {
        this.logger.log(`Crawling tech blog: ${blogKey}`);
        try {
            const crawlResult = await this.runPythonCrawler(blogKey);
            if (!crawlResult || crawlResult.authors_count === 0) {
                this.logger.warn(`No authors found for ${blogKey}`);
                return { found: 0, new: 0 };
            }
            this.logger.log(`Found ${crawlResult.authors_count} authors from ${crawlResult.blog}`);
            let newCount = 0;
            for (const author of crawlResult.authors) {
                try {
                    const created = await this.processAuthor(author, sourceName, crawlResult.company);
                    if (created) {
                        newCount++;
                    }
                }
                catch (error) {
                    this.logger.warn(`Failed to process author ${author.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            this.logger.log(`Completed crawling ${blogKey}: ${crawlResult.authors_count} found, ${newCount} new`);
            return { found: crawlResult.authors_count, new: newCount };
        }
        catch (error) {
            this.logger.error(`Failed to crawl ${blogKey}:`, error);
            throw error;
        }
    }
    async runPythonCrawler(blogKey) {
        return new Promise((resolve, reject) => {
            const pythonPath = path.join(this.pythonCrawlerPath, 'venv/bin/python');
            const cliPath = path.join(this.pythonCrawlerPath, 'cli.py');
            this.logger.debug(`Running: ${pythonPath} ${cliPath} authors ${blogKey}`);
            const process = (0, child_process_1.spawn)(pythonPath, [cliPath, 'authors', blogKey, '--limit', '100'], {
                cwd: this.pythonCrawlerPath,
                env: {
                    ...globalThis.process.env,
                    PYTHONPATH: this.pythonCrawlerPath,
                },
            });
            let stdout = '';
            let stderr = '';
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            process.on('close', (code) => {
                if (code !== 0) {
                    this.logger.error(`Python crawler failed with code ${code}: ${stderr}`);
                    reject(new Error(`Python crawler failed: ${stderr}`));
                    return;
                }
                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                }
                catch (parseError) {
                    this.logger.error(`Failed to parse crawler output: ${stdout}`);
                    reject(new Error('Failed to parse crawler output'));
                }
            });
            process.on('error', (error) => {
                this.logger.error('Failed to spawn Python process:', error);
                reject(error);
            });
            setTimeout(() => {
                process.kill();
                reject(new Error('Python crawler timed out'));
            }, 5 * 60 * 1000);
        });
    }
    async processAuthor(author, sourceName, company) {
        if (author.is_team) {
            this.logger.debug(`Skipping team account: ${author.name}`);
            return false;
        }
        let githubUsername = this.extractGithubUsername(author.github_url);
        if (!githubUsername && author.name) {
            githubUsername = await this.searchGithubUser(author.name, company);
        }
        if (!githubUsername) {
            this.logger.debug(`No GitHub profile found for ${author.name}, skipping`);
            return false;
        }
        const existingCandidate = await this.prisma.candidate.findUnique({
            where: { githubUsername },
        });
        if (existingCandidate) {
            await this.ensureSourceExists(existingCandidate.id, sourceName, company);
            return false;
        }
        const userDetails = await this.githubService.getUser(githubUsername);
        if (!userDetails) {
            this.logger.debug(`Could not fetch GitHub user: ${githubUsername}`);
            return false;
        }
        const repos = await this.githubService.getUserRepos(githubUsername, 10);
        const lastActivityAt = repos
            .filter((r) => r.pushed_at)
            .map((r) => new Date(r.pushed_at))
            .sort((a, b) => b.getTime() - a.getTime())[0] || null;
        const candidate = await this.prisma.candidate.create({
            data: {
                githubUsername: userDetails.login,
                githubId: userDetails.id,
                name: userDetails.name || author.name,
                email: userDetails.email || author.email,
                bio: userDetails.bio || author.bio,
                company: userDetails.company || company,
                location: userDetails.location,
                blog: userDetails.blog,
                avatarUrl: userDetails.avatar_url || author.avatar_url,
                publicRepos: userDetails.public_repos,
                followers: userDetails.followers,
                following: userDetails.following,
                lastActivityAt,
                sources: {
                    create: {
                        sourceType: client_1.SourceType.TECH_BLOG,
                        sourceName,
                        sourceUrl: author.posts[0]?.url || `https://techblog.${company.toLowerCase()}.com`,
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
        this.logger.debug(`Created candidate from tech blog: ${candidate.githubUsername}`);
        return true;
    }
    extractGithubUsername(url) {
        if (!url)
            return null;
        const match = url.match(/github\.com\/([^/]+)/);
        return match ? match[1] : null;
    }
    async searchGithubUser(name, company) {
        try {
            const query = `${name} ${company}`;
            const results = await this.githubService.searchUsers(query, 1);
            if (results && results.length > 0) {
                return results[0].login;
            }
            const nameOnlyResults = await this.githubService.searchUsers(name, 1);
            if (nameOnlyResults && nameOnlyResults.length > 0) {
                return nameOnlyResults[0].login;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async ensureSourceExists(candidateId, sourceName, company) {
        const existingSource = await this.prisma.candidateSource.findUnique({
            where: {
                candidateId_sourceType_sourceName: {
                    candidateId,
                    sourceType: client_1.SourceType.TECH_BLOG,
                    sourceName,
                },
            },
        });
        if (!existingSource) {
            await this.prisma.candidateSource.create({
                data: {
                    candidateId,
                    sourceType: client_1.SourceType.TECH_BLOG,
                    sourceName,
                    sourceUrl: `https://techblog.${company.toLowerCase()}.com`,
                },
            });
        }
    }
};
exports.TechBlogCrawler = TechBlogCrawler;
exports.TechBlogCrawler = TechBlogCrawler = TechBlogCrawler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        github_service_1.GithubService])
], TechBlogCrawler);
//# sourceMappingURL=tech-blog.crawler.js.map