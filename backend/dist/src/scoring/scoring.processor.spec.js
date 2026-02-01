"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const scoring_processor_1 = require("./scoring.processor");
const scoring_service_1 = require("./scoring.service");
const events_gateway_1 = require("../events/events.gateway");
describe('ScoringProcessor', () => {
    let processor;
    const mockScoringService = {
        scoreCandidate: jest.fn(),
        scoreAllCandidates: jest.fn(),
    };
    const mockEventsGateway = { sendProgress: jest.fn() };
    const createMockJob = (data) => ({
        id: 'job-1',
        data,
    });
    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await testing_1.Test.createTestingModule({
            providers: [
                scoring_processor_1.ScoringProcessor,
                { provide: scoring_service_1.ScoringService, useValue: mockScoringService },
                { provide: events_gateway_1.EventsGateway, useValue: mockEventsGateway },
            ],
        }).compile();
        processor = module.get(scoring_processor_1.ScoringProcessor);
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
            const result = await processor.process(job);
            expect(mockScoringService.scoreCandidate).toHaveBeenCalledWith('c1');
            expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(expect.objectContaining({
                jobId: 'j1',
                status: 'scored',
                candidateId: 'c1',
                score: 85.5,
            }));
            expect(result).toMatchObject({ totalScore: 85.5 });
        });
        it('should throw on scoring failure', async () => {
            const job = createMockJob({ candidateId: 'c1', jobId: 'j1' });
            mockScoringService.scoreCandidate.mockRejectedValueOnce(new Error('Scoring failed'));
            await expect(processor.process(job)).rejects.toThrow('Scoring failed');
        });
    });
    describe('process - batch', () => {
        it('should score all candidates and send progress', async () => {
            const job = createMockJob({ jobId: 'batch-1', force: false, batchSize: 50 });
            mockScoringService.scoreAllCandidates.mockResolvedValueOnce({
                scored: 15,
                failed: 2,
            });
            const result = await processor.process(job);
            expect(mockScoringService.scoreAllCandidates).toHaveBeenCalledWith({
                force: false,
                batchSize: 50,
            });
            expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'finished', scored: 15, failed: 2 }));
            expect(result).toEqual({ scored: 15, failed: 2 });
        });
        it('should use default values when not provided', async () => {
            const job = createMockJob({ jobId: 'batch-2' });
            mockScoringService.scoreAllCandidates.mockResolvedValueOnce({ scored: 0, failed: 0 });
            await processor.process(job);
            expect(mockScoringService.scoreAllCandidates).toHaveBeenCalledWith({
                force: false,
                batchSize: 100,
            });
        });
        it('should send error progress on failure', async () => {
            const job = createMockJob({ jobId: 'batch-3' });
            mockScoringService.scoreAllCandidates.mockRejectedValueOnce(new Error('Scoring failed'));
            await expect(processor.process(job)).rejects.toThrow('Scoring failed');
            expect(mockEventsGateway.sendProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: '스코어링 실패' }));
        });
        it('should handle large batch sizes', async () => {
            const job = createMockJob({ jobId: 'batch-4', batchSize: 200, force: true });
            mockScoringService.scoreAllCandidates.mockResolvedValueOnce({ scored: 150, failed: 5 });
            const result = await processor.process(job);
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
            processor.onCompleted(job);
        });
        it('onFailed should log error', () => {
            const job = createMockJob({ jobId: 'j1' });
            processor.onFailed(job, new Error('Test error'));
        });
        it('onFailed should handle undefined job', () => {
            processor.onFailed(undefined, new Error('Test error'));
        });
    });
});
//# sourceMappingURL=scoring.processor.spec.js.map