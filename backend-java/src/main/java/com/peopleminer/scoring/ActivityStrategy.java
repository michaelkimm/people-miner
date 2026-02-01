package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.Repository;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class ActivityStrategy implements ScoringStrategy {

    @Override
    public String getName() {
        return "activity";
    }

    @Override
    public String getDescription() {
        return "Scores based on GitHub activity: repos, commits, contributions";
    }

    @Override
    public double getDefaultWeight() {
        return 0.25;
    }

    @Override
    public StrategyScore calculate(Candidate candidate) {
        Map<String, Double> breakdown = new HashMap<>();

        double repoScore = scoreRepositoryCount(candidate.getPublicRepos());
        breakdown.put("repositories", repoScore);

        double repoQualityScore = scoreRepositoryQuality(candidate.getRepositories());
        breakdown.put("repositoryQuality", repoQualityScore);

        double languageDiversityScore = scoreLanguageDiversity(candidate.getRepositories());
        breakdown.put("languageDiversity", languageDiversityScore);

        double commitScore = scoreCommitActivity(candidate.getTotalCommits());
        breakdown.put("commits", commitScore);

        double tilBonus = scoreTilBonus(candidate.isHasTilRepo(), candidate.getTilRepoCount());
        breakdown.put("tilBonus", tilBonus);

        double longTermBonus = scoreLongTermProject(candidate.getLongestProjectMonths());
        breakdown.put("longTermBonus", longTermBonus);

        double baseScore = Math.round(
            repoScore * 0.25 +
            repoQualityScore * 0.30 +
            languageDiversityScore * 0.20 +
            commitScore * 0.25
        );

        double value = Math.min(baseScore + tilBonus + longTermBonus, 100);

        return StrategyScore.builder()
            .value(Math.min(value, 100))
            .breakdown(breakdown)
            .build();
    }

    private double scoreRepositoryCount(int count) {
        if (count >= 50) return 100;
        if (count >= 30) return 85;
        if (count >= 20) return 70;
        if (count >= 10) return 55;
        if (count >= 5) return 40;
        return Math.max(count * 8, 0);
    }

    private double scoreRepositoryQuality(List<Repository> repositories) {
        if (repositories == null || repositories.isEmpty()) return 30;

        double score = 40;

        long withDescription = repositories.stream()
            .filter(r -> r.getDescription() != null && r.getDescription().length() > 20)
            .count();
        score += Math.min((double) withDescription / repositories.size() * 30, 30);

        long meaningfulNames = repositories.stream()
            .filter(r -> r.getName().length() > 3 &&
                !r.getName().toLowerCase().matches("^(test|demo|temp|tmp|untitled).*"))
            .count();
        score += Math.min((double) meaningfulNames / repositories.size() * 30, 30);

        return Math.min(score, 100);
    }

    private double scoreLanguageDiversity(List<Repository> repositories) {
        if (repositories == null || repositories.isEmpty()) return 20;

        Set<String> languages = repositories.stream()
            .map(Repository::getLanguage)
            .filter(lang -> lang != null && !lang.isEmpty())
            .collect(Collectors.toSet());

        int count = languages.size();
        if (count >= 5) return 100;
        if (count >= 4) return 85;
        if (count >= 3) return 70;
        if (count >= 2) return 55;
        if (count >= 1) return 40;
        return 20;
    }

    private double scoreCommitActivity(int totalCommits) {
        if (totalCommits >= 1000) return 100;
        if (totalCommits >= 500) return 85;
        if (totalCommits >= 200) return 70;
        if (totalCommits >= 100) return 55;
        if (totalCommits >= 50) return 40;
        return Math.max(30, Math.floor(totalCommits * 0.6));
    }

    private double scoreTilBonus(boolean hasTilRepo, int tilRepoCount) {
        if (!hasTilRepo) return 0;
        return tilRepoCount >= 2 ? 15 : 10;
    }

    private double scoreLongTermProject(int longestProjectMonths) {
        if (longestProjectMonths >= 12) return 20;
        if (longestProjectMonths >= 6) return 15;
        if (longestProjectMonths >= 3) return 10;
        return 0;
    }
}
