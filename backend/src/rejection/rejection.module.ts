import { Module } from '@nestjs/common';
import { RejectionController } from './rejection.controller';
import { RejectionService } from './rejection.service';
import { RejectionLearningService } from './rejection-learning.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RejectionController],
  providers: [RejectionService, RejectionLearningService],
  exports: [RejectionService, RejectionLearningService],
})
export class RejectionModule {}
