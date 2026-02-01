import { CodeQualityStrategy } from './code-quality.strategy';

describe('CodeQualityStrategy', () => {
  let strategy: CodeQualityStrategy;

  const baseCandidate = {
    id: 'c1',
    githubUsername: 'user',
    publicRepos: 10,
    totalCommits: 500,
    repositories: [],
    sources: [],
    solvedAcProfile: null,
    ossContributions: [],
  };

  const createRepo = (overrides: Record<string, unknown> = {}) => ({
    id: 'r1',
    candidateId: 'c1',
    name: 'test-repo',
    fullName: 'user/test-repo',
    description: 'A test repository',
    language: 'TypeScript',
    starCount: 10,
    forkCount: 2,
    isForked: false,
    topics: [],
    analysis: null,
    ...overrides,
  });

  beforeEach(() => {
    strategy = new CodeQualityStrategy();
  });

  describe('metadata', () => {
    it('should have correct name and weight', () => {
      expect(strategy.name).toBe('codeQuality');
      expect(strategy.defaultWeight).toBe(0.30);
    });
  });

  describe('calculate', () => {
    it('should return base score for empty repositories', async () => {
      const result = await strategy.calculate(baseCandidate as any);
      expect(result.value).toBeGreaterThanOrEqual(40);
    });

    it('should score testing culture from analysis', async () => {
      const candidate = {
        ...baseCandidate,
        repositories: [
          createRepo({
            id: 'r1',
            analysis: {
              id: 'a1',
              repositoryId: 'r1',
              hasTests: true,
              testFramework: 'jest',
              hasCI: false,
              ciPlatform: null,
              hasReadme: true,
              hasContributing: false,
              hasLicense: true,
              hasDocs: false,
              hasLinter: true,
              hasTypeCheck: true,
              hasDockerfile: false,
              conventionalCommitRatio: 0.5,
              avgCommitMessageLength: 40,
              totalCommits: 100,
              analyzedAt: new Date(),
            },
          }),
          createRepo({
            id: 'r2',
            analysis: {
              id: 'a2',
              repositoryId: 'r2',
              hasTests: true,
              testFramework: 'jest',
              hasCI: true,
              ciPlatform: 'github-actions',
              hasReadme: true,
              hasContributing: true,
              hasLicense: true,
              hasDocs: true,
              hasLinter: true,
              hasTypeCheck: true,
              hasDockerfile: true,
              conventionalCommitRatio: 0.8,
              avgCommitMessageLength: 50,
              totalCommits: 200,
              analyzedAt: new Date(),
            },
          }),
        ],
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.breakdown?.testing).toBe(100);
    });

    it('should score CI/CD maturity', async () => {
      const candidate = {
        ...baseCandidate,
        repositories: [
          createRepo({
            id: 'r1',
            analysis: {
              id: 'a1',
              repositoryId: 'r1',
              hasTests: false,
              testFramework: null,
              hasCI: true,
              ciPlatform: 'github-actions',
              hasReadme: true,
              hasContributing: false,
              hasLicense: false,
              hasDocs: false,
              hasLinter: false,
              hasTypeCheck: false,
              hasDockerfile: false,
              conventionalCommitRatio: null,
              avgCommitMessageLength: null,
              totalCommits: 0,
              analyzedAt: new Date(),
            },
          }),
        ],
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.breakdown?.cicd).toBe(100);
    });

    it('should score documentation quality', async () => {
      const candidate = {
        ...baseCandidate,
        repositories: [
          createRepo({
            analysis: {
              id: 'a1',
              repositoryId: 'r1',
              hasTests: false,
              testFramework: null,
              hasCI: false,
              ciPlatform: null,
              hasReadme: true,
              hasContributing: true,
              hasLicense: true,
              hasDocs: true,
              hasLinter: false,
              hasTypeCheck: false,
              hasDockerfile: false,
              conventionalCommitRatio: null,
              avgCommitMessageLength: null,
              totalCommits: 0,
              analyzedAt: new Date(),
            },
          }),
        ],
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.breakdown?.documentation).toBeGreaterThanOrEqual(80);
    });

    it('should score commit quality (conventional commits)', async () => {
      const candidate = {
        ...baseCandidate,
        repositories: [
          createRepo({
            analysis: {
              id: 'a1',
              repositoryId: 'r1',
              hasTests: false,
              testFramework: null,
              hasCI: false,
              ciPlatform: null,
              hasReadme: false,
              hasContributing: false,
              hasLicense: false,
              hasDocs: false,
              hasLinter: false,
              hasTypeCheck: false,
              hasDockerfile: false,
              conventionalCommitRatio: 0.8,
              avgCommitMessageLength: 60,
              totalCommits: 100,
              analyzedAt: new Date(),
            },
          }),
        ],
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.breakdown?.commitQuality).toBeGreaterThanOrEqual(85);
    });

    it('should score OSS contributions', async () => {
      const candidate = {
        ...baseCandidate,
        ossContributions: [
          { id: 'o1', candidateId: 'c1', externalRepo: 'org/repo1', prTitle: 'Fix bug', prUrl: 'url1', prNumber: 1, state: 'merged', mergedAt: new Date(), additions: 100, deletions: 20, isSignificant: true, createdAt: new Date() },
          { id: 'o2', candidateId: 'c1', externalRepo: 'org/repo2', prTitle: 'Add feature', prUrl: 'url2', prNumber: 2, state: 'merged', mergedAt: new Date(), additions: 200, deletions: 50, isSignificant: true, createdAt: new Date() },
          { id: 'o3', candidateId: 'c1', externalRepo: 'org/repo3', prTitle: 'Docs', prUrl: 'url3', prNumber: 3, state: 'merged', mergedAt: new Date(), additions: 10, deletions: 5, isSignificant: false, createdAt: new Date() },
        ],
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.breakdown?.ossContributions).toBeGreaterThan(40);
    });

    it('should score type safety (typed languages)', async () => {
      const candidate = {
        ...baseCandidate,
        repositories: [
          createRepo({ id: 'r1', language: 'TypeScript' }),
          createRepo({ id: 'r2', language: 'TypeScript' }),
          createRepo({ id: 'r3', language: 'Go' }),
          createRepo({ id: 'r4', language: 'JavaScript' }),
        ],
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.breakdown?.typeSafety).toBeGreaterThan(70);
    });

    it('should use legacy scoring when no analysis available', async () => {
      const candidate = {
        ...baseCandidate,
        repositories: [
          createRepo({ name: 'test-utils', description: 'Testing utilities' }),
          createRepo({ name: 'jest-plugin', description: 'Jest plugin' }),
        ],
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.breakdown?.testing).toBeGreaterThan(40);
    });

    it('should cap score at 100', async () => {
      const candidate = {
        ...baseCandidate,
        repositories: [
          createRepo({
            language: 'TypeScript',
            analysis: {
              id: 'a1',
              repositoryId: 'r1',
              hasTests: true,
              testFramework: 'jest',
              hasCI: true,
              ciPlatform: 'github-actions',
              hasReadme: true,
              hasContributing: true,
              hasLicense: true,
              hasDocs: true,
              hasLinter: true,
              hasTypeCheck: true,
              hasDockerfile: true,
              conventionalCommitRatio: 1.0,
              avgCommitMessageLength: 100,
              totalCommits: 1000,
              analyzedAt: new Date(),
            },
          }),
        ],
        ossContributions: Array.from({ length: 15 }, (_, i) => ({
          id: `o${i}`,
          candidateId: 'c1',
          externalRepo: `org/repo${i}`,
          prTitle: `PR ${i}`,
          prUrl: `url${i}`,
          prNumber: i,
          state: 'merged',
          mergedAt: new Date(),
          additions: 100,
          deletions: 20,
          isSignificant: true,
          createdAt: new Date(),
        })),
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.value).toBeLessThanOrEqual(100);
    });
  });
});
