import { PrismaService } from '../../prisma/prisma.service';
import { GithubService } from '../../github/github.service';
export declare class TechBlogCrawler {
    private prisma;
    private githubService;
    private readonly logger;
    private readonly pythonCrawlerPath;
    constructor(prisma: PrismaService, githubService: GithubService);
    crawl(blogKey: string, sourceName: string): Promise<{
        found: number;
        new: number;
    }>;
    private runPythonCrawler;
    private processAuthor;
    private extractGithubUsername;
    private searchGithubUser;
    private ensureSourceExists;
}
