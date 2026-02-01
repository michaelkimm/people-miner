import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { RejectionService } from '../rejection/rejection.service';
import { RejectCandidateDto } from '../rejection/dto/feedback.dto';
import { TargetRole } from '../config/tech-stack.config';

@Controller('candidates')
export class CandidateController {
  constructor(
    private candidateService: CandidateService,
    private rejectionService: RejectionService,
  ) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'totalScore' | 'followers' | 'crawledAt',
    @Query('order') order?: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('source') source?: string,
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
    @Query('excludeRejected') excludeRejected?: string,
    @Query('autoExclude') autoExclude?: string,
    @Query('role') role?: TargetRole,
    @Query('recentActivityOnly') recentActivityOnly?: string,
    @Query('activityMonths') activityMonths?: string,
  ) {
    return this.candidateService.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      sortBy,
      order,
      search,
      source,
      minScore: minScore ? parseFloat(minScore) : undefined,
      maxScore: maxScore ? parseFloat(maxScore) : undefined,
      excludeRejected: excludeRejected === 'true',
      autoExclude: autoExclude === 'true',
      role,
      recentActivityOnly: recentActivityOnly === 'true',
      activityMonths: activityMonths ? parseInt(activityMonths) : undefined,
    });
  }

  @Get('stats')
  async getStats() {
    return this.candidateService.getStats();
  }

  @Get('sources')
  async getSources() {
    return this.candidateService.getSources();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.candidateService.findOne(id);
  }

  @Get('username/:username')
  async findByUsername(@Param('username') username: string) {
    return this.candidateService.findByUsername(username);
  }

  @Post(':id/reject')
  async rejectCandidate(
    @Param('id') id: string,
    @Body() dto: RejectCandidateDto,
  ) {
    return this.rejectionService.rejectCandidate(id, dto.reason, dto.notes);
  }

  @Post(':id/shortlist')
  async shortlistCandidate(@Param('id') id: string) {
    return this.rejectionService.shortlistCandidate(id);
  }

  @Post(':id/undo')
  async undoFeedback(@Param('id') id: string) {
    return this.rejectionService.undoFeedback(id);
  }
}
