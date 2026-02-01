import { PrismaService } from '../../prisma/prisma.service';
import { GithubService } from '../../github/github.service';
import { TechStackFilterService } from '../../filter/tech-stack-filter.service';
export declare class GithubOrgCrawler {
    private prisma;
    private githubService;
    private techStackFilter;
    private readonly logger;
    constructor(prisma: PrismaService, githubService: GithubService, techStackFilter: TechStackFilterService);
    crawl(orgName: string, sourceName: string): Promise<{
        found: number;
        new: number;
    }>;
    private detectTilRepos;
    private calculateLongestProjectMonths;
    private ensureSourceExists;
}
