import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TECH_STACK_CONFIG,
  TargetRole,
  AMBIGUOUS_LANGUAGES,
  KOTLIN_ANDROID_KEYWORDS,
  KOTLIN_BACKEND_KEYWORDS,
  BACKEND_FILTER_CONFIG,
} from '../config/tech-stack.config';

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

@Injectable()
export class TechStackFilterService {
  private readonly logger = new Logger(TechStackFilterService.name);
  private readonly targetRole: TargetRole;

  constructor(private configService: ConfigService) {
    const role = this.configService.get<string>('TARGET_ROLE', 'all');
    this.targetRole = this.validateRole(role);
    this.logger.log(`Tech stack filter initialized with target role: ${this.targetRole}`);
  }

  private validateRole(role: string): TargetRole {
    const validRoles: TargetRole[] = ['backend', 'frontend', 'mobile', 'fullstack', 'all'];
    if (validRoles.includes(role as TargetRole)) {
      return role as TargetRole;
    }
    this.logger.warn(`Invalid TARGET_ROLE "${role}", defaulting to "all"`);
    return 'all';
  }

  getTargetRole(): TargetRole {
    return this.targetRole;
  }

  matchesTargetRole(context: FilterContext): boolean {
    return this.matchesRole(context, this.targetRole);
  }

  matchesRole(context: FilterContext, role: TargetRole): boolean {
    if (role === 'all') {
      return true;
    }

    const config = TECH_STACK_CONFIG[role];
    const languages = this.extractLanguages(context.repositories);
    const textContext = this.buildTextContext(context);

    if (this.hasExcludedKeywords(textContext, config.excludeKeywords)) {
      return false;
    }

    if (this.hasExcludedLanguagesOnly(languages, config.excludeLanguages, config.languages)) {
      return false;
    }

    if (this.hasTargetLanguages(languages, config.languages, textContext, role)) {
      return true;
    }

    if (this.hasTargetKeywords(textContext, config.keywords)) {
      return true;
    }

    return false;
  }

  private extractLanguages(repositories: Repository[]): string[] {
    const languages = repositories
      .map((repo) => repo.language)
      .filter((lang): lang is string => lang !== null);
    return [...new Set(languages)];
  }

  private buildTextContext(context: FilterContext): string {
    const parts: string[] = [];

    if (context.bio) {
      parts.push(context.bio);
    }

    if (context.company) {
      parts.push(context.company);
    }

    context.repositories.forEach((repo) => {
      if (repo.name) parts.push(repo.name);
      if (repo.description) parts.push(repo.description);
    });

    return parts.join(' ').toLowerCase();
  }

  private hasExcludedKeywords(textContext: string, excludeKeywords: string[]): boolean {
    return excludeKeywords.some((keyword) => textContext.includes(keyword.toLowerCase()));
  }

  private hasExcludedLanguagesOnly(
    languages: string[],
    excludeLanguages: string[],
    targetLanguages: string[],
  ): boolean {
    if (languages.length === 0) {
      return false;
    }

    const normalizedLanguages = languages.map((l) => l.toLowerCase());
    const normalizedExclude = excludeLanguages.map((l) => l.toLowerCase());
    const normalizedTarget = targetLanguages.map((l) => l.toLowerCase());

    const hasOnlyExcludedLanguages = normalizedLanguages.every(
      (lang) =>
        normalizedExclude.includes(lang) && !normalizedTarget.includes(lang),
    );

    return hasOnlyExcludedLanguages;
  }

  private hasTargetLanguages(
    languages: string[],
    targetLanguages: string[],
    textContext: string,
    role: TargetRole,
  ): boolean {
    const normalizedLanguages = languages.map((l) => l.toLowerCase());
    const normalizedTarget = targetLanguages.map((l) => l.toLowerCase());

    for (const lang of normalizedLanguages) {
      if (AMBIGUOUS_LANGUAGES.map((l) => l.toLowerCase()).includes(lang)) {
        if (role === 'backend') {
          const hasBackendContext = TECH_STACK_CONFIG.backend.keywords.some((kw) =>
            textContext.includes(kw.toLowerCase()),
          );
          if (hasBackendContext) return true;
        } else if (role === 'frontend') {
          const hasFrontendContext = TECH_STACK_CONFIG.frontend.keywords.some((kw) =>
            textContext.includes(kw.toLowerCase()),
          );
          if (hasFrontendContext) return true;
        } else if (role === 'fullstack') {
          return true;
        }
        continue;
      }

      if (lang === 'kotlin') {
        const isAndroid = KOTLIN_ANDROID_KEYWORDS.some((kw) =>
          textContext.includes(kw.toLowerCase()),
        );
        const isBackend = KOTLIN_BACKEND_KEYWORDS.some((kw) =>
          textContext.includes(kw.toLowerCase()),
        );

        if (role === 'backend' && isBackend && !isAndroid) return true;
        if (role === 'mobile' && isAndroid) return true;
        if (role === 'fullstack' && isBackend) return true;
        continue;
      }

      if (normalizedTarget.includes(lang)) {
        return true;
      }
    }

    return false;
  }

