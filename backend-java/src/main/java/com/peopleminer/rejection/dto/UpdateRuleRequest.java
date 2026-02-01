package com.peopleminer.rejection.dto;

import com.peopleminer.domain.entity.RejectionRule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRuleRequest {
    private String name;
    private String description;
    private List<RejectionRule.RuleCondition> conditions;
    private Boolean enabled;
}
