import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GitHubAnalysisService } from './github-analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimiterService } from './rate-limiter.service';

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    git: { getTree: jest.fn() },
    repos: { listCommits: jest.fn() },
    search: { issuesAndPullRequests: jest.fn() },
    pulls: { get: jest.fn() },
  })),
}));

describe('GitHubAnalysisService', () => {
  let service: GitHubAnalysisService;
  let mockOctokit: {
    git: { getTree: jest.Mock };
    repos: { listCommits: jest.Mock };
    search: { issuesAndPullRequests: jest.Mock };
    pulls: { get: jest.Mock };
  };

  const mockPrisma = {
    repository: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    repoAnalysis: {
      upsert: jest.fn(),
    },
    candidate: {
      findUnique: jest.fn(),
    },
    oSSContribution: {
      upsert: jest.fn(),
    },
  };

  const mockRateLimiter = {
    canMakeRequest: jest.fn().mockResolvedValue({ allowed: true }),
    decrementRemaining: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('test-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubAnalysisService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RateLimiterService, useValue: mockRateLimiter },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<GitHubAnalysisService>(GitHubAnalysisService);
    mockOctokit = (service as unknown as { octokit: typeof mockOctokit }).octokit;
  });

  describe('analyzeRepository', () => {
    const baseTreeResponse = {
      data: {
        tree: [
          { path: 'src/index.ts', type: 'blob', sha: '123' },
          { path: 'package.json', type: 'blob', sha: '456' },
        ],
      },
    };

    const baseCommitsResponse = {
      data: [
        { sha: 'abc', commit: { message: 'Initial commit', author: { date: '2024-01-01' } } },
      ],
    };

    beforeEach(() => {
      mockOctokit.git.getTree.mockResolvedValue(baseTreeResponse);
      mockOctokit.repos.listCommits.mockResolvedValue(baseCommitsResponse);
    });

    it('should detect Jest test framework', async () => {
      mockOctokit.git.getTree.mockResolvedValueOnce({
        data: {
          tree: [
            { path: 'src/app.ts', type: 'blob', sha: '1' },
            { path: '__tests__/app.test.ts', type: 'blob', sha: '2' },
            { path: 'jest.config.js', type: 'blob', sha: '3' },
          ],
        },
      });

      const result = await service.analyzeRepository('owner', 'repo');

      expect(result.hasTests).toBe(true);
      expect(result.testFramework).toBe('jest');
    });

    it('should detect Pytest framework', async () => {
      mockOctokit.git.getTree.mockResolvedValueOnce({
        data: {
          tree: [
            { path: 'src/main.py', type: 'blob', sha: '1' },
            { path: 'test_main.py', type: 'blob', sha: '2' },
            { path: 'conftest.py', type: 'blob', sha: '3' },
          ],
        },
      });

      const result = await service.analyzeRepository('owner', 'repo');

      expect(result.hasTests).toBe(true);
      expect(result.testFramework).toBe('pytest');
    });

    it('should detect GitHub Actions CI', async () => {
      mockOctokit.git.getTree.mockResolvedValueOnce({
        data: {
          tree: [
            { path: '.github/workflows/ci.yml', type: 'blob', sha: '1' },
            { path: 'src/app.ts', type: 'blob', sha: '2' },
          ],
        },
      });

      const result = await service.analyzeRepository('owner', 'repo');

      expect(result.hasCI).toBe(true);
      expect(result.ciPlatform).toBe('github-actions');
    });

    it('should detect GitLab CI', async () => {
      mockOctokit.git.getTree.mockResolvedValueOnce({
        data: {
          tree: [
            { path: '.gitlab-ci.yml', type: 'blob', sha: '1' },
          ],
        },
      });

      const result = await service.analyzeRepository('owner', 'repo');

      expect(result.hasCI).toBe(true);
      expect(result.ciPlatform).toBe('gitlab-ci');
    });

    it('should detect documentation files', async () => {
      mockOctokit.git.getTree.mockResolvedValueOnce({
        data: {
          tree: [
            { path: 'README.md', type: 'blob', sha: '1' },
            { path: 'CONTRIBUTING.md', type: 'blob', sha: '2' },
            { path: 'LICENSE', type: 'blob', sha: '3' },
            { path: 'docs/api.md', type: 'blob', sha: '4' },
          ],
        },
      });

      const result = await service.analyzeRepository('owner', 'repo');

      expect(result.hasReadme).toBe(true);
      expect(result.hasContributing).toBe(true);
      expect(result.hasLicense).toBe(true);
      expect(result.hasDocs).toBe(true);
    });

    it('should detect linter config', async () => {
      mockOctokit.git.getTree.mockResolvedValueOnce({
        data: {
          tree: [
            { path: '.eslintrc.js', type: 'blob', sha: '1' },
            { path: '.prettierrc', type: 'blob', sha: '2' },
          ],
        },
      });

      const result = await service.analyzeRepository('owner', 'repo');

      expect(result.hasLinter).toBe(true);
    });

    it('should detect TypeScript config', async () => {
      mockOctokit.git.getTree.mockResolvedValueOnce({
        data: {
          tree: [
            { path: 'tsconfig.json', type: 'blob', sha: '1' },
          ],
        },
      });

      const result = await service.analyzeRepository('owner', 'repo');

      expect(result.hasTypeCheck).toBe(true);
    });

    it('should detect Dockerfile', async () => {
      mockOctokit.git.getTree.mockResolvedValueOnce({
        data: {
          tree: [
            { path: 'Dockerfile', type: 'blob', sha: '1' },
            { path: 'docker-compose.yml', type: 'blob', sha: '2' },
          ],
        },
      });

      const result = await service.analyzeRepository('owner', 'repo');

      expect(result.hasDockerfile).toBe(true);
    });

    it('should analyze conventional commits', async () => {
      mockOctokit.repos.listCommits.mockResolvedValueOnce({
        data: [
          { sha: '1', commit: { message: 'feat: add new feature', author: { date: '2024-01-01' } } },
          { sha: '2', commit: { message: 'fix(api): fix bug', author: { date: '2024-01-02' } } },
          { sha: '3', commit: { message: 'docs: update readme', author: { date: '2024-01-03' } } },
          { sha: '4', commit: { message: 'random message', author: { date: '2024-01-04' } } },
        ],
      });

      const result = await service.analyzeRepository('owner', 'repo');

      expect(result.conventionalCommitRatio).toBe(0.75);
      expect(result.totalCommits).toBe(4);
    });

    it('should handle empty repository', async () => {
      mockOctokit.git.getTree.mockResolvedValueOnce({ data: { tree: [] } });
      mockOctokit.repos.listCommits.mockResolvedValueOnce({ data: [] });

      const result = await service.analyzeRepository('owner', 'repo');

      expect(result.hasTests).toBe(false);
      expect(result.hasCI).toBe(false);
      expect(result.conventionalCommitRatio).toBeNull();
      expect(result.totalCommits).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      mockOctokit.git.getTree.mockRejectedValueOnce(new Error('API Error'));
      mockOctokit.repos.listCommits.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.analyzeRepository('owner', 'repo');

      expect(result.hasTests).toBe(false);
      expect(result.hasCI).toBe(false);
    });
  });

  describe('findExternalContributions', () => {
    it('should find merged PRs to external repos', async () => {
      mockOctokit.search.issuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [
            {
              title: 'Fix bug in library',
              html_url: 'https://github.com/org/repo/pull/123',
              number: 123,
              state: 'closed',
              repository_url: 'https://api.github.com/repos/org/repo',
            },
          ],
        },
      });

      mockOctokit.pulls.get.mockResolvedValueOnce({
        data: {
          merged_at: '2024-01-15T10:00:00Z',
          additions: 100,
          deletions: 50,
        },
      });

      const result = await service.findExternalContributions('testuser');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Fix bug in library',
        repository: 'org/repo',
        additions: 100,
        deletions: 50,
      });
    });

    it('should exclude PRs to own repos', async () => {
      mockOctokit.search.issuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [
            {
              title: 'Own PR',
              html_url: 'https://github.com/testuser/myrepo/pull/1',
              number: 1,
              state: 'closed',
              repository_url: 'https://api.github.com/repos/testuser/myrepo',
            },
            {
              title: 'External PR',
              html_url: 'https://github.com/other/repo/pull/2',
              number: 2,
              state: 'closed',
              repository_url: 'https://api.github.com/repos/other/repo',
            },
          ],
        },
      });

      mockOctokit.pulls.get.mockResolvedValue({
        data: { merged_at: '2024-01-01', additions: 10, deletions: 5 },
      });

      const result = await service.findExternalContributions('testuser');

      expect(result).toHaveLength(1);
      expect(result[0].repository).toBe('other/repo');
    });

    it('should handle API errors gracefully', async () => {
      mockOctokit.search.issuesAndPullRequests.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.findExternalContributions('testuser');

      expect(result).toEqual([]);
    });

    it('should handle PR detail fetch errors', async () => {
      mockOctokit.search.issuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [
            {
              title: 'PR with error',
              html_url: 'https://github.com/org/repo/pull/1',
              number: 1,
              state: 'closed',
              repository_url: 'https://api.github.com/repos/org/repo',
            },
          ],
        },
      });

      mockOctokit.pulls.get.mockRejectedValueOnce(new Error('Not found'));

      const result = await service.findExternalContributions('testuser');

      expect(result).toHaveLength(1);
      expect(result[0].additions).toBe(0);
      expect(result[0].deletions).toBe(0);
    });
  });

  describe('analyzeAndSaveRepository', () => {
    it('should analyze and save repository', async () => {
      mockPrisma.repository.findUnique.mockResolvedValueOnce({
        id: 'repo-1',
        fullName: 'owner/repo',
        candidate: { id: 'c-1' },
      });

      mockOctokit.git.getTree.mockResolvedValueOnce({
        data: {
          tree: [
            { path: 'src/app.ts', type: 'blob', sha: '1' },
            { path: 'README.md', type: 'blob', sha: '2' },
          ],
        },
      });

      mockOctokit.repos.listCommits.mockResolvedValueOnce({
        data: [{ sha: '1', commit: { message: 'feat: init', author: { date: '2024-01-01' } } }],
      });

      mockPrisma.repoAnalysis.upsert.mockResolvedValueOnce({});

      const result = await service.analyzeAndSaveRepository('repo-1');

      expect(result).toBe(true);
      expect(mockPrisma.repoAnalysis.upsert).toHaveBeenCalledWith({
        where: { repositoryId: 'repo-1' },
        update: expect.objectContaining({ hasReadme: true }),
        create: expect.objectContaining({ repositoryId: 'repo-1' }),
      });
    });

    it('should return false when repository not found', async () => {
      mockPrisma.repository.findUnique.mockResolvedValueOnce(null);

      const result = await service.analyzeAndSaveRepository('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('syncCandidateOSSContributions', () => {
    it('should sync OSS contributions', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValueOnce({
        id: 'c-1',
        githubUsername: 'testuser',
      });

      mockOctokit.search.issuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [
            {
              title: 'Fix bug',
              html_url: 'https://github.com/org/repo/pull/1',
              number: 1,
              state: 'closed',
              repository_url: 'https://api.github.com/repos/org/repo',
            },
          ],
        },
      });

      mockOctokit.pulls.get.mockResolvedValueOnce({
        data: { merged_at: '2024-01-01', additions: 100, deletions: 20 },
      });

      mockPrisma.oSSContribution.upsert.mockResolvedValueOnce({});

      const result = await service.syncCandidateOSSContributions('c-1');

      expect(result).toBe(1);
      expect(mockPrisma.oSSContribution.upsert).toHaveBeenCalledWith({
        where: { prUrl: 'https://github.com/org/repo/pull/1' },
        update: expect.objectContaining({ additions: 100, isSignificant: true }),
        create: expect.objectContaining({ candidateId: 'c-1', isSignificant: true }),
      });
    });

    it('should return 0 when candidate not found', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValueOnce(null);

      const result = await service.syncCandidateOSSContributions('nonexistent');

      expect(result).toBe(0);
    });

    it('should mark small PRs as not significant', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValueOnce({
        id: 'c-1',
        githubUsername: 'testuser',
      });

      mockOctokit.search.issuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [
            {
              title: 'Typo fix',
              html_url: 'https://github.com/org/repo/pull/1',
              number: 1,
              state: 'closed',
              repository_url: 'https://api.github.com/repos/org/repo',
            },
          ],
        },
      });

      mockOctokit.pulls.get.mockResolvedValueOnce({
        data: { merged_at: '2024-01-01', additions: 2, deletions: 2 },
      });

      mockPrisma.oSSContribution.upsert.mockResolvedValueOnce({});

      await service.syncCandidateOSSContributions('c-1');

      expect(mockPrisma.oSSContribution.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ isSignificant: false }),
        }),
      );
    });
  });

  describe('analyzeAllCandidateRepos', () => {
    it('should analyze multiple repos', async () => {
      mockPrisma.repository.findMany.mockResolvedValueOnce([
        { id: 'r-1', fullName: 'user/repo1' },
        { id: 'r-2', fullName: 'user/repo2' },
      ]);

      jest.spyOn(service, 'analyzeAndSaveRepository')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const result = await service.analyzeAllCandidateRepos('c-1');

      expect(result).toBe(2);
    });

    it('should handle analysis errors', async () => {
      mockPrisma.repository.findMany.mockResolvedValueOnce([
        { id: 'r-1', fullName: 'user/repo1' },
        { id: 'r-2', fullName: 'user/repo2' },
      ]);

      jest.spyOn(service, 'analyzeAndSaveRepository')
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Analysis failed'));

      const result = await service.analyzeAllCandidateRepos('c-1');

      expect(result).toBe(1);
    });
  });
});
