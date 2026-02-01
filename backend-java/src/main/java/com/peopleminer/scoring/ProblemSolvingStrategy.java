package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.OSSContribution;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class ProblemSolvingStrategy implements ScoringStrategy {

    @Override
    public String getName() {
        return "problemSolving";
    }

    @Override
    public String getDescription() {
        return "Scores based on problem-solving indicators: OSS contributions, PR complexity";
    }

    @Override
    public double getDefaultWeight() {
        return 0.20;
    }

    @Override
    public boolean isApplicable(Candidate candidate) {
        return candidate.getOssContributions() != null && !candidate.getOssContributions().isEmpty();
    }

    @Override
    public StrategyScore calculate(Candidate candidate) {
        List<OSSContribution> contributions = candidate.getOssContributions();
        if (contributions == null || contributions.isEmpty()) {
            return StrategyScore.builder()
                .value(0)
                .breakdown(Map.of())
                .build();
        }

        Map<String, Double> breakdown = new HashMap<>();

        // Contribution count score
        double countScore = scoreContributionCount(contributions.size());
        breakdown.put("contributionCount", countScore);

        // Merged PRs score
        long mergedCount = contributions.stream()
            .filter(c -> c.getMergedAt() != null)
            .count();
        double mergedScore = scoreMergedPRs(mergedCount);
        breakdown.put("mergedPRs", mergedScore);

        // Significant contributions score
        long significantCount = contributions.stream()
            .filter(OSSContribution::isSignificant)
            .count();
        double significantScore = scoreSignificantContributions(significantCount);
        breakdown.put("significantContributions", significantScore);

        // Code complexity score (based on additions/deletions)
        double complexityScore = scoreCodeComplexity(contributions);
        breakdown.put("codeComplexity", complexityScore);

        double value = Math.round(
            countScore * 0.25 +
            mergedScore * 0.30 +
            significantScore * 0.25 +
            complexityScore * 0.20
        );

        return StrategyScore.builder()
            .value(Math.min(value, 100))
            .breakdown(breakdown)
            .build();
    }

    private double scoreContributionCount(int count) {
        if (count >= 50) return 100;
        if (count >= 30) return 90;
        if (count >= 20) return 80;
        if (count >= 10) return 70;
        if (count >= 5) return 60;
        if (count >= 3) return 50;
        if (count >= 1) return 40;
        return 20;
    }

    private double scoreMergedPRs(long count) {
        if (count >= 30) return 100;
        if (count >= 20) return 90;
        if (count >= 10) return 80;
        if (count >= 5) return 70;
        if (count >= 3) return 60;
        if (count >= 1) return 50;
        return 20;
    }

    private double scoreSignificantContributions(long count) {
        if (count >= 10) return 100;
        if (count >= 5) return 85;
        if (count >= 3) return 70;
        if (count >= 1) return 55;
        return 30;
    }

    private double scoreCodeComplexity(List<OSSContribution> contributions) {
        if (contributions.isEmpty()) return 30;

        double totalComplexity = 0;
        for (OSSContribution contribution : contributions) {
            int changes = contribution.getAdditions() + contribution.getDeletions();
            // Higher changes indicate more substantial contributions
            if (changes >= 500) totalComplexity += 100;
            else if (changes >= 200) totalComplexity += 80;
            else if (changes >= 100) totalComplexity += 60;
            else if (changes >= 50) totalComplexity += 45;
            else totalComplexity += 30;
        }

        return totalComplexity / contributions.size();
    }
}
