import { ConfigService } from '@nestjs/config';
import { TargetRole } from '../config/tech-stack.config';
interface Repository {
    language: string | null;
    name?: string;
    description?: string | null;
}
export interface FilterContext {
    repositories: Repository[];
    bio?: string | null;
    company?: string | null;
}
export declare class TechStackFilterService {
    private configService;
    private readonly logger;
    private readonly targetRole;
    constructor(configService: ConfigService);
    private validateRole;
    getTargetRole(): TargetRole;
    matchesTargetRole(context: FilterContext): boolean;
    matchesRole(context: FilterContext, role: TargetRole): boolean;
    private extractLanguages;
    private buildTextContext;
    private hasExcludedKeywords;
    private hasExcludedLanguagesOnly;
    private hasTargetLanguages;
    private hasTargetKeywords;
    detectRole(context: FilterContext): TargetRole;
    analyzeBackendRatio(context: FilterContext): {
        backendCount: number;
        frontendCount: number;
        backendRatio: number;
        passesFilter: boolean;
    };
    matchesRoleStrict(context: FilterContext, role: TargetRole): boolean;
}
export {};
