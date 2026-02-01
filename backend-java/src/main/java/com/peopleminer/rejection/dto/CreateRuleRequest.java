package com.peopleminer.rejection.dto;

import com.peopleminer.domain.entity.RejectionRule;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRuleRequest {
    @NotBlank
    private String name;

    private String description;

    private List<RejectionRule.RuleCondition> conditions;
}
