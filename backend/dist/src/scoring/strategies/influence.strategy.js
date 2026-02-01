"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfluenceStrategy = void 0;
const common_1 = require("@nestjs/common");
let InfluenceStrategy = class InfluenceStrategy {
    constructor() {
        this.name = 'influence';
        this.description = 'Scores based on community influence: followers, stars, forks';
        this.defaultWeight = 0.20;
    }
    async calculate(candidate) {
        const breakdown = {};
        const followerScore = this.scoreFollowers(candidate.followers);
        breakdown.followers = followerScore;
        const starScore = this.scoreStars(candidate.repositories);
        breakdown.stars = starScore;
        const forkScore = this.scoreForks(candidate.repositories);
        breakdown.forks = forkScore;
        const networkScore = this.scoreNetwork(candidate.followers, candidate.following);
        breakdown.network = networkScore;
        const value = Math.round(followerScore * 0.35 +
            starScore * 0.35 +
            forkScore * 0.15 +
            networkScore * 0.15);
        return {
            value: Math.min(value, 100),
            breakdown,
        };
    }
    scoreFollowers(followers) {
        if (followers >= 1000)
            return 100;
        if (followers >= 500)
            return 90;
        if (followers >= 200)
            return 80;
        if (followers >= 100)
            return 70;
        if (followers >= 50)
            return 60;
        if (followers >= 20)
            return 50;
        if (followers >= 10)
            return 40;
        return Math.max(30, followers * 3);
    }
    scoreStars(repositories) {
        const totalStars = repositories.reduce((sum, r) => sum + r.starCount, 0);
        const maxStars = Math.max(...repositories.map(r => r.starCount), 0);
        let score = 30;
        if (totalStars >= 500)
            score += 35;
        else if (totalStars >= 200)
            score += 28;
        else if (totalStars >= 100)
            score += 22;
        else if (totalStars >= 50)
            score += 16;
        else if (totalStars >= 20)
            score += 10;
        else
            score += Math.floor(totalStars * 0.5);
        if (maxStars >= 100)
            score += 35;
        else if (maxStars >= 50)
            score += 28;
        else if (maxStars >= 20)
            score += 20;
        else if (maxStars >= 10)
            score += 12;
        else
            score += Math.floor(maxStars);
        return Math.min(score, 100);
    }
    scoreForks(repositories) {
        const totalForks = repositories.reduce((sum, r) => sum + r.forkCount, 0);
        if (totalForks >= 100)
            return 100;
        if (totalForks >= 50)
            return 85;
        if (totalForks >= 20)
            return 70;
        if (totalForks >= 10)
            return 55;
        if (totalForks >= 5)
            return 45;
        return Math.max(30, totalForks * 6);
    }
    scoreNetwork(followers, following) {
        if (following === 0)
            return 50;
        const ratio = followers / following;
        if (ratio >= 5)
            return 100;
        if (ratio >= 2)
            return 85;
        if (ratio >= 1)
            return 70;
        if (ratio >= 0.5)
            return 55;
        return 40;
    }
};
exports.InfluenceStrategy = InfluenceStrategy;
exports.InfluenceStrategy = InfluenceStrategy = __decorate([
    (0, common_1.Injectable)()
], InfluenceStrategy);
//# sourceMappingURL=influence.strategy.js.map