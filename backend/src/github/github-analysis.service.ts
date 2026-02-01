import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimiterService } from './rate-limiter.service';

interface TreeItem {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
}

interface CommitInfo {
  sha: string;
  message: string;
  date: string;
}

interface PullRequestInfo {
  title: string;
  url: string;
  number: number;
  state: string;
  repository: string;
  mergedAt: string | null;
  additions: number;
  deletions: number;
}

export interface RepoAnalysisResult {
  hasTests: boolean;
  testFramework: string | null;
  hasCI: boolean;
  ciPlatform: string | null;
  hasReadme: boolean;
  hasContributing: boolean;
  hasLicense: boolean;
  hasDocs: boolean;
  hasLinter: boolean;
  hasTypeCheck: boolean;
  hasDockerfile: boolean;
  conventionalCommitRatio: number | null;
  avgCommitMessageLength: number | null;
  totalCommits: number;
}

const TEST_PATTERNS = [
  { pattern: /__tests__\//, framework: 'jest' },
  { pattern: /\.test\.(ts|js|tsx|jsx)$/, framework: 'jest' },
  { pattern: /\.spec\.(ts|js|tsx|jsx)$/, framework: 'jest' },
  { pattern: /jest\.config/, framework: 'jest' },
  { pattern: /vitest\.config/, framework: 'vitest' },
  { pattern: /cypress\//, framework: 'cypress' },
  { pattern: /playwright\.config/, framework: 'playwright' },
  { pattern: /pytest\.ini/, framework: 'pytest' },
  { pattern: /test_.*\.py$/, framework: 'pytest' },
  { pattern: /conftest\.py/, framework: 'pytest' },
  { pattern: /\.test\.go$/, framework: 'go-test' },
  { pattern: /pom\.xml/, framework: 'maven' },
  { pattern: /build\.gradle/, framework: 'gradle' },
];

const CI_PATTERNS = [
  { pattern: /^\.github\/workflows\//, platform: 'github-actions' },
  { pattern: /^\.gitlab-ci\.yml$/, platform: 'gitlab-ci' },
  { pattern: /^Jenkinsfile$/, platform: 'jenkins' },
  { pattern: /^\.circleci\//, platform: 'circleci' },
  { pattern: /^\.travis\.yml$/, platform: 'travis' },
  { pattern: /^azure-pipelines\.yml$/, platform: 'azure-devops' },
  { pattern: /^bitbucket-pipelines\.yml$/, platform: 'bitbucket' },
];

const LINTER_PATTERNS = [
  /\.eslintrc/,
  /\.prettierrc/,
  /\.stylelintrc/,
  /pylintrc/,
  /\.flake8/,
  /\.rubocop\.yml/,
  /golangci\.yml/,
];

const TYPECHECK_PATTERNS = [
  /tsconfig\.json/,
  /jsconfig\.json/,
  /mypy\.ini/,
  /pyrightconfig\.json/,
];

const CONVENTIONAL_COMMIT_PATTERN = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .+/;

@Injectable()
export class GitHubAnalysisService {
  private readonly logger = new Logger(GitHubAnalysisService.name);
  private octokit: Octokit;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
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

  async analyzeRepository(owner: string, repo: string): Promise<RepoAnalysisResult> {
    const tree = await this.getRepoTree(owner, repo);
    const commits = await this.getRecentCommits(owner, repo, 50);

    const testResult = this.detectTests(tree);
    const ciResult = this.detectCI(tree);

    return {
      hasTests: testResult.found,
      testFramework: testResult.framework,
      hasCI: ciResult.found,
      ciPlatform: ciResult.platform,
      hasReadme: tree.some(f => /^readme\.md$/i.test(f)),
      hasContributing: tree.some(f => /^contributing\.md$/i.test(f)),
      hasLicense: tree.some(f => /^license/i.test(f)),
      hasDocs: tree.some(f => f.startsWith('docs/')),
      hasLinter: LINTER_PATTERNS.some(p => tree.some(f => p.test(f))),
      hasTypeCheck: TYPECHECK_PATTERNS.some(p => tree.some(f => p.test(f))),
      hasDockerfile: tree.some(f => /^Dockerfile$/i.test(f) || /^docker-compose\.yml$/i.test(f)),
      ...this.analyzeCommitMessages(commits),
    };
  }

  private async getRepoTree(owner: string, repo: string): Promise<string[]> {
    await this.waitForRateLimit();
    await this.rateLimiter.decrementRemaining();

    try {
      const response = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: 'HEAD',
        recursive: 'true',
      });

      return (response.data.tree as TreeItem[])
        .filter(item => item.type === 'blob')
        .map(item => item.path);
    } catch (error) {
      this.logger.error(`Failed to get tree for ${owner}/${repo}:`, error);
      return [];
    }
  }

  private async getRecentCommits(owner: string, repo: string, count: number): Promise<CommitInfo[]> {
    await this.waitForRateLimit();
    await this.rateLimiter.decrementRemaining();

    try {
      const response = await this.octokit.repos.listCommits({
        owner,
        repo,
        per_page: count,
      });

      return response.data.map(c => ({
        sha: c.sha,
        message: c.commit.message.split('\n')[0],
        date: c.commit.author?.date || '',
      }));
    } catch (error) {
      this.logger.error(`Failed to get commits for ${owner}/${repo}:`, error);
      return [];
    }
  }

  private detectTests(files: string[]): { found: boolean; framework: string | null } {
    for (const { pattern, framework } of TEST_PATTERNS) {
      if (files.some(f => pattern.test(f))) {
        return { found: true, framework };
      }
    }
    return { found: false, framework: null };
  }

  private detectCI(files: string[]): { found: boolean; platform: string | null } {
    for (const { pattern, platform } of CI_PATTERNS) {
      if (files.some(f => pattern.test(f))) {
        return { found: true, platform };
      }
    }
    return { found: false, platform: null };
  }

  private analyzeCommitMessages(commits: CommitInfo[]): {
    conventionalCommitRatio: number | null;
    avgCommitMessageLength: number | null;
    totalCommits: number;
  } {
    if (commits.length === 0) {
      return { conventionalCommitRatio: null, avgCommitMessageLength: null, totalCommits: 0 };
    }

    const conventionalCount = commits.filter(c => CONVENTIONAL_COMMIT_PATTERN.test(c.message)).length;
    const totalLength = commits.reduce((sum, c) => sum + c.message.length, 0);

    return {
      conventionalCommitRatio: Math.round((conventionalCount / commits.length) * 100) / 100,
      avgCommitMessageLength: Math.round(totalLength / commits.length),
      totalCommits: commits.length,
    };
  }

  async findExternalContributions(username: string): Promise<PullRequestInfo[]> {
    await this.waitForRateLimit();
    await this.rateLimiter.decrementRemaining();

    try {
      const response = await this.octokit.search.issuesAndPullRequests({
        q: `author:${username} type:pr is:merged`,
        per_page: 100,
        sort: 'created',
        order: 'desc',
      });

      const externalPRs: PullRequestInfo[] = [];

      for (const item of response.data.items) {
        const repoMatch = item.repository_url.match(/repos\/(.+)$/);
        if (!repoMatch) continue;

        const repoFullName = repoMatch[1];
        const [owner] = repoFullName.split('/');

        if (owner.toLowerCase() === username.toLowerCase()) continue;

        await this.waitForRateLimit();
        await this.rateLimiter.decrementRemaining();

        try {
          const prDetails = await this.octokit.pulls.get({
            owner: repoFullName.split('/')[0],
            repo: repoFullName.split('/')[1],
            pull_number: item.number,
          });

          externalPRs.push({
            title: item.title,
            url: item.html_url,
            number: item.number,
            state: item.state,
            repository: repoFullName,
            mergedAt: prDetails.data.merged_at,
            additions: prDetails.data.additions,
            deletions: prDetails.data.deletions,
          });
        } catch {
          externalPRs.push({
            title: item.title,
            url: item.html_url,
            number: item.number,
            state: item.state,
            repository: repoFullName,
            mergedAt: null,
            additions: 0,
            deletions: 0,
          });
        }
      }

      return externalPRs;
    } catch (error) {
      this.logger.error(`Failed to find contributions for ${username}:`, error);
      return [];
    }
  }

  async analyzeAndSaveRepository(repositoryId: string): Promise<boolean> {
    const repo = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { candidate: true },
    });

    if (!repo) return false;

    const [owner, repoName] = repo.fullName.split('/');
    const analysis = await this.analyzeRepository(owner, repoName);

    await this.prisma.repoAnalysis.upsert({
      where: { repositoryId },
      update: { ...analysis, analyzedAt: new Date() },
      create: { repositoryId, ...analysis },
    });

    return true;
  }

  async syncCandidateOSSContributions(candidateId: string): Promise<number> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) return 0;

    const contributions = await this.findExternalContributions(candidate.githubUsername);

    let saved = 0;
    for (const pr of contributions) {
      const isSignificant = pr.additions > 50 || pr.deletions > 50;

      try {
        await this.prisma.oSSContribution.upsert({
          where: { prUrl: pr.url },
          update: {
            state: pr.state,
            mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
            additions: pr.additions,
            deletions: pr.deletions,
            isSignificant,
          },
          create: {
            candidateId,
            externalRepo: pr.repository,
            prTitle: pr.title,
            prUrl: pr.url,
            prNumber: pr.number,
            state: pr.state,
            mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : null,
            additions: pr.additions,
            deletions: pr.deletions,
            isSignificant,
          },
        });
        saved++;
      } catch (error) {
        this.logger.error(`Failed to save PR ${pr.url}:`, error);
      }
    }

    this.logger.log(`Saved ${saved} OSS contributions for ${candidate.githubUsername}`);
    return saved;
  }

  async analyzeAllCandidateRepos(candidateId: string): Promise<number> {
    const repos = await this.prisma.repository.findMany({
      where: { candidateId },
      select: { id: true, fullName: true },
      take: 10,
      orderBy: { starCount: 'desc' },
    });

    let analyzed = 0;
    for (const repo of repos) {
      try {
        await this.analyzeAndSaveRepository(repo.id);
        analyzed++;
        this.logger.log(`Analyzed ${repo.fullName}`);
      } catch (error) {
        this.logger.error(`Failed to analyze ${repo.fullName}:`, error);
      }
    }

    return analyzed;
  }
}
