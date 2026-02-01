import { RejectionReason } from '@prisma/client';
export declare class RejectCandidateDto {
    reason: RejectionReason;
    notes?: string;
}
export declare class CreateRuleDto {
    name: string;
    description?: string;
    conditions: RuleCondition[];
}
export interface RuleCondition {
    field: string;
    operator: '<' | '>' | '<=' | '>=' | '=' | '!=' | 'in' | 'notIn' | 'contains';
    value: string | number | boolean | string[] | number[];
}
export declare class UpdateRuleDto {
    name?: string;
    description?: string;
    conditions?: RuleCondition[];
    enabled?: boolean;
}
