import { Module, Global } from '@nestjs/common';
import { TechStackFilterService } from './tech-stack-filter.service';

@Global()
@Module({
  providers: [TechStackFilterService],
  exports: [TechStackFilterService],
})
export class FilterModule {}
