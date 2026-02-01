import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GithubService } from '../../github/github.service';
import { SourceType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { TechStackFilterService } from '../../filter/tech-stack-filter.service';

interface Contributor {
  login: string;
  name: string;
  avatar_url: string;
  profile?: string;
  contributions: string[];
}

interface AllContributorsConfig {
  contributors: Contributor[];
}

@Injectable()
export class DevEventCrawler {
  private readonly logger = new Logger(DevEventCrawler.name);
  private octokit: Octokit;

  constructor(
    private prisma: PrismaService,
    private githubService: GithubService,
    private configService: ConfigService,
    private techStackFilter: TechStackFilterService,
  ) {
    this.octokit = new Octokit({
      auth: this.configService.get('GITHUB_TOKEN'),
    });
  }

  async crawl(
    repoPath: string,
    sourceName: string,
  ): Promise<{ found: number; new: number }> {
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
        this.logger.debug(
          `Skipped ${contributor.login}: does not match target role "${this.techStackFilter.getTargetRole()}"`,
        );
        continue;
      }

      // Calculate lastActivityAt from repo pushed_at dates
      const lastActivityAt = repos
        .filter((r) => r.pushed_at)
        .map((r) => new Date(r.pushed_at!))
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
              sourceType: SourceType.DEV_EVENT,
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

    this.logger.log(
      `Completed crawling Dev-Event: ${contributors.length} found, ${newCount} new`,
    );

    return { found: contributors.length, new: newCount };
  }

  private async fetchAllContributorsConfig(
    owner: string,
    repo: string,
  ): Promise<AllContributorsConfig | null> {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path: '.all-contributorsrc',
      });

      if ('content' in response.data) {
        const content = Buffer.from(response.data.content, 'base64').toString(
          'utf-8',
        );
        return JSON.parse(content) as AllContributorsConfig;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch .all-contributorsrc:`, error);
      return null;
    }
  }

  private async ensureSourceExists(
    candidateId: string,
    sourceName: string,
  ): Promise<void> {
    const existingSource = await this.prisma.candidateSource.findUnique({
      where: {
        candidateId_sourceType_sourceName: {
          candidateId,
          sourceType: SourceType.DEV_EVENT,
          sourceName,
        },
      },
    });

    if (!existingSource) {
      await this.prisma.candidateSource.create({
        data: {
          candidateId,
          sourceType: SourceType.DEV_EVENT,
          sourceName,
          sourceUrl: `https://github.com/brave-people/Dev-Event`,
        },
      });
    }
  }
}
