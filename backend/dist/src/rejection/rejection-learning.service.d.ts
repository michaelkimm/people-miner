import { PrismaService } from '../prisma/prisma.service';
export interface PatternAnalysis {
    field: string;
    operator: '<' | '>' | '=' | 'in';
    value: number | string | string[];
    confidence: number;
    hitCount: number;
    description: string;
}
export declare class RejectionLearningService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    analyzePatterns(): Promise<PatternAnalysis[]>;
    generateRulesFromPatterns(): Promise<number>;
    private analyzeNumericThreshold;
    private analyzeCategoricalFrequency;
    private analyzeArrayFrequency;
}
