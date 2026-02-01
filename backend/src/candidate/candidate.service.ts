import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CandidateStatus } from '@prisma/client';
import { TechStackFilterService } from '../filter/tech-stack-filter.service';
import { TargetRole } from '../config/tech-stack.config';

@Injectable()
export class CandidateService {
  constructor(
    private prisma: PrismaService,
    private techStackFilter: TechStackFilterService,
  ) {}

  async findAll(options?: {
    page?: number;
    limit?: number;
    sortBy?: 'totalScore' | 'followers' | 'crawledAt';
    order?: 'asc' | 'desc';
    search?: string;
    source?: string;
    minScore?: number;
    maxScore?: number;
    excludeRejected?: boolean;
    autoExclude?: boolean;
    role?: TargetRole;
    recentActivityOnly?: boolean;
    activityMonths?: number;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const sortBy = options?.sortBy || 'totalScore';
    const order = options?.order || 'desc';

    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (sortBy === 'totalScore') {
      whereClause.totalScore = { not: null };
    }

    if (options?.search) {
      whereClause.OR = [
        { githubUsername: { contains: options.search, mode: 'insensitive' } },
        { name: { contains: options.search, mode: 'insensitive' } },
        { company: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options?.source) {
      whereClause.sources = { some: { sourceName: options.source } };
    }

    if (options?.minScore !== undefined || options?.maxScore !== undefined) {
      whereClause.totalScore = {
        ...(whereClause.totalScore as object || {}),
        ...(options.minScore !== undefined ? { gte: options.minScore } : {}),
        ...(options.maxScore !== undefined ? { lte: options.maxScore } : {}),
      };
    }

    if (options?.excludeRejected) {
      whereClause.status = { not: CandidateStatus.REJECTED };
    }

    if (options?.recentActivityOnly) {
      const months = options.activityMonths || 6;
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      whereClause.lastActivityAt = { gte: cutoffDate };
    }

    let candidates = await this.prisma.candidate.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
      include: {
        sources: true,
        repositories: {
          take: 5,
          orderBy: { starCount: 'desc' },
        },
        solvedAcProfile: true,
      },
    });

    if (options?.autoExclude) {
      const enabledRules = await this.prisma.rejectionRule.findMany({
        where: { enabled: true },
      });

      if (enabledRules.length > 0) {
        candidates = candidates.filter((candidate) => {
          for (const rule of enabledRules) {
            const conditions = rule.conditions as unknown as {
              field: string;
              operator: string;
              value: unknown;
            }[];

            const matchesRule = conditions.every((condition) => {
              const candidateValue = this.getCandidateFieldValue(
                candidate,
                condition.field,
              );
              return this.evaluateCondition(
                candidateValue,
                condition.operator,
                condition.value,
              );
            });

            if (matchesRule) {
              return false;
            }
          }
          return true;
        });
      }
    }

    if (options?.role && options.role !== 'all') {
      candidates = candidates.filter((candidate) => {
        return this.techStackFilter.matchesRoleStrict(
          {
            repositories: candidate.repositories.map((r) => ({
              language: r.language,
              name: r.name,
              description: r.description,
            })),
            bio: (candidate as { bio?: string | null }).bio,
            company: candidate.company,
          },
          options.role!,
        );
      });
    }

    const total = await this.prisma.candidate.count({ where: whereClause });

    return {
      data: candidates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private getCandidateFieldValue(
    candidate: {
      totalScore: number | null;
      followers: number;
      publicRepos: number;
      totalCommits: number;
      company: string | null;
      location: string | null;
      sources: { sourceName: string }[];
      repositories: { language: string | null }[];
    },
    field: string,
  ): unknown {
    switch (field) {
      case 'totalScore':
        return candidate.totalScore;
      case 'followers':
        return candidate.followers;
      case 'publicRepos':
        return candidate.publicRepos;
      case 'totalCommits':
        return candidate.totalCommits;
      case 'company':
        return candidate.company;
      case 'location':
        return candidate.location;
      case 'primaryLanguage':
        return candidate.repositories[0]?.language;
      case 'sources':
        return candidate.sources.map((s) => s.sourceName);
      default:
        return undefined;
    }
  }

  private evaluateCondition(
    value: unknown,
    operator: string,
    conditionValue: unknown,
  ): boolean {
    if (value === null || value === undefined) {
      return operator === '=' && conditionValue === null;
    }

    switch (operator) {
      case '<':
        return (value as number) < (conditionValue as number);
      case '>':
        return (value as number) > (conditionValue as number);
      case '<=':
        return (value as number) <= (conditionValue as number);
      case '>=':
        return (value as number) >= (conditionValue as number);
      case '=':
        return value === conditionValue;
      case '!=':
        return value !== conditionValue;
      case 'in':
        return (conditionValue as unknown[]).includes(value);
      case 'notIn':
        return !(conditionValue as unknown[]).includes(value);
      case 'contains':
        if (Array.isArray(value)) {
          return value.includes(conditionValue);
        }
        return String(value).includes(String(conditionValue));
      default:
        return false;
    }
  }

  async findOne(id: string) {
    return this.prisma.candidate.findUnique({
      where: { id },
      include: {
        sources: true,
        repositories: {
          orderBy: { starCount: 'desc' },
        },
        solvedAcProfile: true,
      },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.candidate.findUnique({
      where: { githubUsername: username },
      include: {
        sources: true,
        repositories: {
          orderBy: { starCount: 'desc' },
        },
        solvedAcProfile: true,
      },
    });
  }

  async getStats() {
    const [total, withScore, recentlyAdded] = await Promise.all([
      this.prisma.candidate.count(),
      this.prisma.candidate.count({
        where: { totalScore: { not: null } },
      }),
      this.prisma.candidate.count({
        where: { crawledAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const topCandidates = await this.prisma.candidate.findMany({
      take: 10,
      where: { totalScore: { not: null } },
      orderBy: { totalScore: 'desc' },
      select: {
        id: true,
        githubUsername: true,
        name: true,
        avatarUrl: true,
        totalScore: true,
        company: true,
      },
    });

    return {
      total,
      withScore,
      recentlyAdded,
      topCandidates,
    };
  }

  async getSources() {
    const sources = await this.prisma.candidateSource.groupBy({
      by: ['sourceName'],
      _count: { sourceName: true },
      orderBy: { _count: { sourceName: 'desc' } },
    });

    return sources.map(s => ({
      name: s.sourceName,
      count: s._count.sourceName,
    }));
  }

  async deleteOldCandidates(monthsOld: number = 6) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

    const result = await this.prisma.candidate.deleteMany({
      where: { crawledAt: { lt: cutoffDate } },
    });

    return { deleted: result.count };
  }
}
