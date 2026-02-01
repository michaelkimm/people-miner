import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScoringService } from './scoring.service';

@Controller('scoring')
export class ScoringController {
  constructor(
    private scoringService: ScoringService,
    @InjectQueue('score-queue') private scoreQueue: Queue,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  async startScoring(
    @Body() body?: { force?: boolean; batchSize?: number },
  ) {
    const jobId = `score-${Date.now()}`;

    await this.scoreQueue.add(
      'score-batch',
      {
        jobId,
        force: body?.force ?? false,
        batchSize: body?.batchSize ?? 50,
      },
      { jobId },
    );

    return {
      jobId,
      message: 'Scoring job started',
    };
  }

  @Post('candidate/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  async scoreCandidate(@Param('id') candidateId: string) {
    const jobId = `score-${candidateId}-${Date.now()}`;

    await this.scoreQueue.add(
      'score-candidate',
      { candidateId, jobId },
      { jobId },
    );

    return {
      jobId,
      candidateId,
      message: 'Scoring job queued',
    };
  }

  @Get('strategies')
  getStrategies() {
    return this.scoringService.getStrategies();
  }

  @Patch('strategies/:name/weight')
  updateWeight(
    @Param('name') name: string,
    @Body() body: { weight: number },
  ) {
    this.scoringService.updateStrategyWeight(name, body.weight);
    return { success: true, name, weight: body.weight };
  }

  @Patch('strategies/:name/enable')
  enableStrategy(@Param('name') name: string) {
    this.scoringService.enableStrategy(name);
    return { success: true, name, enabled: true };
  }

  @Patch('strategies/:name/disable')
  disableStrategy(@Param('name') name: string) {
    this.scoringService.disableStrategy(name);
    return { success: true, name, enabled: false };
  }
}
