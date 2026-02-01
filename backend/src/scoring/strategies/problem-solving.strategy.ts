import { Injectable } from '@nestjs/common';
import {
  ScoringStrategy,
  StrategyScore,
  CandidateWithRelations,
} from './scoring-strategy.interface';

@Injectable()
export class ProblemSolvingStrategy implements ScoringStrategy {
  readonly name = 'problemSolving';
  readonly description = 'Scores based on problem-solving indicators: algorithms, OSS contributions';
  readonly defaultWeight = 0.25;

  private readonly algorithmPatterns = [
    /algorithm/i,
    /leetcode/i,
    /boj|baekjoon/i,
    /programmers/i,
    /codingtest|coding-test/i,
    /hackerrank/i,
    /codeforces/i,
    /atcoder/i,
    /topcoder/i,
    /euler/i,
  ];

  private readonly prestigiousOrgs = new Set([
    'woowacourse',
    'woowacourse-teams',
    'sparcs-kaist',
    'wafflestudio',
    'depromeet',
    'prgrms-web-devcourse',
    'goorm',
    'kakao',
    'naver',
    'line',
    'toss',
    'coupang',
    'baemin',
  ]);

  async calculate(candidate: CandidateWithRelations): Promise<StrategyScore> {
    const breakdown: Record<string, number> = {};

    const algorithmScore = this.scoreAlgorithmPractice(candidate.repositories);
    breakdown.algorithm = algorithmScore;

    const sourceScore = this.scoreSourceQuality(candidate.sources);
    breakdown.sourceQuality = sourceScore;

    const projectComplexityScore = this.scoreProjectComplexity(candidate.repositories);
    breakdown.projectComplexity = projectComplexityScore;

    const diversityScore = this.scoreProblemDiversity(candidate.repositories);
    breakdown.diversity = diversityScore;

    const value = Math.round(
      algorithmScore * 0.30 +
      sourceScore * 0.30 +
      projectComplexityScore * 0.25 +
      diversityScore * 0.15
    );

    return {
      value: Math.min(value, 100),
      breakdown,
    };
  }

  private scoreAlgorithmPractice(repositories: CandidateWithRelations['repositories']): number {
    const algorithmRepos = repositories.filter(r =>
      this.algorithmPatterns.some(pattern =>
        pattern.test(r.name) || (r.description && pattern.test(r.description))
      )
    );

    if (algorithmRepos.length === 0) return 40;

    let score = 50;
    score += Math.min(algorithmRepos.length * 10, 30);

    const hasStarredAlgo = algorithmRepos.some(r => r.starCount > 0);
    if (hasStarredAlgo) score += 10;

    const wellMaintained = algorithmRepos.filter(r =>
      r.description && r.description.length > 20
    );
    if (wellMaintained.length > 0) score += 10;

    return Math.min(score, 100);
  }

  private scoreSourceQuality(sources: CandidateWithRelations['sources']): number {
    if (sources.length === 0) return 40;

    let score = 50;

    const fromPrestigious = sources.filter(s =>
      this.prestigiousOrgs.has(s.sourceName.toLowerCase())
    );

    score += Math.min(fromPrestigious.length * 15, 30);

    const uniqueTypes = new Set(sources.map(s => s.sourceType));
    score += Math.min(uniqueTypes.size * 10, 20);

    return Math.min(score, 100);
  }

  private scoreProjectComplexity(repositories: CandidateWithRelations['repositories']): number {
    if (repositories.length === 0) return 40;

    let score = 40;

    const complexPatterns = [
      /engine|compiler|interpreter|parser/i,
      /framework|library|sdk/i,
      /database|cache|queue/i,
      /distributed|microservice/i,
      /ml|machine-?learning|ai|deep-?learning/i,
      /blockchain|crypto/i,
      /realtime|websocket|streaming/i,
    ];

    const complexProjects = repositories.filter(r =>
      complexPatterns.some(pattern =>
        pattern.test(r.name) || (r.description && pattern.test(r.description))
      )
    );

    score += Math.min(complexProjects.length * 15, 40);

    const starredProjects = repositories.filter(r => r.starCount >= 10);
    score += Math.min(starredProjects.length * 10, 20);

    return Math.min(score, 100);
  }

  private scoreProblemDiversity(repositories: CandidateWithRelations['repositories']): number {
    const domains = new Set<string>();

    const domainPatterns: Array<[RegExp, string]> = [
      [/frontend|react|vue|angular|svelte|next/i, 'frontend'],
      [/backend|api|server|express|nest|spring|django/i, 'backend'],
      [/mobile|ios|android|flutter|react-?native/i, 'mobile'],
      [/devops|ci|cd|docker|k8s|kubernetes|terraform/i, 'devops'],
      [/data|analytics|etl|pipeline/i, 'data'],
      [/ml|ai|machine|deep|neural/i, 'ml'],
      [/game|unity|unreal/i, 'game'],
      [/embedded|iot|arduino|raspberry/i, 'embedded'],
    ];

    for (const repo of repositories) {
      for (const [pattern, domain] of domainPatterns) {
        if (pattern.test(repo.name) || (repo.description && pattern.test(repo.description))) {
          domains.add(domain);
        }
      }
    }

    const count = domains.size;
    if (count >= 4) return 100;
    if (count >= 3) return 85;
    if (count >= 2) return 70;
    if (count >= 1) return 55;
    return 40;
  }
}
