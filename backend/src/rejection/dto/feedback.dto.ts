import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RejectionReason } from '@prisma/client';

export class RejectCandidateDto {
  @IsEnum(RejectionReason)
  reason: RejectionReason;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  conditions: RuleCondition[];
}

export interface RuleCondition {
  field: string;
  operator: '<' | '>' | '<=' | '>=' | '=' | '!=' | 'in' | 'notIn' | 'contains';
  value: string | number | boolean | string[] | number[];
}

export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  conditions?: RuleCondition[];

  @IsOptional()
  enabled?: boolean;
}
