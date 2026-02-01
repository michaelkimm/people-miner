export type TargetRole = 'backend' | 'frontend' | 'mobile' | 'fullstack' | 'all';
export interface RoleConfig {
    languages: string[];
    excludeLanguages: string[];
    keywords: string[];
    excludeKeywords: string[];
}
export declare const TECH_STACK_CONFIG: Record<TargetRole, RoleConfig>;
export declare const AMBIGUOUS_LANGUAGES: string[];
export declare const KOTLIN_ANDROID_KEYWORDS: string[];
export declare const KOTLIN_BACKEND_KEYWORDS: string[];
export declare const BACKEND_FILTER_CONFIG: {
    minBackendLanguageRatio: number;
};
