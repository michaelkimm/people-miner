import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Query,
} from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { SourceType } from '@prisma/client';
import { SourceCategory } from '../config/crawl-sources.config';

@Controller('crawler')
export class CrawlerController {
  constructor(private crawlerService: CrawlerService) {}

  @Post('start')
  async startCrawl(
    @Body()
    body?: {
      categories?: SourceCategory[];
      sourceNames?: string[];
    },
  ) {
    return this.crawlerService.startCrawl(body);
  }

  @Post('crawl/:sourceName')
  async crawlSource(@Param('sourceName') sourceName: string) {
    return this.crawlerService.crawlSource(sourceName);
  }

  @Get('status/:jobId')
  async getCrawlStatus(@Param('jobId') jobId: string) {
    return this.crawlerService.getCrawlStatus(jobId);
  }

  @Get('latest')
  async getLatestJob() {
    return this.crawlerService.getLatestCrawlJob();
  }

  @Get('sources')
  async getSources(
    @Query('category') category?: SourceCategory,
    @Query('enabled') enabled?: string,
  ) {
    let sources = await this.crawlerService.getSources();

    if (category) {
      sources = sources.filter((s) => s.category === category);
    }

    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      sources = sources.filter((s) => s.enabled === isEnabled);
    }

    return sources;
  }

  @Get('sources/stats')
  async getSourcesStats() {
    return this.crawlerService.getSourcesStats();
  }

  @Post('sources/sync')
  async syncSources() {
    return this.crawlerService.syncSourcesFromConfig();
  }

  @Post('sources')
  async addSource(
    @Body()
    body: {
      name: string;
      displayName?: string;
      type: SourceType;
      url: string;
      config: Record<string, unknown>;
    },
  ) {
    return this.crawlerService.addSource(body);
  }

  @Patch('sources/:name')
  async toggleSource(
    @Param('name') name: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.crawlerService.toggleSource(name, body.enabled);
  }
}
