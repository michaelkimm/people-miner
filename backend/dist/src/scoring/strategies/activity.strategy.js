"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityStrategy = void 0;
const common_1 = require("@nestjs/common");
let ActivityStrategy = class ActivityStrategy {
    constructor() {
        this.name = 'activity';
        this.description = 'Scores based on GitHub activity: repos, commits, contributions';
        this.defaultWeight = 0.25;
    }
    async calculate(candidate) {
        const breakdown = {};
        const repoScore = this.scoreRepositoryCount(candidate.publicRepos);
        breakdown.repositories = repoScore;
        const repoQualityScore = this.scoreRepositoryQuality(candidate.repositories);
        breakdown.repositoryQuality = repoQualityScore;
        const languageDiversityScore = this.scoreLanguageDiversity(candidate.repositories);
        breakdown.languageDiversity = languageDiversityScore;
        const commitScore = this.scoreCommitActivity(candidate.totalCommits);
        breakdown.commits = commitScore;
        const tilBonus = this.scoreTilBonus(candidate.hasTilRepo, candidate.tilRepoCount);
        breakdown.tilBonus = tilBonus;
        const longTermBonus = this.scoreLongTermProject(candidate.longestProjectMonths);
        breakdown.longTermBonus = longTermBonus;
        const baseScore = Math.round(repoScore * 0.25 +
            repoQualityScore * 0.30 +
            languageDiversityScore * 0.20 +
            commitScore * 0.25);
        const value = Math.min(baseScore + tilBonus + longTermBonus, 100);
        return {
            value: Math.min(value, 100),
            breakdown,
        };
    }
    scoreRepositoryCount(count) {
        if (count >= 50)
            return 100;
        if (count >= 30)
            return 85;
        if (count >= 20)
            return 70;
        if (count >= 10)
            return 55;
        if (count >= 5)
            return 40;
        return Math.max(count * 8, 0);
    }
    scoreRepositoryQuality(repositories) {
        if (repositories.length === 0)
            return 30;
        let score = 40;
        const withDescription = repositories.filter(r => r.description && r.description.length > 20);
        score += Math.min((withDescription.length / repositories.length) * 30, 30);
        const meaningfulNames = repositories.filter(r => r.name.length > 3 && !/^(test|demo|temp|tmp|untitled)/i.test(r.name));
        score += Math.min((meaningfulNames.length / repositories.length) * 30, 30);
        return Math.min(score, 100);
    }
    scoreLanguageDiversity(repositories) {
        const languages = new Set(repositories
            .map(r => r.language)
            .filter((lang) => lang !== null));
        const count = languages.size;
        if (count >= 5)
            return 100;
        if (count >= 4)
            return 85;
        if (count >= 3)
            return 70;
        if (count >= 2)
            return 55;
        if (count >= 1)
            return 40;
        return 20;
    }
    scoreCommitActivity(totalCommits) {
        if (totalCommits >= 1000)
            return 100;
        if (totalCommits >= 500)
            return 85;
        if (totalCommits >= 200)
            return 70;
        if (totalCommits >= 100)
            return 55;
        if (totalCommits >= 50)
            return 40;
        return Math.max(30, Math.floor(totalCommits * 0.6));
    }
    scoreTilBonus(hasTilRepo, tilRepoCount) {
        if (!hasTilRepo)
            return 0;
        return tilRepoCount >= 2 ? 15 : 10;
    }
    scoreLongTermProject(longestProjectMonths) {
        if (longestProjectMonths >= 12)
            return 20;
        if (longestProjectMonths >= 6)
            return 15;
        if (longestProjectMonths >= 3)
            return 10;
        return 0;
    }
};
exports.ActivityStrategy = ActivityStrategy;
exports.ActivityStrategy = ActivityStrategy = __decorate([
    (0, common_1.Injectable)()
], ActivityStrategy);
//# sourceMappingURL=activity.strategy.js.map