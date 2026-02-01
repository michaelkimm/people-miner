import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { CrawlerProcessor } from './crawler.processor';
import { GithubOrgCrawler } from './sources/github-org.crawler';
import { DevEventCrawler } from './sources/dev-event.crawler';
import { TechBlogCrawler } from './sources/tech-blog.crawler';
import { GithubModule } from '../github/github.module';

export const CRAWL_QUEUE = 'crawl-queue';
export const SCORE_QUEUE = 'score-queue';

@Module({
  imports: [
    BullModule.registerQueue({
      name: CRAWL_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
    BullModule.registerQueue({ name: SCORE_QUEUE }),
    GithubModule,
  ],
  controllers: [CrawlerController],
  providers: [
    CrawlerService,
    CrawlerProcessor,
    GithubOrgCrawler,
    DevEventCrawler,
    TechBlogCrawler,
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}
