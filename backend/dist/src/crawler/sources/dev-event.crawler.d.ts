import { PrismaService } from '../../prisma/prisma.service';
import { GithubService } from '../../github/github.service';
import { ConfigService } from '@nestjs/config';
import { TechStackFilterService } from '../../filter/tech-stack-filter.service';
export declare class DevEventCrawler {
    private prisma;
    private githubService;
    private configService;
    private techStackFilter;
    private readonly logger;
    private octokit;
    constructor(prisma: PrismaService, githubService: GithubService, configService: ConfigService, techStackFilter: TechStackFilterService);
    crawl(repoPath: string, sourceName: string): Promise<{
        found: number;
        new: number;
    }>;
    private fetchAllContributorsConfig;
    private ensureSourceExists;
}
