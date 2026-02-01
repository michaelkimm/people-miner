import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GithubService } from '../../github/github.service';
import { SourceType } from '@prisma/client';
import { TechStackFilterService } from '../../filter/tech-stack-filter.service';
import { TIL_REPO_PATTERNS, TIL_FALSE_POSITIVE_PATTERNS } from '../../scoring/constants/til-detection.constants';

@Injectable()
export class GithubOrgCrawler {
  private readonly logger = new Logger(GithubOrgCrawler.name);

  constructor(
    private prisma: PrismaService,
    private githubService: GithubService,
    private techStackFilter: TechStackFilterService,
  ) {}

  async crawl(
    orgName: string,
    sourceName: string,
  ): Promise<{ found: number; new: number }> {
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
        this.logger.debug(
          `Skipped ${member.login}: does not match target role "${this.techStackFilter.getTargetRole()}"`,
        );
        continue;
      }

      // Calculate lastActivityAt from repo pushed_at dates
      const lastActivityAt = repos
        .filter((r) => r.pushed_at)
        .map((r) => new Date(r.pushed_at!))
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;

      // Detect TIL repositories
      const tilInfo = this.detectTilRepos(repos);

      // Calculate longest project duration
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
              sourceType: SourceType.GITHUB_ORG,
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

    this.logger.log(
      `Completed crawling ${orgName}: ${members.length} found, ${newCount} new`,
    );

    return { found: members.length, new: newCount };
  }

  private detectTilRepos(repos: any[]): { hasTil: boolean; count: number } {
    const tilRepos = repos.filter(repo => {
      const name = repo.name;
      // False positive check
      if (TIL_FALSE_POSITIVE_PATTERNS.some(p => p.test(name))) return false;
      // TIL pattern matching
      return TIL_REPO_PATTERNS.some(p => p.test(name));
    });
    return { hasTil: tilRepos.length > 0, count: tilRepos.length };
  }

  private calculateLongestProjectMonths(repos: any[]): number {
    let longest = 0;
    for (const repo of repos) {
      if (!repo.created_at || !repo.pushed_at) continue;
      const created = new Date(repo.created_at);
      const pushed = new Date(repo.pushed_at);
      const months = (pushed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (months > longest) longest = Math.floor(months);
    }
    return longest;
  }

  private async ensureSourceExists(
    candidateId: string,
    sourceName: string,
  ): Promise<void> {
    const existingSource = await this.prisma.candidateSource.findUnique({
      where: {
        candidateId_sourceType_sourceName: {
          candidateId,
          sourceType: SourceType.GITHUB_ORG,
          sourceName,
        },
      },
    });

    if (!existingSource) {
      await this.prisma.candidateSource.create({
        data: {
          candidateId,
          sourceType: SourceType.GITHUB_ORG,
          sourceName,
          sourceUrl: `https://github.com/${sourceName}`,
        },
      });
    }
  }
}
