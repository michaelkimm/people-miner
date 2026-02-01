package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class InfluenceStrategy implements ScoringStrategy {

    @Override
    public String getName() {
        return "influence";
    }

    @Override
    public String getDescription() {
        return "Scores based on GitHub influence: followers, stars, public presence";
    }

    @Override
    public double getDefaultWeight() {
        return 0.15;
    }

    @Override
    public StrategyScore calculate(Candidate candidate) {
        Map<String, Double> breakdown = new HashMap<>();

        double followerScore = scoreFollowers(candidate.getFollowers());
        breakdown.put("followers", followerScore);

        double repoCountScore = scorePublicRepos(candidate.getPublicRepos());
        breakdown.put("publicRepos", repoCountScore);

        int totalStars = candidate.getRepositories() != null
            ? candidate.getRepositories().stream().mapToInt(r -> r.getStarCount()).sum()
            : 0;
        double starScore = scoreStars(totalStars);
        breakdown.put("stars", starScore);

        double value = Math.round(
            followerScore * 0.40 +
            repoCountScore * 0.30 +
            starScore * 0.30
        );

        return StrategyScore.builder()
            .value(Math.min(value, 100))
            .breakdown(breakdown)
            .build();
    }

    private double scoreFollowers(int followers) {
        if (followers >= 1000) return 100;
        if (followers >= 500) return 90;
        if (followers >= 200) return 80;
        if (followers >= 100) return 70;
        if (followers >= 50) return 60;
        if (followers >= 20) return 50;
        if (followers >= 10) return 40;
        return Math.max(followers * 4, 20);
    }

    private double scorePublicRepos(int count) {
        if (count >= 100) return 100;
        if (count >= 50) return 85;
        if (count >= 30) return 70;
        if (count >= 20) return 60;
        if (count >= 10) return 50;
        return Math.max(count * 5, 20);
    }

    private double scoreStars(int stars) {
        if (stars >= 500) return 100;
        if (stars >= 200) return 90;
        if (stars >= 100) return 80;
        if (stars >= 50) return 70;
        if (stars >= 20) return 60;
        if (stars >= 10) return 50;
        return Math.max(stars * 5, 20);
    }
}
