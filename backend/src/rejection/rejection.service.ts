import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CandidateStatus,
  FeedbackAction,
  RejectionReason,
  Prisma,
} from '@prisma/client';
import { CreateRuleDto, RuleCondition, UpdateRuleDto } from './dto/feedback.dto';

interface CandidateSnapshot {
  totalScore: number | null;
  followers: number;
  publicRepos: number;
  totalCommits: number;
  company: string | null;
  location: string | null;
  primaryLanguage: string | null;
  sources: string[];
}

export interface RejectionStats {
  totalRejected: number;
  totalShortlisted: number;
  activeRules: number;
  reasonDistribution: { reason: RejectionReason; count: number; percentage: number }[];
  recentRejections: number;
}

@Injectable()
export class RejectionService {
  private readonly logger = new Logger(RejectionService.name);

  constructor(private prisma: PrismaService) {}

  async rejectCandidate(
    candidateId: string,
    reason: RejectionReason,
    notes?: string,
  ) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        sources: true,
        repositories: { take: 1, orderBy: { starCount: 'desc' } },
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }

    const snapshot: CandidateSnapshot = {
      totalScore: candidate.totalScore,
      followers: candidate.followers,
      publicRepos: candidate.publicRepos,
      totalCommits: candidate.totalCommits,
      company: candidate.company,
      location: candidate.location,
      primaryLanguage: candidate.repositories[0]?.language || null,
      sources: candidate.sources.map((s) => s.sourceName),
    };

    await this.prisma.$transaction([
      this.prisma.candidate.update({
        where: { id: candidateId },
        data: { status: CandidateStatus.REJECTED },
      }),
      this.prisma.candidateFeedback.create({
        data: {
          candidateId,
          action: FeedbackAction.REJECT,
          reason,
          notes,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    this.logger.log(`Candidate ${candidateId} rejected with reason: ${reason}`);

    return { success: true, status: CandidateStatus.REJECTED };
  }

  async shortlistCandidate(candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.candidate.update({
        where: { id: candidateId },
        data: { status: CandidateStatus.SHORTLISTED },
      }),
      this.prisma.candidateFeedback.create({
        data: {
          candidateId,
          action: FeedbackAction.SHORTLIST,
        },
      }),
    ]);

    this.logger.log(`Candidate ${candidateId} shortlisted`);

    return { success: true, status: CandidateStatus.SHORTLISTED };
  }

  async undoFeedback(candidateId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.candidate.update({
        where: { id: candidateId },
        data: { status: CandidateStatus.ACTIVE },
      }),
      this.prisma.candidateFeedback.create({
        data: {
          candidateId,
          action: FeedbackAction.UNDO,
        },
      }),
    ]);

    this.logger.log(`Candidate ${candidateId} feedback undone`);

    return { success: true, status: CandidateStatus.ACTIVE };
  }

  async getStats(): Promise<RejectionStats> {
    const [
      totalRejected,
      totalShortlisted,
      activeRules,
      reasonCounts,
      recentRejections,
    ] = await Promise.all([
      this.prisma.candidate.count({
        where: { status: CandidateStatus.REJECTED },
      }),
      this.prisma.candidate.count({
        where: { status: CandidateStatus.SHORTLISTED },
      }),
      this.prisma.rejectionRule.count({
        where: { enabled: true },
      }),
      this.prisma.candidateFeedback.groupBy({
        by: ['reason'],
        where: {
          action: FeedbackAction.REJECT,
          reason: { not: null },
        },
        _count: { reason: true },
      }),
      this.prisma.candidateFeedback.count({
        where: {
          action: FeedbackAction.REJECT,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const totalReasons = reasonCounts.reduce(
      (sum, r) => sum + r._count.reason,
      0,
    );

    const reasonDistribution = reasonCounts
      .filter((r) => r.reason !== null)
      .map((r) => ({
        reason: r.reason as RejectionReason,
        count: r._count.reason,
        percentage:
          totalReasons > 0
            ? Math.round((r._count.reason / totalReasons) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRejected,
      totalShortlisted,
      activeRules,
      reasonDistribution,
      recentRejections,
    };
  }

  async getRules() {
    return this.prisma.rejectionRule.findMany({
      orderBy: [{ enabled: 'desc' }, { confidence: 'desc' }],
    });
  }

  async createRule(dto: CreateRuleDto) {
    return this.prisma.rejectionRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        conditions: dto.conditions as unknown as Prisma.InputJsonValue,
        autoGenerated: false,
      },
    });
  }

  async updateRule(id: string, dto: UpdateRuleDto) {
    const rule = await this.prisma.rejectionRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Rule ${id} not found`);
    }

    return this.prisma.rejectionRule.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.conditions && {
          conditions: dto.conditions as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      },
    });
  }

  async deleteRule(id: string) {
    const rule = await this.prisma.rejectionRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Rule ${id} not found`);
    }

    await this.prisma.rejectionRule.delete({ where: { id } });

    return { success: true };
  }

  async checkAutoExclude(candidateId: string): Promise<{
    shouldExclude: boolean;
    matchedRules: string[];
  }> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        sources: true,
        repositories: { take: 1, orderBy: { starCount: 'desc' } },
      },
    });

    if (!candidate) {
      return { shouldExclude: false, matchedRules: [] };
    }

    const enabledRules = await this.prisma.rejectionRule.findMany({
      where: { enabled: true },
    });

    const matchedRules: string[] = [];

    for (const rule of enabledRules) {
      const conditions = rule.conditions as unknown as RuleCondition[];
      const matches = this.evaluateConditions(candidate, conditions);

      if (matches) {
        matchedRules.push(rule.name);
      }
    }

    return {
      shouldExclude: matchedRules.length > 0,
      matchedRules,
    };
  }

  private evaluateConditions(
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
    conditions: RuleCondition[],
  ): boolean {
    for (const condition of conditions) {
      const value = this.getCandidateFieldValue(candidate, condition.field);
      const matches = this.evaluateCondition(value, condition);

      if (!matches) {
        return false;
      }
    }

    return conditions.length > 0;
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

  private evaluateCondition(value: unknown, condition: RuleCondition): boolean {
    const { operator, value: conditionValue } = condition;

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
}
