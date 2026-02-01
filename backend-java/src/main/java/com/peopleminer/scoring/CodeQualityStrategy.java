package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.RepoAnalysis;
import com.peopleminer.domain.entity.Repository;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
public class CodeQualityStrategy implements ScoringStrategy {

    @Override
    public String getName() {
        return "codeQuality";
    }

    @Override
    public String getDescription() {
        return "Scores based on code quality indicators: tests, CI/CD, documentation";
    }

    @Override
    public double getDefaultWeight() {
        return 0.20;
    }

    @Override
    public StrategyScore calculate(Candidate candidate) {
        List<Repository> repositories = candidate.getRepositories();
        if (repositories == null || repositories.isEmpty()) {
            return StrategyScore.builder()
                .value(30)
                .breakdown(Map.of())
                .build();
        }

        Map<String, Double> breakdown = new HashMap<>();

        List<RepoAnalysis> analyses = repositories.stream()
            .map(Repository::getAnalysis)
            .filter(Objects::nonNull)
            .toList();

        if (analyses.isEmpty()) {
            return StrategyScore.builder()
                .value(40)
                .breakdown(Map.of("noAnalysis", 40.0))
                .build();
        }

        // Test coverage score
        double testScore = scoreTestCoverage(analyses);
        breakdown.put("tests", testScore);

        // CI/CD score
        double ciScore = scoreCICD(analyses);
        breakdown.put("cicd", ciScore);

        // Documentation score
        double docScore = scoreDocumentation(analyses);
        breakdown.put("documentation", docScore);

        // Code standards score
        double standardsScore = scoreCodeStandards(analyses);
        breakdown.put("codeStandards", standardsScore);

        double value = Math.round(
            testScore * 0.30 +
            ciScore * 0.25 +
            docScore * 0.25 +
            standardsScore * 0.20
        );

        return StrategyScore.builder()
            .value(Math.min(value, 100))
            .breakdown(breakdown)
            .build();
    }

    private double scoreTestCoverage(List<RepoAnalysis> analyses) {
        long withTests = analyses.stream().filter(RepoAnalysis::isHasTests).count();
        double ratio = (double) withTests / analyses.size();

        if (ratio >= 0.8) return 100;
        if (ratio >= 0.6) return 85;
        if (ratio >= 0.4) return 70;
        if (ratio >= 0.2) return 55;
        if (ratio > 0) return 40;
        return 20;
    }

    private double scoreCICD(List<RepoAnalysis> analyses) {
        long withCI = analyses.stream().filter(RepoAnalysis::isHasCI).count();
        double ratio = (double) withCI / analyses.size();

        if (ratio >= 0.7) return 100;
        if (ratio >= 0.5) return 85;
        if (ratio >= 0.3) return 70;
        if (ratio >= 0.1) return 55;
        if (ratio > 0) return 40;
        return 20;
    }

    private double scoreDocumentation(List<RepoAnalysis> analyses) {
        double totalScore = 0;

        for (RepoAnalysis analysis : analyses) {
            double repoScore = 0;
            if (analysis.isHasReadme()) repoScore += 40;
            if (analysis.isHasContributing()) repoScore += 20;
            if (analysis.isHasLicense()) repoScore += 20;
            if (analysis.isHasDocs()) repoScore += 20;
            totalScore += repoScore;
        }

        return Math.min(totalScore / analyses.size(), 100);
    }

    private double scoreCodeStandards(List<RepoAnalysis> analyses) {
        double totalScore = 0;

        for (RepoAnalysis analysis : analyses) {
            double repoScore = 40; // Base score
            if (analysis.isHasLinter()) repoScore += 30;
            if (analysis.isHasTypeCheck()) repoScore += 20;
            if (analysis.getConventionalCommitRatio() != null && analysis.getConventionalCommitRatio() > 0.5) {
                repoScore += 10;
            }
            totalScore += Math.min(repoScore, 100);
        }

        return totalScore / analyses.size();
    }
}
