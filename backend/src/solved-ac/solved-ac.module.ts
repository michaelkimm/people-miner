import { Module } from '@nestjs/common';
import { SolvedAcService } from './solved-ac.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SolvedAcService],
  exports: [SolvedAcService],
})
export class SolvedAcModule {}
