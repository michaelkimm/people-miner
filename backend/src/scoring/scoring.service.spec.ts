import { Test, TestingModule } from '@nestjs/testing';
import { ScoringService } from './scoring.service';
import { PrismaService } from '../prisma/prisma.service';
import { StrategyRegistry, ScoringStrategy, StrategyConfig } from './strategies';
import { CandidateStatus } from '@prisma/client';

describe('ScoringService', () => {
  let service: ScoringService;

  const mockStrategy: ScoringStrategy = {
    name: 'testStrategy',
    description: 'Test strategy',
    defaultWeight: 0.5,
    calculate: jest.fn(),
    isApplicable: jest.fn(),
  };

  const mockStrategyConfig: StrategyConfig = {
    name: 'testStrategy',
    enabled: true,
    weight: 0.5,
  };

  const mockPrisma = {
    candidate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockStrategyRegistry = {
    getEnabledStrategies: jest.fn(),
    getNormalizedWeights: jest.fn(),
    getAllStrategies: jest.fn(),
    setWeight: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
  };

  const mockCandidate = {
    id: 'candidate-1',
    githubId: 123,
    githubUsername: 'testuser',
    name: 'Test User',
    email: null,
    avatarUrl: null,
    bio: null,
    blog: null,
    company: null,
    location: null,
    publicRepos: 10,
    followers: 100,
    following: 50,
    totalStars: 500,
    totalForks: 50,
    contributions: 200,
    totalCommits: 500,
    createdAt: new Date(),
    updatedAt: new Date(),
    crawledAt: new Date(),
    totalScore: null,
      hasTilRepo: false,
      tilRepoCount: 0,
      longestProjectMonths: 0,
    readabilityScore: null,
    problemSolvingScore: null,
    cleanCodeScore: null,
    solvedAcScore: null,
    scoredAt: null,
    lastActivityAt: null,
    status: CandidateStatus.ACTIVE,
    repositories: [],
    sources: [],
    solvedAcProfile: null,
    ossContributions: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StrategyRegistry, useValue: mockStrategyRegistry },
      ],
    }).compile();

    service = module.get<ScoringService>(ScoringService);
  });

  describe('scoreCandidate', () => {
    it('should score a candidate successfully', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValueOnce(mockCandidate);
      mockStrategyRegistry.getEnabledStrategies.mockReturnValue([
        { strategy: mockStrategy, config: mockStrategyConfig },
      ]);
      mockStrategyRegistry.getNormalizedWeights.mockReturnValue(
        new Map([['testStrategy', 1.0]]),
      );
      (mockStrategy.calculate as jest.Mock).mockResolvedValueOnce({
        value: 80,
        breakdown: { metric1: 40, metric2: 40 },
      });
      (mockStrategy.isApplicable as jest.Mock).mockReturnValue(true);
      mockPrisma.candidate.update.mockResolvedValueOnce({});

      const result = await service.scoreCandidate('candidate-1');

      expect(result.candidateId).toBe('candidate-1');
      expect(result.totalScore).toBe(80);
      expect(result.strategyScores).toHaveLength(1);
      expect(result.strategyScores[0]).toMatchObject({
        strategyName: 'testStrategy',
        score: 80,
        weight: 1.0,
        weightedScore: 80,
      });
    });

    it('should throw when candidate not found', async () => {
      mockPrisma.candidate.findUnique.mockResolvedValueOnce(null);

      await expect(service.scoreCandidate('nonexistent')).rejects.toThrow(
        'Candidate nonexistent not found',
      );
    });
  });

  describe('calculateScore', () => {
    it('should calculate weighted scores from multiple strategies', async () => {
      const strategy1: ScoringStrategy = {
        name: 'strategy1',
        description: 'Strategy 1',
        defaultWeight: 0.6,
        calculate: jest.fn().mockResolvedValue({ value: 100 }),
      };

      const strategy2: ScoringStrategy = {
        name: 'strategy2',
        description: 'Strategy 2',
        defaultWeight: 0.4,
        calculate: jest.fn().mockResolvedValue({ value: 50 }),
      };

      mockStrategyRegistry.getEnabledStrategies.mockReturnValue([
        { strategy: strategy1, config: { name: 'strategy1', enabled: true, weight: 0.6 } },
        { strategy: strategy2, config: { name: 'strategy2', enabled: true, weight: 0.4 } },
      ]);
      mockStrategyRegistry.getNormalizedWeights.mockReturnValue(
        new Map([
          ['strategy1', 0.6],
          ['strategy2', 0.4],
        ]),
      );
      mockPrisma.candidate.update.mockResolvedValueOnce({});

      const result = await service.calculateScore(mockCandidate);

      expect(result.totalScore).toBe(80);
      expect(result.strategyScores).toHaveLength(2);
    });

    it('should skip strategies that are not applicable', async () => {
      const applicableStrategy: ScoringStrategy = {
        name: 'applicable',
        description: 'Applicable',
        defaultWeight: 0.5,
        calculate: jest.fn().mockResolvedValue({ value: 100 }),
        isApplicable: jest.fn().mockReturnValue(true),
      };

      const notApplicableStrategy: ScoringStrategy = {
        name: 'notApplicable',
        description: 'Not Applicable',
        defaultWeight: 0.5,
        calculate: jest.fn(),
        isApplicable: jest.fn().mockReturnValue(false),
      };

      mockStrategyRegistry.getEnabledStrategies.mockReturnValue([
        { strategy: applicableStrategy, config: { name: 'applicable', enabled: true, weight: 0.5 } },
        { strategy: notApplicableStrategy, config: { name: 'notApplicable', enabled: true, weight: 0.5 } },
      ]);
      mockStrategyRegistry.getNormalizedWeights.mockReturnValue(
        new Map([
          ['applicable', 0.5],
          ['notApplicable', 0.5],
        ]),
      );
      mockPrisma.candidate.update.mockResolvedValueOnce({});

      const result = await service.calculateScore(mockCandidate);

      expect(notApplicableStrategy.calculate).not.toHaveBeenCalled();
      expect(result.strategyScores).toHaveLength(1);
      expect(result.strategyScores[0].strategyName).toBe('applicable');
    });

    it('should handle strategy calculation errors gracefully', async () => {
      const failingStrategy: ScoringStrategy = {
        name: 'failing',
        description: 'Failing',
        defaultWeight: 0.5,
        calculate: jest.fn().mockRejectedValue(new Error('Calculation failed')),
      };

      const workingStrategy: ScoringStrategy = {
        name: 'working',
        description: 'Working',
        defaultWeight: 0.5,
        calculate: jest.fn().mockResolvedValue({ value: 80 }),
      };

      mockStrategyRegistry.getEnabledStrategies.mockReturnValue([
        { strategy: failingStrategy, config: { name: 'failing', enabled: true, weight: 0.5 } },
        { strategy: workingStrategy, config: { name: 'working', enabled: true, weight: 0.5 } },
      ]);
      mockStrategyRegistry.getNormalizedWeights.mockReturnValue(
        new Map([
          ['failing', 0.5],
          ['working', 0.5],
        ]),
      );
      mockPrisma.candidate.update.mockResolvedValueOnce({});

      const result = await service.calculateScore(mockCandidate);

      expect(result.strategyScores).toHaveLength(1);
      expect(result.strategyScores[0].strategyName).toBe('working');
    });

    it('should round total score to 2 decimal places', async () => {
      const strategy: ScoringStrategy = {
        name: 'strategy',
        description: 'Strategy',
        defaultWeight: 1,
        calculate: jest.fn().mockResolvedValue({ value: 33.333333 }),
      };

      mockStrategyRegistry.getEnabledStrategies.mockReturnValue([
        { strategy, config: { name: 'strategy', enabled: true, weight: 1 } },
      ]);
      mockStrategyRegistry.getNormalizedWeights.mockReturnValue(new Map([['strategy', 1]]));
      mockPrisma.candidate.update.mockResolvedValueOnce({});

      const result = await service.calculateScore(mockCandidate);

      expect(result.totalScore).toBe(33.33);
    });
  });

  describe('scoreAllCandidates', () => {
    it('should score multiple candidates', async () => {
      mockPrisma.candidate.findMany.mockResolvedValueOnce([
        { ...mockCandidate, id: 'c1' },
        { ...mockCandidate, id: 'c2' },
      ]);

      jest.spyOn(service, 'calculateScore').mockResolvedValue({
        candidateId: 'any',
        totalScore: 80,
        strategyScores: [],
        scoredAt: new Date(),
      });

      const result = await service.scoreAllCandidates({ batchSize: 10 });

      expect(result).toEqual({ scored: 2, failed: 0 });
    });

    it('should handle scoring failures', async () => {
      mockPrisma.candidate.findMany.mockResolvedValueOnce([
        { ...mockCandidate, id: 'c1' },
        { ...mockCandidate, id: 'c2' },
      ]);

      jest.spyOn(service, 'calculateScore')
        .mockResolvedValueOnce({
          candidateId: 'c1',
          totalScore: 80,
          strategyScores: [],
          scoredAt: new Date(),
        })
        .mockRejectedValueOnce(new Error('Scoring failed'));

      const result = await service.scoreAllCandidates();

      expect(result).toEqual({ scored: 1, failed: 1 });
    });

    it('should use force option to rescore all', async () => {
      mockPrisma.candidate.findMany.mockResolvedValueOnce([]);

      await service.scoreAllCandidates({ force: true, batchSize: 100 });

      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          take: 100,
        }),
      );
    });

    it('should filter unscored candidates when not forced', async () => {
      mockPrisma.candidate.findMany.mockResolvedValueOnce([]);

      await service.scoreAllCandidates({ force: false });

      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { scoredAt: null },
              { scoredAt: { lt: expect.any(Date) } },
            ],
          },
        }),
      );
    });
  });

  describe('getStrategies', () => {
    it('should return all strategies with their config', () => {
      mockStrategyRegistry.getAllStrategies.mockReturnValue([
        {
          strategy: {
            name: 'strategy1',
            description: 'Description 1',
            defaultWeight: 0.5,
          },
          config: { name: 'strategy1', enabled: true, weight: 0.6 },
        },
        {
          strategy: {
            name: 'strategy2',
            description: 'Description 2',
            defaultWeight: 0.3,
          },
          config: { name: 'strategy2', enabled: false, weight: 0.3 },
        },
      ]);

      const result = service.getStrategies();

      expect(result).toEqual([
        {
          name: 'strategy1',
          description: 'Description 1',
          enabled: true,
          weight: 0.6,
          defaultWeight: 0.5,
        },
        {
          name: 'strategy2',
          description: 'Description 2',
          enabled: false,
          weight: 0.3,
          defaultWeight: 0.3,
        },
      ]);
    });
  });

  describe('strategy configuration', () => {
    it('should update strategy weight', () => {
      service.updateStrategyWeight('testStrategy', 0.8);
      expect(mockStrategyRegistry.setWeight).toHaveBeenCalledWith('testStrategy', 0.8);
    });

    it('should enable strategy', () => {
      service.enableStrategy('testStrategy');
      expect(mockStrategyRegistry.enable).toHaveBeenCalledWith('testStrategy');
    });

    it('should disable strategy', () => {
      service.disableStrategy('testStrategy');
      expect(mockStrategyRegistry.disable).toHaveBeenCalledWith('testStrategy');
    });
  });
});
