import { ActivityStrategy } from './activity.strategy';

describe('ActivityStrategy', () => {
  let strategy: ActivityStrategy;

  const baseCandidate = {
    id: 'c1',
    githubUsername: 'user',
    publicRepos: 10,
    totalCommits: 500,
    repositories: [],
    sources: [],
    solvedAcProfile: null,
    ossContributions: [],
    hasTilRepo: false,
    tilRepoCount: 0,
    longestProjectMonths: 0,
  };

  const createRepo = (overrides: Record<string, unknown> = {}) => ({
    id: 'r1',
    candidateId: 'c1',
    name: 'test-repo',
    fullName: 'user/test-repo',
    description: 'A test repository with decent description',
    language: 'TypeScript',
    starCount: 10,
    forkCount: 2,
    isForked: false,
    topics: [],
    analysis: null,
    ...overrides,
  });

  beforeEach(() => {
    strategy = new ActivityStrategy();
  });

  describe('metadata', () => {
    it('should have correct name and weight', () => {
      expect(strategy.name).toBe('activity');
      expect(strategy.defaultWeight).toBe(0.25);
    });
  });

  describe('calculate', () => {
    it('should score high activity users highly', async () => {
      const candidate = {
        ...baseCandidate,
        publicRepos: 50,
        totalCommits: 1000,
        repositories: [
          createRepo({ id: 'r1', name: 'project-alpha', language: 'TypeScript' }),
          createRepo({ id: 'r2', name: 'project-beta', language: 'Python' }),
          createRepo({ id: 'r3', name: 'project-gamma', language: 'Go' }),
          createRepo({ id: 'r4', name: 'project-delta', language: 'Rust' }),
          createRepo({ id: 'r5', name: 'project-epsilon', language: 'Java' }),
        ],
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.value).toBeGreaterThanOrEqual(85);
      expect(result.breakdown?.repositories).toBe(100);
      expect(result.breakdown?.commits).toBe(100);
      expect(result.breakdown?.languageDiversity).toBe(100);
    });

    it('should score low activity users lower', async () => {
      const candidate = {
        ...baseCandidate,
        publicRepos: 2,
        totalCommits: 20,
        repositories: [
          createRepo({ id: 'r1', name: 'test', description: null, language: 'JavaScript' }),
        ],
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.value).toBeLessThan(50);
    });

    it('should score repository count correctly', async () => {
      expect((await strategy.calculate({ ...baseCandidate, publicRepos: 50 } as any)).breakdown?.repositories).toBe(100);
      expect((await strategy.calculate({ ...baseCandidate, publicRepos: 30 } as any)).breakdown?.repositories).toBe(85);
      expect((await strategy.calculate({ ...baseCandidate, publicRepos: 20 } as any)).breakdown?.repositories).toBe(70);
      expect((await strategy.calculate({ ...baseCandidate, publicRepos: 10 } as any)).breakdown?.repositories).toBe(55);
      expect((await strategy.calculate({ ...baseCandidate, publicRepos: 5 } as any)).breakdown?.repositories).toBe(40);
      expect((await strategy.calculate({ ...baseCandidate, publicRepos: 2 } as any)).breakdown?.repositories).toBe(16);
    });

    it('should score commit activity correctly', async () => {
      expect((await strategy.calculate({ ...baseCandidate, totalCommits: 1000 } as any)).breakdown?.commits).toBe(100);
      expect((await strategy.calculate({ ...baseCandidate, totalCommits: 500 } as any)).breakdown?.commits).toBe(85);
      expect((await strategy.calculate({ ...baseCandidate, totalCommits: 200 } as any)).breakdown?.commits).toBe(70);
      expect((await strategy.calculate({ ...baseCandidate, totalCommits: 100 } as any)).breakdown?.commits).toBe(55);
      expect((await strategy.calculate({ ...baseCandidate, totalCommits: 50 } as any)).breakdown?.commits).toBe(40);
    });

    it('should score language diversity', async () => {
      const fiveLanguages = {
        ...baseCandidate,
        repositories: [
          createRepo({ id: 'r1', language: 'TypeScript' }),
          createRepo({ id: 'r2', language: 'Python' }),
          createRepo({ id: 'r3', language: 'Go' }),
          createRepo({ id: 'r4', language: 'Rust' }),
          createRepo({ id: 'r5', language: 'Java' }),
        ],
      };

      const oneLanguage = {
        ...baseCandidate,
        repositories: [
          createRepo({ id: 'r1', language: 'JavaScript' }),
          createRepo({ id: 'r2', language: 'JavaScript' }),
        ],
      };

      const noLanguage = {
        ...baseCandidate,
        repositories: [
          createRepo({ id: 'r1', language: null }),
        ],
      };

      expect((await strategy.calculate(fiveLanguages as any)).breakdown?.languageDiversity).toBe(100);
      expect((await strategy.calculate(oneLanguage as any)).breakdown?.languageDiversity).toBe(40);
      expect((await strategy.calculate(noLanguage as any)).breakdown?.languageDiversity).toBe(20);
    });

    it('should score repository quality', async () => {
      const highQuality = {
        ...baseCandidate,
        repositories: [
          createRepo({ id: 'r1', name: 'meaningful-project', description: 'This is a well-documented project for testing' }),
          createRepo({ id: 'r2', name: 'another-quality-repo', description: 'Another repository with good description' }),
        ],
      };

      const lowQuality = {
        ...baseCandidate,
        repositories: [
          createRepo({ id: 'r1', name: 'test', description: null }),
          createRepo({ id: 'r2', name: 'temp', description: 'short' }),
        ],
      };

      const highResult = await strategy.calculate(highQuality as any);
      const lowResult = await strategy.calculate(lowQuality as any);

      expect(highResult.breakdown?.repositoryQuality).toBeGreaterThan(lowResult.breakdown?.repositoryQuality || 0);
    });

    it('should handle empty repositories', async () => {
      const candidate = {
        ...baseCandidate,
        repositories: [],
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.breakdown?.repositoryQuality).toBe(30);
      expect(result.breakdown?.languageDiversity).toBe(20);
    });

    it('should cap score at 100', async () => {
      const hyperActiveCandidate = {
        ...baseCandidate,
        publicRepos: 100,
        totalCommits: 5000,
        repositories: [
          createRepo({ id: 'r1', name: 'great-project-1', description: 'Amazing project description here', language: 'TypeScript' }),
          createRepo({ id: 'r2', name: 'great-project-2', description: 'Another amazing description', language: 'Python' }),
          createRepo({ id: 'r3', name: 'great-project-3', description: 'Yet another great description', language: 'Go' }),
          createRepo({ id: 'r4', name: 'great-project-4', description: 'Fantastic project description', language: 'Rust' }),
          createRepo({ id: 'r5', name: 'great-project-5', description: 'Wonderful project description', language: 'Java' }),
        ],
      };

      const result = await strategy.calculate(hyperActiveCandidate as any);

      expect(result.value).toBeLessThanOrEqual(100);
    });
  });

  describe('TIL bonus scoring', () => {
    it('should give 10 points for 1 TIL repo', async () => {
      const candidate = {
        ...baseCandidate,
        hasTilRepo: true,
        tilRepoCount: 1,
        longestProjectMonths: 0,
      };

      const result = await strategy.calculate(candidate as any);
      expect(result.breakdown?.tilBonus).toBe(10);
    });

    it('should give 15 points for 2+ TIL repos', async () => {
      const candidate = {
        ...baseCandidate,
        hasTilRepo: true,
        tilRepoCount: 2,
        longestProjectMonths: 0,
      };

      const result = await strategy.calculate(candidate as any);
      expect(result.breakdown?.tilBonus).toBe(15);
    });

    it('should give 0 points for no TIL repo', async () => {
      const candidate = {
        ...baseCandidate,
        hasTilRepo: false,
        tilRepoCount: 0,
        longestProjectMonths: 0,
      };

      const result = await strategy.calculate(candidate as any);
      expect(result.breakdown?.tilBonus).toBe(0);
    });
  });

  describe('Long-term project bonus scoring', () => {
    it('should give 10 points for 3-5 month projects', async () => {
      const candidate = {
        ...baseCandidate,
        hasTilRepo: false,
        tilRepoCount: 0,
        longestProjectMonths: 4,
      };

      const result = await strategy.calculate(candidate as any);
      expect(result.breakdown?.longTermBonus).toBe(10);
    });

    it('should give 15 points for 6-11 month projects', async () => {
      const candidate = {
        ...baseCandidate,
        hasTilRepo: false,
        tilRepoCount: 0,
        longestProjectMonths: 8,
      };

      const result = await strategy.calculate(candidate as any);
      expect(result.breakdown?.longTermBonus).toBe(15);
    });

    it('should give 20 points for 12+ month projects', async () => {
      const candidate = {
        ...baseCandidate,
        hasTilRepo: false,
        tilRepoCount: 0,
        longestProjectMonths: 15,
      };

      const result = await strategy.calculate(candidate as any);
      expect(result.breakdown?.longTermBonus).toBe(20);
    });

    it('should give 0 points for projects under 3 months', async () => {
      const candidate = {
        ...baseCandidate,
        hasTilRepo: false,
        tilRepoCount: 0,
        longestProjectMonths: 2,
      };

      const result = await strategy.calculate(candidate as any);
      expect(result.breakdown?.longTermBonus).toBe(0);
    });
  });
});
