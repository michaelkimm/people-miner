import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { RejectionService } from './rejection.service';
import { RejectionLearningService } from './rejection-learning.service';
import { CreateRuleDto, UpdateRuleDto } from './dto/feedback.dto';

@Controller('rejection')
export class RejectionController {
  constructor(
    private rejectionService: RejectionService,
    private learningService: RejectionLearningService,
  ) {}

  @Get('stats')
  async getStats() {
    return this.rejectionService.getStats();
  }

  @Get('rules')
  async getRules() {
    return this.rejectionService.getRules();
  }

  @Post('rules')
  async createRule(@Body() dto: CreateRuleDto) {
    return this.rejectionService.createRule(dto);
  }

  @Patch('rules/:id')
  async updateRule(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.rejectionService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id') id: string) {
    return this.rejectionService.deleteRule(id);
  }

  @Post('analyze')
  async analyzePatterns() {
    const patterns = await this.learningService.analyzePatterns();
    return { patterns };
  }

  @Post('generate-rules')
  async generateRules() {
    const created = await this.learningService.generateRulesFromPatterns();
    return { created };
  }

  @Get('check/:candidateId')
  async checkAutoExclude(@Param('candidateId') candidateId: string) {
    return this.rejectionService.checkAutoExclude(candidateId);
  }
}
