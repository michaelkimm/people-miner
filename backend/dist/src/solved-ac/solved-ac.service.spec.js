"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const solved_ac_service_1 = require("./solved-ac.service");
const prisma_service_1 = require("../prisma/prisma.service");
const mockFetch = jest.fn();
global.fetch = mockFetch;
describe('SolvedAcService', () => {
    let service;
    let prisma;
    const mockPrismaService = {
        solvedAcProfile: {
            upsert: jest.fn(),
        },
        candidate: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
    };
    beforeEach(async () => {
        jest.clearAllMocks();
        mockFetch.mockReset();
        const module = await testing_1.Test.createTestingModule({
            providers: [
                solved_ac_service_1.SolvedAcService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrismaService },
            ],
        }).compile();
        service = module.get(solved_ac_service_1.SolvedAcService);
        prisma = module.get(prisma_service_1.PrismaService);
    });
    describe('extractSolvedAcHandle', () => {
        it('should extract handle from solved.ac profile URL', () => {
            expect(service.extractSolvedAcHandle('Check my profile: solved.ac/profile/koosaga', null))
                .toBe('koosaga');
        });
        it('should extract handle from solved.ac short URL', () => {
            expect(service.extractSolvedAcHandle('solved.ac/tourist', null))
                .toBe('tourist');
        });
        it('should extract handle from solved.ac URL with @', () => {
            expect(service.extractSolvedAcHandle('solved.ac/@myhandle', null))
                .toBe('myhandle');
        });
        it('should extract handle from BOJ mention', () => {
            expect(service.extractSolvedAcHandle('boj: myhandle', null))
                .toBe('myhandle');
        });
        it('should extract handle from 백준 mention', () => {
            expect(service.extractSolvedAcHandle('백준: algorithm_master', null))
                .toBe('algorithm_master');
        });
        it('should extract handle from baekjoon mention', () => {
            expect(service.extractSolvedAcHandle('baekjoon: coder123', null))
                .toBe('coder123');
        });
        it('should extract handle from acmicpc.net URL', () => {
            expect(service.extractSolvedAcHandle('https://acmicpc.net/user/testuser', null))
                .toBe('testuser');
        });
        it('should extract handle from blog field', () => {
            expect(service.extractSolvedAcHandle(null, 'solved.ac/profile/bloguser'))
                .toBe('bloguser');
        });
        it('should return null when no handle found', () => {
            expect(service.extractSolvedAcHandle('Just a regular bio', 'https://myblog.com'))
                .toBeNull();
        });
        it('should return null for empty inputs', () => {
            expect(service.extractSolvedAcHandle(null, null)).toBeNull();
            expect(service.extractSolvedAcHandle('', '')).toBeNull();
        });
    });
    describe('getTierName', () => {
        it('should return correct tier names', () => {
            expect(service.getTierName(0)).toBe('Unrated');
            expect(service.getTierName(1)).toBe('Bronze V');
            expect(service.getTierName(5)).toBe('Bronze I');
            expect(service.getTierName(6)).toBe('Silver V');
            expect(service.getTierName(11)).toBe('Gold V');
            expect(service.getTierName(16)).toBe('Platinum V');
            expect(service.getTierName(21)).toBe('Diamond V');
            expect(service.getTierName(26)).toBe('Ruby V');
            expect(service.getTierName(31)).toBe('Master');
        });
        it('should return Unknown for invalid tiers', () => {
            expect(service.getTierName(-1)).toBe('Unknown');
            expect(service.getTierName(100)).toBe('Unknown');
        });
    });
    describe('getUserProfile', () => {
        const mockUser = {
            handle: 'testuser',
            bio: 'Test bio',
            organizations: [],
            tier: 15,
            rating: 1500,
            ratingByProblemsSum: 1000,
            ratingByClass: 200,
            ratingBySolvedCount: 200,
            ratingByVoteCount: 100,
            class: 4,
            classDecoration: 'silver',
            solvedCount: 500,
            voteCount: 50,
            exp: 100000,
            rank: 5000,
            maxStreak: 30,
            prolesRank: null,
        };
        it('should return user profile on success', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockUser,
            });
            const result = await service.getUserProfile('testuser');
            expect(result).toEqual(mockUser);
            expect(mockFetch).toHaveBeenCalledWith('https://solved.ac/api/v3/user/show?handle=testuser');
        });
        it('should return null on 404', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });
            const result = await service.getUserProfile('nonexistent');
            expect(result).toBeNull();
        });
        it('should return null on API error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });
            const result = await service.getUserProfile('testuser');
            expect(result).toBeNull();
        });
        it('should return null on network error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            const result = await service.getUserProfile('testuser');
            expect(result).toBeNull();
        });
    });
    describe('getUserTagStats', () => {
        const mockTagStats = {
            count: 2,
            items: [
                {
                    tag: {
                        key: 'dp',
                        displayNames: [{ language: 'ko', name: '다이나믹 프로그래밍', short: 'DP' }],
                    },
                    solved: 100,
                    partial: 5,
                    tried: 10,
                },
                {
                    tag: {
                        key: 'graphs',
                        displayNames: [{ language: 'ko', name: '그래프', short: '그래프' }],
                    },
                    solved: 80,
                    partial: 3,
                    tried: 5,
                },
            ],
        };
        it('should return tag stats on success', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockTagStats,
            });
            const result = await service.getUserTagStats('testuser');
            expect(result).toEqual([
                { key: 'dp', solved: 100 },
                { key: 'graphs', solved: 80 },
            ]);
        });
        it('should return empty array on error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });
            const result = await service.getUserTagStats('testuser');
            expect(result).toEqual([]);
        });
    });
    describe('fetchAndSaveProfile', () => {
        const mockUser = {
            handle: 'testuser',
            bio: null,
            organizations: [],
            tier: 20,
            rating: 2000,
            ratingByProblemsSum: 1500,
            ratingByClass: 300,
            ratingBySolvedCount: 150,
            ratingByVoteCount: 50,
            class: 5,
            classDecoration: 'gold',
            solvedCount: 800,
            voteCount: 100,
            exp: 200000,
            rank: 1000,
            maxStreak: 60,
            prolesRank: null,
        };
        beforeEach(() => {
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser,
            })
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ count: 1, items: [{ tag: { key: 'dp', displayNames: [] }, solved: 50, partial: 0, tried: 0 }] }),
            });
        });
        it('should save profile and return true on success', async () => {
            mockPrismaService.solvedAcProfile.upsert.mockResolvedValueOnce({});
            const result = await service.fetchAndSaveProfile('candidate-123', 'testuser');
            expect(result).toBe(true);
            expect(mockPrismaService.solvedAcProfile.upsert).toHaveBeenCalledWith({
                where: { candidateId: 'candidate-123' },
                update: expect.objectContaining({
                    handle: 'testuser',
                    tier: 20,
                    tierName: 'Platinum I',
                    solvedCount: 800,
                }),
                create: expect.objectContaining({
                    candidateId: 'candidate-123',
                    handle: 'testuser',
                }),
            });
        });
        it('should return false when user not found', async () => {
            mockFetch.mockReset();
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });
            const result = await service.fetchAndSaveProfile('candidate-123', 'nonexistent');
            expect(result).toBe(false);
            expect(mockPrismaService.solvedAcProfile.upsert).not.toHaveBeenCalled();
        });
    });
    describe('syncCandidateSolvedAc', () => {
        it('should return false when candidate not found', async () => {
            mockPrismaService.candidate.findUnique.mockResolvedValueOnce(null);
            const result = await service.syncCandidateSolvedAc('nonexistent');
            expect(result).toBe(false);
        });
        it('should extract handle from bio and sync', async () => {
            mockPrismaService.candidate.findUnique.mockResolvedValueOnce({
                bio: 'solved.ac/profile/myhandle',
                blog: null,
                githubUsername: 'ghuser',
            });
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    handle: 'myhandle',
                    tier: 15,
                    rating: 1500,
                    solvedCount: 300,
                    voteCount: 30,
                    class: 3,
                    classDecoration: 'none',
                    maxStreak: 20,
                    rank: 10000,
                }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ count: 0, items: [] }),
            });
            mockPrismaService.solvedAcProfile.upsert.mockResolvedValueOnce({});
            const result = await service.syncCandidateSolvedAc('candidate-123');
            expect(result).toBe(true);
        });
        it('should try github username when no handle in bio', async () => {
            mockPrismaService.candidate.findUnique.mockResolvedValueOnce({
                bio: 'Regular developer',
                blog: null,
                githubUsername: 'sameuser',
            });
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    handle: 'sameuser',
                    tier: 10,
                    rating: 1000,
                    solvedCount: 200,
                    voteCount: 20,
                    class: 2,
                    classDecoration: 'none',
                    maxStreak: 10,
                    rank: 20000,
                }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    handle: 'sameuser',
                    tier: 10,
                    rating: 1000,
                    solvedCount: 200,
                    voteCount: 20,
                    class: 2,
                    classDecoration: 'none',
                    maxStreak: 10,
                    rank: 20000,
                }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ count: 0, items: [] }),
            });
            mockPrismaService.solvedAcProfile.upsert.mockResolvedValueOnce({});
            const result = await service.syncCandidateSolvedAc('candidate-123');
            expect(result).toBe(true);
        });
        it('should return false when no handle found anywhere', async () => {
            mockPrismaService.candidate.findUnique.mockResolvedValueOnce({
                bio: 'No algorithm info',
                blog: null,
                githubUsername: 'randomuser',
            });
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });
            const result = await service.syncCandidateSolvedAc('candidate-123');
            expect(result).toBe(false);
        });
    });
    describe('syncAllCandidates', () => {
        it('should sync multiple candidates', async () => {
            mockPrismaService.candidate.findMany.mockResolvedValueOnce([
                { id: 'c1', githubUsername: 'user1' },
                { id: 'c2', githubUsername: 'user2' },
            ]);
            jest.spyOn(service, 'syncCandidateSolvedAc')
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            const result = await service.syncAllCandidates({ limit: 10 });
            expect(result).toEqual({ synced: 1, failed: 0, skipped: 1 });
        });
        it('should handle errors gracefully', async () => {
            mockPrismaService.candidate.findMany.mockResolvedValueOnce([
                { id: 'c1', githubUsername: 'user1' },
                { id: 'c2', githubUsername: 'user2' },
            ]);
            jest.spyOn(service, 'syncCandidateSolvedAc')
                .mockResolvedValueOnce(true)
                .mockRejectedValueOnce(new Error('DB error'));
            const result = await service.syncAllCandidates();
            expect(result).toEqual({ synced: 1, failed: 1, skipped: 0 });
        });
        it('should use force option correctly', async () => {
            mockPrismaService.candidate.findMany.mockResolvedValueOnce([]);
            await service.syncAllCandidates({ force: true, limit: 50 });
            expect(mockPrismaService.candidate.findMany).toHaveBeenCalledWith({
                where: {},
                select: { id: true, githubUsername: true },
                take: 50,
            });
        });
        it('should filter candidates without profile when not forced', async () => {
            mockPrismaService.candidate.findMany.mockResolvedValueOnce([]);
            await service.syncAllCandidates({ force: false });
            expect(mockPrismaService.candidate.findMany).toHaveBeenCalledWith({
                where: { solvedAcProfile: null },
                select: { id: true, githubUsername: true },
                take: 100,
            });
        });
    });
});
//# sourceMappingURL=solved-ac.service.spec.js.map