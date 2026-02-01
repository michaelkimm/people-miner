"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TechStackFilterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechStackFilterService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const tech_stack_config_1 = require("../config/tech-stack.config");
let TechStackFilterService = TechStackFilterService_1 = class TechStackFilterService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(TechStackFilterService_1.name);
        const role = this.configService.get('TARGET_ROLE', 'all');
        this.targetRole = this.validateRole(role);
        this.logger.log(`Tech stack filter initialized with target role: ${this.targetRole}`);
    }
    validateRole(role) {
        const validRoles = ['backend', 'frontend', 'mobile', 'fullstack', 'all'];
        if (validRoles.includes(role)) {
            return role;
        }
        this.logger.warn(`Invalid TARGET_ROLE "${role}", defaulting to "all"`);
        return 'all';
    }
    getTargetRole() {
        return this.targetRole;
    }
    matchesTargetRole(context) {
        return this.matchesRole(context, this.targetRole);
    }
    matchesRole(context, role) {
        if (role === 'all') {
            return true;
        }
        const config = tech_stack_config_1.TECH_STACK_CONFIG[role];
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
    extractLanguages(repositories) {
        const languages = repositories
            .map((repo) => repo.language)
            .filter((lang) => lang !== null);
        return [...new Set(languages)];
    }
    buildTextContext(context) {
        const parts = [];
        if (context.bio) {
            parts.push(context.bio);
        }
        if (context.company) {
            parts.push(context.company);
        }
        context.repositories.forEach((repo) => {
            if (repo.name)
                parts.push(repo.name);
            if (repo.description)
                parts.push(repo.description);
        });
        return parts.join(' ').toLowerCase();
    }
    hasExcludedKeywords(textContext, excludeKeywords) {
        return excludeKeywords.some((keyword) => textContext.includes(keyword.toLowerCase()));
    }
    hasExcludedLanguagesOnly(languages, excludeLanguages, targetLanguages) {
        if (languages.length === 0) {
            return false;
        }
        const normalizedLanguages = languages.map((l) => l.toLowerCase());
        const normalizedExclude = excludeLanguages.map((l) => l.toLowerCase());
        const normalizedTarget = targetLanguages.map((l) => l.toLowerCase());
        const hasOnlyExcludedLanguages = normalizedLanguages.every((lang) => normalizedExclude.includes(lang) && !normalizedTarget.includes(lang));
        return hasOnlyExcludedLanguages;
    }
    hasTargetLanguages(languages, targetLanguages, textContext, role) {
        const normalizedLanguages = languages.map((l) => l.toLowerCase());
        const normalizedTarget = targetLanguages.map((l) => l.toLowerCase());
        for (const lang of normalizedLanguages) {
            if (tech_stack_config_1.AMBIGUOUS_LANGUAGES.map((l) => l.toLowerCase()).includes(lang)) {
                if (role === 'backend') {
                    const hasBackendContext = tech_stack_config_1.TECH_STACK_CONFIG.backend.keywords.some((kw) => textContext.includes(kw.toLowerCase()));
                    if (hasBackendContext)
                        return true;
                }
                else if (role === 'frontend') {
                    const hasFrontendContext = tech_stack_config_1.TECH_STACK_CONFIG.frontend.keywords.some((kw) => textContext.includes(kw.toLowerCase()));
                    if (hasFrontendContext)
                        return true;
                }
                else if (role === 'fullstack') {
                    return true;
                }
                continue;
            }
            if (lang === 'kotlin') {
                const isAndroid = tech_stack_config_1.KOTLIN_ANDROID_KEYWORDS.some((kw) => textContext.includes(kw.toLowerCase()));
                const isBackend = tech_stack_config_1.KOTLIN_BACKEND_KEYWORDS.some((kw) => textContext.includes(kw.toLowerCase()));
                if (role === 'backend' && isBackend && !isAndroid)
                    return true;
                if (role === 'mobile' && isAndroid)
                    return true;
                if (role === 'fullstack' && isBackend)
                    return true;
                continue;
            }
            if (normalizedTarget.includes(lang)) {
                return true;
            }
        }
        return false;
    }
    hasTargetKeywords(textContext, keywords) {
        return keywords.some((keyword) => textContext.includes(keyword.toLowerCase()));
    }
    detectRole(context) {
        const roles = ['backend', 'frontend', 'mobile'];
        const matches = [];
        for (const role of roles) {
            if (this.matchesRole(context, role)) {
                matches.push(role);
            }
        }
        if (matches.length === 0)
            return 'all';
        if (matches.length === 1)
            return matches[0];
        if (matches.includes('backend') && matches.includes('frontend'))
            return 'fullstack';
        return matches[0];
    }
    analyzeBackendRatio(context) {
        const backendConfig = tech_stack_config_1.TECH_STACK_CONFIG.backend;
        const frontendConfig = tech_stack_config_1.TECH_STACK_CONFIG.frontend;
        let backendCount = 0;
        let frontendCount = 0;
        for (const repo of context.repositories) {
            if (!repo.language)
                continue;
            const lang = repo.language.toLowerCase();
            const normalizedBackendLangs = backendConfig.languages.map((l) => l.toLowerCase());
            const normalizedFrontendLangs = frontendConfig.languages.map((l) => l.toLowerCase());
            if (tech_stack_config_1.AMBIGUOUS_LANGUAGES.map((l) => l.toLowerCase()).includes(lang)) {
                const repoContext = `${repo.name || ''} ${repo.description || ''}`.toLowerCase();
                const hasBackendContext = backendConfig.keywords.some((kw) => repoContext.includes(kw.toLowerCase()));
                const hasFrontendContext = frontendConfig.keywords.some((kw) => repoContext.includes(kw.toLowerCase()));
                if (hasBackendContext && !hasFrontendContext) {
                    backendCount++;
                }
                else if (hasFrontendContext && !hasBackendContext) {
                    frontendCount++;
                }
                continue;
            }
            if (lang === 'kotlin') {
                const repoContext = `${repo.name || ''} ${repo.description || ''}`.toLowerCase();
                const isAndroid = tech_stack_config_1.KOTLIN_ANDROID_KEYWORDS.some((kw) => repoContext.includes(kw.toLowerCase()));
                const isBackend = tech_stack_config_1.KOTLIN_BACKEND_KEYWORDS.some((kw) => repoContext.includes(kw.toLowerCase()));
                if (isBackend && !isAndroid) {
                    backendCount++;
                }
                continue;
            }
            if (normalizedBackendLangs.includes(lang)) {
                backendCount++;
            }
            else if (normalizedFrontendLangs.includes(lang)) {
                frontendCount++;
            }
        }
        const total = backendCount + frontendCount;
        const backendRatio = total > 0 ? backendCount / total : 0;
        return {
            backendCount,
            frontendCount,
            backendRatio,
            passesFilter: backendRatio >= tech_stack_config_1.BACKEND_FILTER_CONFIG.minBackendLanguageRatio,
        };
    }
    matchesRoleStrict(context, role) {
        if (role !== 'backend') {
            return this.matchesRole(context, role);
        }
        if (!this.matchesRole(context, role)) {
            return false;
        }
        const ratioAnalysis = this.analyzeBackendRatio(context);
        if (!ratioAnalysis.passesFilter) {
            this.logger.debug(`Failed backend ratio filter: ${ratioAnalysis.backendRatio.toFixed(2)} < ${tech_stack_config_1.BACKEND_FILTER_CONFIG.minBackendLanguageRatio}`);
            return false;
        }
        return true;
    }
};
exports.TechStackFilterService = TechStackFilterService;
exports.TechStackFilterService = TechStackFilterService = TechStackFilterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TechStackFilterService);
//# sourceMappingURL=tech-stack-filter.service.js.map