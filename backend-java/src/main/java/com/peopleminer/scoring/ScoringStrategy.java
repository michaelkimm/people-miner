package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

public interface ScoringStrategy {

    String getName();

    String getDescription();

    double getDefaultWeight();

    StrategyScore calculate(Candidate candidate);

    default boolean isApplicable(Candidate candidate) {
        return true;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    class StrategyScore {
        private double value;
        private Map<String, Double> breakdown;
        private Map<String, Object> metadata;
    }
}