  private hasTargetKeywords(textContext: string, keywords: string[]): boolean {
    return keywords.some((keyword) => textContext.includes(keyword.toLowerCase()));
  }

  detectRole(context: FilterContext): TargetRole {
    const roles: TargetRole[] = ['backend', 'frontend', 'mobile'];
    const matches: TargetRole[] = [];

    for (const role of roles) {
      if (this.matchesRole(context, role)) {
        matches.push(role);
      }
    }

    if (matches.length === 0) return 'all';
    if (matches.length === 1) return matches[0];
    if (matches.includes('backend') && matches.includes('frontend')) return 'fullstack';

    return matches[0];
  }

  /**
   * Analyze backend language ratio for strict filtering
   */
  analyzeBackendRatio(context: FilterContext): {
    backendCount: number;
    frontendCount: number;
    backendRatio: number;
    passesFilter: boolean;
  } {
    const backendConfig = TECH_STACK_CONFIG.backend;
    const frontendConfig = TECH_STACK_CONFIG.frontend;

    let backendCount = 0;
    let frontendCount = 0;

    for (const repo of context.repositories) {
      if (!repo.language) continue;

      const lang = repo.language.toLowerCase();
      const normalizedBackendLangs = backendConfig.languages.map((l) =>
        l.toLowerCase(),
      );
      const normalizedFrontendLangs = frontendConfig.languages.map((l) =>
        l.toLowerCase(),
      );

      // Check if it's an ambiguous language (TypeScript/JavaScript)
      if (
        AMBIGUOUS_LANGUAGES.map((l) => l.toLowerCase()).includes(lang)
      ) {
        const repoContext = `${repo.name || ''} ${repo.description || ''}`.toLowerCase();
        const hasBackendContext = backendConfig.keywords.some((kw) =>
          repoContext.includes(kw.toLowerCase()),
        );
        const hasFrontendContext = frontendConfig.keywords.some((kw) =>
          repoContext.includes(kw.toLowerCase()),
        );

        if (hasBackendContext && !hasFrontendContext) {
          backendCount++;
        } else if (hasFrontendContext && !hasBackendContext) {
          frontendCount++;
        }
        // If both or neither, don't count toward ratio
        continue;
      }

      // Check Kotlin ambiguity
      if (lang === 'kotlin') {
        const repoContext = `${repo.name || ''} ${repo.description || ''}`.toLowerCase();
        const isAndroid = KOTLIN_ANDROID_KEYWORDS.some((kw) =>
          repoContext.includes(kw.toLowerCase()),
        );
        const isBackend = KOTLIN_BACKEND_KEYWORDS.some((kw) =>
          repoContext.includes(kw.toLowerCase()),
        );

        if (isBackend && !isAndroid) {
          backendCount++;
        }
        // Android Kotlin is neither backend nor frontend for this calculation
        continue;
      }

      // Direct language matching
      if (normalizedBackendLangs.includes(lang)) {
        backendCount++;
      } else if (normalizedFrontendLangs.includes(lang)) {
        frontendCount++;
      }
    }

    const total = backendCount + frontendCount;
    const backendRatio = total > 0 ? backendCount / total : 0;

    return {
      backendCount,
      frontendCount,
      backendRatio,
      passesFilter: backendRatio >= BACKEND_FILTER_CONFIG.minBackendLanguageRatio,
    };
  }

  /**
   * Strict role matching with ratio filter for backend
   */
  matchesRoleStrict(context: FilterContext, role: TargetRole): boolean {
    // For non-backend roles, use standard matching
    if (role !== 'backend') {
      return this.matchesRole(context, role);
    }

    // First check basic matching
    if (!this.matchesRole(context, role)) {
      return false;
    }

    // Apply ratio filter for backend
    const ratioAnalysis = this.analyzeBackendRatio(context);

    if (!ratioAnalysis.passesFilter) {
      this.logger.debug(
        `Failed backend ratio filter: ${ratioAnalysis.backendRatio.toFixed(2)} < ${BACKEND_FILTER_CONFIG.minBackendLanguageRatio}`,
      );
      return false;
    }

    return true;
  }
}
