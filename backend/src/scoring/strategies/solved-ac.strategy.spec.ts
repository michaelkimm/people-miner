import { SolvedAcStrategy } from './solved-ac.strategy';
import { CandidateWithRelations } from './scoring-strategy.interface';

describe('SolvedAcStrategy', () => {
  let strategy: SolvedAcStrategy;

  const baseCandidate = {
    id: 'c1',
    githubId: 1,
    githubUsername: 'user',
    name: 'User',
    email: null,
    avatarUrl: null,
    bio: null,
    blog: null,
    company: null,
    location: null,
    publicRepos: 10,
    followers: 100,
    following: 50,
    contributions: 200,
    totalCommits: 500,
    createdAt: new Date(),
    updatedAt: new Date(),
    crawledAt: new Date(),
    totalScore: null,
    readabilityScore: null,
    problemSolvingScore: null,
    cleanCodeScore: null,
    solvedAcScore: null,
    scoredAt: null,
    repositories: [],
    sources: [],
    solvedAcProfile: null,
    ossContributions: [],
  };

  beforeEach(() => {
    strategy = new SolvedAcStrategy();
  });

  describe('metadata', () => {
    it('should have correct name and weight', () => {
      expect(strategy.name).toBe('solvedAc');
      expect(strategy.defaultWeight).toBe(0.35);
    });
  });

  describe('isApplicable', () => {
    it('should return false when no solvedAcProfile', () => {
      expect(strategy.isApplicable(baseCandidate as any)).toBe(false);
    });

    it('should return true when solvedAcProfile exists', () => {
      const candidate = {
        ...baseCandidate,
        solvedAcProfile: {
          id: 'p1',
          candidateId: 'c1',
          handle: 'user',
          tier: 15,
          tierName: 'Gold I',
          rating: 1500,
          solvedCount: 500,
          voteCount: 50,
          classLevel: 4,
          classDecoration: null,
          maxStreak: 30,
          rank: 5000,
          tagStats: {},
        },
      };
      expect(strategy.isApplicable(candidate as any)).toBe(true);
    });
  });

  describe('calculate', () => {
    it('should return 0 when no profile', async () => {
      const result = await strategy.calculate(baseCandidate as any);
      expect(result.value).toBe(0);
      expect(result.breakdown?.noProfile).toBe(1);
    });

    it('should score Ruby tier candidate highly', async () => {
      const candidate = {
        ...baseCandidate,
        solvedAcProfile: {
          handle: 'master',
          tier: 30,
          tierName: 'Ruby I',
          rating: 3000,
          solvedCount: 2500,
          classLevel: 10,
          classDecoration: 'gold',
          maxStreak: 400,
          tagStats: { segment_tree: 50, lazyprop: 30, dp: 300, greedy: 200 },
        },
      };

      const result = await strategy.calculate(candidate as any);
      
      expect(result.value).toBeGreaterThanOrEqual(90);
      expect(result.breakdown?.tier).toBe(100);
    });

    it('should score Gold tier candidate moderately', async () => {
      const candidate = {
        ...baseCandidate,
        solvedAcProfile: {
          handle: 'golduser',
          tier: 13,
          tierName: 'Gold III',
          solvedCount: 300,
          classLevel: 3,
          classDecoration: null,
          maxStreak: 15,
          tagStats: { dp: 50, greedy: 40, bfs: 30 },
        },
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.value).toBeGreaterThan(50);
      expect(result.value).toBeLessThan(80);
      expect(result.breakdown?.tier).toBe(70);
    });

    it('should score Bronze tier candidate lower', async () => {
      const candidate = {
        ...baseCandidate,
        solvedAcProfile: {
          handle: 'newbie',
          tier: 3,
          tierName: 'Bronze III',
          solvedCount: 50,
          classLevel: 1,
          classDecoration: null,
          maxStreak: 5,
          tagStats: null,
        },
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.value).toBeLessThan(50);
      expect(result.breakdown?.tier).toBe(40);
    });

    it('should reward advanced algorithm knowledge', async () => {
      const baseProfile = {
        handle: 'algo',
        tier: 20,
        tierName: 'Platinum I',
        solvedCount: 1000,
        classLevel: 5,
        classDecoration: 'silver',
        maxStreak: 100,
      };

      const candidateWithAdvanced = {
        ...baseCandidate,
        solvedAcProfile: { ...baseProfile, tagStats: { segment_tree: 100, fft: 20, scc: 30, dp: 200 } },
      };

      const candidateWithoutAdvanced = {
        ...baseCandidate,
        solvedAcProfile: { ...baseProfile, tagStats: { dp: 200, greedy: 150 } },
      };

      const advancedResult = await strategy.calculate(candidateWithAdvanced as any);
      const basicResult = await strategy.calculate(candidateWithoutAdvanced as any);

      expect(advancedResult.breakdown?.algorithmDepth).toBeGreaterThan(
        basicResult.breakdown?.algorithmDepth || 0
      );
    });

    it('should reward consistency (max streak)', async () => {
      const consistentCandidate = {
        ...baseCandidate,
        solvedAcProfile: {
          handle: 'consistent',
          tier: 15,
          tierName: 'Gold I',
          solvedCount: 1000,
          classLevel: 4,
          classDecoration: null,
          maxStreak: 365,
          tagStats: {},
        },
      };

      const result = await strategy.calculate(consistentCandidate as any);
      
      expect(result.breakdown?.consistency).toBeGreaterThanOrEqual(85);
    });

    it('should include metadata in result', async () => {
      const candidate = {
        ...baseCandidate,
        solvedAcProfile: {
          handle: 'testhandle',
          tier: 15,
          tierName: 'Gold I',
          rating: 1500,
          solvedCount: 500,
          classLevel: 4,
          classDecoration: null,
          maxStreak: 30,
          tagStats: {},
        },
      };

      const result = await strategy.calculate(candidate as any);

      expect(result.metadata).toMatchObject({
        handle: 'testhandle',
        tierName: 'Gold I',
        solvedCount: 500,
        rating: 1500,
      });
    });
  });
});
