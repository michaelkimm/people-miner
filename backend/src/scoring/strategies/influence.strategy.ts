import { Injectable } from '@nestjs/common';
import {
  ScoringStrategy,
  StrategyScore,
  CandidateWithRelations,
} from './scoring-strategy.interface';

@Injectable()
export class InfluenceStrategy implements ScoringStrategy {
  readonly name = 'influence';
  readonly description = 'Scores based on community influence: followers, stars, forks';
  readonly defaultWeight = 0.20;

  async calculate(candidate: CandidateWithRelations): Promise<StrategyScore> {
    const breakdown: Record<string, number> = {};

    const followerScore = this.scoreFollowers(candidate.followers);
    breakdown.followers = followerScore;

    const starScore = this.scoreStars(candidate.repositories);
    breakdown.stars = starScore;

    const forkScore = this.scoreForks(candidate.repositories);
    breakdown.forks = forkScore;

    const networkScore = this.scoreNetwork(candidate.followers, candidate.following);
    breakdown.network = networkScore;

    const value = Math.round(
      followerScore * 0.35 +
      starScore * 0.35 +
      forkScore * 0.15 +
      networkScore * 0.15
    );

    return {
      value: Math.min(value, 100),
      breakdown,
    };
  }

  private scoreFollowers(followers: number): number {
    if (followers >= 1000) return 100;
    if (followers >= 500) return 90;
    if (followers >= 200) return 80;
    if (followers >= 100) return 70;
    if (followers >= 50) return 60;
    if (followers >= 20) return 50;
    if (followers >= 10) return 40;
    return Math.max(30, followers * 3);
  }

  private scoreStars(repositories: CandidateWithRelations['repositories']): number {
    const totalStars = repositories.reduce((sum, r) => sum + r.starCount, 0);
    const maxStars = Math.max(...repositories.map(r => r.starCount), 0);

    let score = 30;

    if (totalStars >= 500) score += 35;
    else if (totalStars >= 200) score += 28;
    else if (totalStars >= 100) score += 22;
    else if (totalStars >= 50) score += 16;
    else if (totalStars >= 20) score += 10;
    else score += Math.floor(totalStars * 0.5);

    if (maxStars >= 100) score += 35;
    else if (maxStars >= 50) score += 28;
    else if (maxStars >= 20) score += 20;
    else if (maxStars >= 10) score += 12;
    else score += Math.floor(maxStars);

    return Math.min(score, 100);
  }

  private scoreForks(repositories: CandidateWithRelations['repositories']): number {
    const totalForks = repositories.reduce((sum, r) => sum + r.forkCount, 0);

    if (totalForks >= 100) return 100;
    if (totalForks >= 50) return 85;
    if (totalForks >= 20) return 70;
    if (totalForks >= 10) return 55;
    if (totalForks >= 5) return 45;
    return Math.max(30, totalForks * 6);
  }

  private scoreNetwork(followers: number, following: number): number {
    if (following === 0) return 50;

    const ratio = followers / following;

    if (ratio >= 5) return 100;
    if (ratio >= 2) return 85;
    if (ratio >= 1) return 70;
    if (ratio >= 0.5) return 55;
    return 40;
  }
}
