"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeQualityStrategy = void 0;
const common_1 = require("@nestjs/common");
const TYPED_LANGUAGES = new Set([
    'TypeScript', 'Java', 'Kotlin', 'Go', 'Rust', 'Swift', 'C#', 'Scala',
]);
const MODERN_LANGUAGES = new Set([
    'TypeScript', 'Kotlin', 'Go', 'Rust', 'Swift', 'Python', 'Ruby',
]);
let CodeQualityStrategy = class CodeQualityStrategy {
    constructor() {
        this.name = 'codeQuality';
        this.description = 'Deep analysis of code quality based on actual repo structure';
        this.defaultWeight = 0.30;
    }
    async calculate(candidate) {
        const breakdown = {};
        breakdown.testing = this.scoreTestingCulture(candidate.repositories);
        breakdown.cicd = this.scoreCICDMaturity(candidate.repositories);
        breakdown.documentation = this.scoreDocumentation(candidate.repositories);
        breakdown.commitQuality = this.scoreCommitQuality(candidate.repositories);
        breakdown.ossContributions = this.scoreOSSContributions(candidate.ossContributions || []);
        breakdown.typeSafety = this.scoreTypeSafety(candidate.repositories);
        const value = Math.round(breakdown.testing * 0.20 +
            breakdown.cicd * 0.15 +
            breakdown.documentation * 0.15 +
            breakdown.commitQuality * 0.15 +
            breakdown.ossContributions * 0.20 +
            breakdown.typeSafety * 0.15);
        return {
            value: Math.min(value, 100),
            breakdown,
        };
    }
    scoreTestingCulture(repositories) {
        if (repositories.length === 0)
            return 40;
        const reposWithAnalysis = repositories.filter(r => r.analysis);
        if (reposWithAnalysis.length === 0) {
            return this.scoreLegacyTesting(repositories);
        }
        const reposWithTests = reposWithAnalysis.filter(r => r.analysis?.hasTests);
        const ratio = reposWithTests.length / reposWithAnalysis.length;
        let score = 40;
        if (ratio >= 0.7)
            score = 100;
        else if (ratio >= 0.5)
            score = 85;
        else if (ratio >= 0.3)
            score = 70;
        else if (ratio >= 0.1)
            score = 55;
        return score;
    }
    scoreLegacyTesting(repositories) {
        const testPatterns = /test|spec|e2e|integration|__tests__|jest|mocha|pytest|junit/i;
        const testRelated = repositories.filter(r => testPatterns.test(r.name) || (r.description && testPatterns.test(r.description)));
        let score = 40;
        if (testRelated.length > 0) {
            score += Math.min(testRelated.length * 15, 40);
        }
        return Math.min(score, 100);
    }
    scoreCICDMaturity(repositories) {
        if (repositories.length === 0)
            return 40;
        const reposWithAnalysis = repositories.filter(r => r.analysis);
        if (reposWithAnalysis.length === 0) {
            return this.scoreLegacyCI(repositories);
        }
        const reposWithCI = reposWithAnalysis.filter(r => r.analysis?.hasCI);
        const ratio = reposWithCI.length / reposWithAnalysis.length;
        if (ratio >= 0.6)
            return 100;
        if (ratio >= 0.4)
            return 80;
        if (ratio >= 0.2)
            return 60;
        if (ratio > 0)
            return 50;
        return 40;
    }
    scoreLegacyCI(repositories) {
        const ciPatterns = /ci|cd|pipeline|action|workflow|deploy/i;
        const ciRelated = repositories.filter(r => ciPatterns.test(r.name) || (r.description && ciPatterns.test(r.description)));
        return ciRelated.length > 0 ? 60 : 40;
    }
    scoreDocumentation(repositories) {
        if (repositories.length === 0)
            return 40;
        const reposWithAnalysis = repositories.filter(r => r.analysis);
        if (reposWithAnalysis.length === 0)
            return 50;
        let score = 40;
        const withReadme = reposWithAnalysis.filter(r => r.analysis?.hasReadme).length;
        const withDocs = reposWithAnalysis.filter(r => r.analysis?.hasDocs).length;
        const withContributing = reposWithAnalysis.filter(r => r.analysis?.hasContributing).length;
        const withLicense = reposWithAnalysis.filter(r => r.analysis?.hasLicense).length;
        const readmeRatio = withReadme / reposWithAnalysis.length;
        if (readmeRatio >= 0.8)
            score += 25;
        else if (readmeRatio >= 0.5)
            score += 15;
        else if (readmeRatio > 0)
            score += 10;
        if (withDocs > 0)
            score += 15;
        if (withContributing > 0)
            score += 10;
        if (withLicense > reposWithAnalysis.length * 0.5)
            score += 10;
        return Math.min(score, 100);
    }
    scoreCommitQuality(repositories) {
        const reposWithAnalysis = repositories.filter(r => r.analysis && r.analysis.conventionalCommitRatio !== null);
        if (reposWithAnalysis.length === 0)
            return 50;
        let totalRatio = 0;
        let totalLength = 0;
        let count = 0;
        for (const repo of reposWithAnalysis) {
            const analysis = repo.analysis;
            if (analysis && analysis.conventionalCommitRatio !== null) {
                totalRatio += analysis.conventionalCommitRatio;
                count++;
            }
            if (analysis && analysis.avgCommitMessageLength !== null) {
                totalLength += analysis.avgCommitMessageLength;
            }
        }
        if (count === 0)
            return 50;
        const avgConventionalRatio = totalRatio / count;
        const avgMsgLength = totalLength / count;
        let score = 40;
        if (avgConventionalRatio >= 0.7)
            score += 35;
        else if (avgConventionalRatio >= 0.4)
            score += 25;
        else if (avgConventionalRatio >= 0.2)
            score += 15;
        if (avgMsgLength >= 50)
            score += 15;
        else if (avgMsgLength >= 30)
            score += 10;
        else if (avgMsgLength >= 20)
            score += 5;
        return Math.min(score, 100);
    }
    scoreOSSContributions(contributions) {
        if (!contributions || contributions.length === 0)
            return 40;
        const significant = contributions.filter(c => c.isSignificant);
        const merged = contributions.filter(c => c.mergedAt !== null);
        let score = 40;
        if (significant.length >= 10)
            score += 40;
        else if (significant.length >= 5)
            score += 30;
        else if (significant.length >= 2)
            score += 20;
        else if (significant.length >= 1)
            score += 10;
        if (merged.length >= 20)
            score += 20;
        else if (merged.length >= 10)
            score += 15;
        else if (merged.length >= 5)
            score += 10;
        return Math.min(score, 100);
    }
    scoreTypeSafety(repositories) {
        if (repositories.length === 0)
            return 40;
        const typedRepos = repositories.filter(r => r.language && TYPED_LANGUAGES.has(r.language));
        const modernRepos = repositories.filter(r => r.language && MODERN_LANGUAGES.has(r.language));
        const typedRatio = typedRepos.length / repositories.length;
        const modernRatio = modernRepos.length / repositories.length;
        let score = 40;
        if (typedRatio >= 0.7)
            score += 35;
        else if (typedRatio >= 0.5)
            score += 25;
        else if (typedRatio >= 0.3)
            score += 15;
        if (modernRatio >= 0.6)
            score += 25;
        else if (modernRatio >= 0.4)
            score += 15;
        else if (modernRatio >= 0.2)
            score += 10;
        return Math.min(score, 100);
    }
};
exports.CodeQualityStrategy = CodeQualityStrategy;
exports.CodeQualityStrategy = CodeQualityStrategy = __decorate([
    (0, common_1.Injectable)()
], CodeQualityStrategy);
//# sourceMappingURL=code-quality.strategy.js.map