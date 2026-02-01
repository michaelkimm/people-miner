package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.SolvedAcProfile;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class SolvedAcStrategy implements ScoringStrategy {

    @Override
    public String getName() {
        return "solvedAc";
    }

    @Override
    public String getDescription() {
        return "Scores based on solved.ac profile: tier, rating, problem count";
    }

    @Override
    public double getDefaultWeight() {
        return 0.20;
    }

    @Override
    public boolean isApplicable(Candidate candidate) {
        return candidate.getSolvedAcProfile() != null;
    }

    @Override
    public StrategyScore calculate(Candidate candidate) {
        SolvedAcProfile profile = candidate.getSolvedAcProfile();
        if (profile == null) {
            return StrategyScore.builder()
                .value(0)
                .breakdown(Map.of())
                .build();
        }

        Map<String, Double> breakdown = new HashMap<>();

        double tierScore = scoreTier(profile.getTier());
        breakdown.put("tier", tierScore);

        double solvedScore = scoreSolvedCount(profile.getSolvedCount());
        breakdown.put("solvedCount", solvedScore);

        double ratingScore = scoreRating(profile.getRating());
        breakdown.put("rating", ratingScore);

        double streakScore = scoreStreak(profile.getMaxStreak());
        breakdown.put("maxStreak", streakScore);

        double value = Math.round(
            tierScore * 0.35 +
            solvedScore * 0.30 +
            ratingScore * 0.25 +
            streakScore * 0.10
        );

        return StrategyScore.builder()
            .value(Math.min(value, 100))
            .breakdown(breakdown)
            .build();
    }

    private double scoreTier(int tier) {
        // Tier ranges: 0=Unrated, 1-5=Bronze, 6-10=Silver, 11-15=Gold,
        // 16-20=Platinum, 21-25=Diamond, 26-30=Ruby, 31=Master
        if (tier >= 31) return 100;  // Master
        if (tier >= 26) return 95;   // Ruby
        if (tier >= 21) return 85;   // Diamond
        if (tier >= 16) return 75;   // Platinum
        if (tier >= 11) return 60;   // Gold
        if (tier >= 6) return 45;    // Silver
        if (tier >= 1) return 30;    // Bronze
        return 10;  // Unrated
    }

    private double scoreSolvedCount(int count) {
        if (count >= 2000) return 100;
        if (count >= 1500) return 90;
        if (count >= 1000) return 80;
        if (count >= 500) return 70;
        if (count >= 300) return 60;
        if (count >= 200) return 50;
        if (count >= 100) return 40;
        if (count >= 50) return 30;
        return Math.max(count / 2, 10);
    }

    private double scoreRating(int rating) {
        if (rating >= 3000) return 100;
        if (rating >= 2500) return 90;
        if (rating >= 2000) return 80;
        if (rating >= 1500) return 70;
        if (rating >= 1200) return 60;
        if (rating >= 1000) return 50;
        if (rating >= 800) return 40;
        return Math.max(rating / 20, 20);
    }

    private double scoreStreak(int maxStreak) {
        if (maxStreak >= 365) return 100;
        if (maxStreak >= 180) return 85;
        if (maxStreak >= 100) return 70;
        if (maxStreak >= 50) return 55;
        if (maxStreak >= 30) return 45;
        if (maxStreak >= 14) return 35;
        return Math.max(maxStreak * 2, 10);
    }
}
