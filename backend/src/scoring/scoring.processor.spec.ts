import { Test, TestingModule } from '@nestjs/testing';
import { ScoringProcessor } from './scoring.processor';
import { ScoringService } from './scoring.service';
import { EventsGateway } from '../events/events.gateway';

describe('ScoringProcessor', () => {
  let processor: ScoringProcessor;

  const mockScoringService = {
    scoreCandidate: jest.fn(),
    scoreAllCandidates: jest.fn(),
  };

  const mockEventsGateway = { sendProgress: jest.fn() };

  const createMockJob = (data: Record<string, unknown>) => ({
    id: 'job-1',
    data,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringProcessor,
        { provide: ScoringService, useValue: mockScoringService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    processor = module.get<ScoringProcessor>(ScoringProcessor);
  });

  describe('process - single candidate', () => {
    it('should score single candidate and send progress', async () => {
      const job = createMockJob({ candidateId: 'c1', jobId: 'j1' });
      
      mockScoringService.scoreCandidate.mockResolvedValueOnce({
        candidateId: 'c1',
        totalScore: 85.5,
        strategyScores: [],
        scoredAt: new Date(),
      });

      const result = await processor.process(job as any);

      expect(mockScoringService.scoreCandidate).toHaveBeenCalledWith('c1');
      expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'j1',
          status: 'scored',
          candidateId: 'c1',
          score: 85.5,
        })
      );
      expect(result).toMatchObject({ totalScore: 85.5 });
    });

    it('should throw on scoring failure', async () => {
      const job = createMockJob({ candidateId: 'c1', jobId: 'j1' });
      
      mockScoringService.scoreCandidate.mockRejectedValueOnce(new Error('Scoring failed'));

      await expect(processor.process(job as any)).rejects.toThrow('Scoring failed');
    });
  });

  describe('process - batch', () => {
    it('should score all candidates and send progress', async () => {
      const job = createMockJob({ jobId: 'batch-1', force: false, batchSize: 50 });

      mockScoringService.scoreAllCandidates.mockResolvedValueOnce({
        scored: 15,
        failed: 2,
      });

      const result = await processor.process(job as any);

      expect(mockScoringService.scoreAllCandidates).toHaveBeenCalledWith({
        force: false,
        batchSize: 50,
      });

      expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'finished', scored: 15, failed: 2 })
      );

      expect(result).toEqual({ scored: 15, failed: 2 });
    });

    it('should use default values when not provided', async () => {
      const job = createMockJob({ jobId: 'batch-2' });

      mockScoringService.scoreAllCandidates.mockResolvedValueOnce({ scored: 0, failed: 0 });

      await processor.process(job as any);

      expect(mockScoringService.scoreAllCandidates).toHaveBeenCalledWith({
        force: false,
        batchSize: 100,
      });
    });

    it('should send error progress on failure', async () => {
      const job = createMockJob({ jobId: 'batch-3' });

      mockScoringService.scoreAllCandidates.mockRejectedValueOnce(new Error('Scoring failed'));

      await expect(processor.process(job as any)).rejects.toThrow('Scoring failed');

      expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: '스코어링 실패' })
      );
    });

    it('should handle large batch sizes', async () => {
      const job = createMockJob({ jobId: 'batch-4', batchSize: 200, force: true });

      mockScoringService.scoreAllCandidates.mockResolvedValueOnce({ scored: 150, failed: 5 });

      const result = await processor.process(job as any);

      expect(mockScoringService.scoreAllCandidates).toHaveBeenCalledWith({
        force: true,
        batchSize: 200,
      });

      expect(result).toEqual({ scored: 150, failed: 5 });
    });
  });

  describe('event handlers', () => {
    it('onCompleted should log completion', () => {
      const job = createMockJob({ jobId: 'j1' });
      processor.onCompleted(job as any);
    });

    it('onFailed should log error', () => {
      const job = createMockJob({ jobId: 'j1' });
      processor.onFailed(job as any, new Error('Test error'));
    });

    it('onFailed should handle undefined job', () => {
      processor.onFailed(undefined, new Error('Test error'));
    });
  });
});
