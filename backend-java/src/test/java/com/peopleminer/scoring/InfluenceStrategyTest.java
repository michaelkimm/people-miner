package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.Repository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class InfluenceStrategyTest {

    private InfluenceStrategy influenceStrategy;

    @BeforeEach
    void setUp() {
        influenceStrategy = new InfluenceStrategy();
    }

    @Test
    @DisplayName("getName should return 'influence'")
    void getNameReturnsInfluence() {
        assertThat(influenceStrategy.getName()).isEqualTo("influence");
    }

    @Test
    @DisplayName("getDefaultWeight should return 0.15")
    void getDefaultWeightReturns015() {
        assertThat(influenceStrategy.getDefaultWeight()).isEqualTo(0.15);
    }

    @Nested
    @DisplayName("Follower Scoring")
    class FollowerScoring {

        @Test
        @DisplayName("1000+ followers should score 100")
        void thousandPlusFollowersScores100() {
            Candidate candidate = createCandidateWithFollowers(1000);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("followers")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("500+ followers should score 90")
        void fiveHundredPlusFollowersScores90() {
            Candidate candidate = createCandidateWithFollowers(500);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("followers")).isEqualTo(90.0);
        }

        @Test
        @DisplayName("200+ followers should score 80")
        void twoHundredPlusFollowersScores80() {
            Candidate candidate = createCandidateWithFollowers(200);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("followers")).isEqualTo(80.0);
        }

        @Test
        @DisplayName("100+ followers should score 70")
        void oneHundredPlusFollowersScores70() {
            Candidate candidate = createCandidateWithFollowers(100);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("followers")).isEqualTo(70.0);
        }

        @Test
        @DisplayName("50+ followers should score 60")
        void fiftyPlusFollowersScores60() {
            Candidate candidate = createCandidateWithFollowers(50);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("followers")).isEqualTo(60.0);
        }

        @Test
        @DisplayName("20+ followers should score 50")
        void twentyPlusFollowersScores50() {
            Candidate candidate = createCandidateWithFollowers(20);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("followers")).isEqualTo(50.0);
        }

        @Test
        @DisplayName("10+ followers should score 40")
        void tenPlusFollowersScores40() {
            Candidate candidate = createCandidateWithFollowers(10);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("followers")).isEqualTo(40.0);
        }

        @Test
        @DisplayName("Low followers should score based on formula")
        void lowFollowersScoresBasedOnFormula() {
            Candidate candidate = createCandidateWithFollowers(3);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            // 3 * 4 = 12, but max(12, 20) = 20
            assertThat(score.getBreakdown().get("followers")).isEqualTo(20.0);
        }
    }

    @Nested
    @DisplayName("Public Repos Scoring")
    class PublicReposScoring {

        @Test
        @DisplayName("100+ repos should score 100")
        void hundredPlusReposScores100() {
            Candidate candidate = createCandidateWithRepos(100);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("publicRepos")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("50+ repos should score 85")
        void fiftyPlusReposScores85() {
            Candidate candidate = createCandidateWithRepos(50);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("publicRepos")).isEqualTo(85.0);
        }

        @Test
        @DisplayName("30+ repos should score 70")
        void thirtyPlusReposScores70() {
            Candidate candidate = createCandidateWithRepos(30);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("publicRepos")).isEqualTo(70.0);
        }

        @Test
        @DisplayName("20+ repos should score 60")
        void twentyPlusReposScores60() {
            Candidate candidate = createCandidateWithRepos(20);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("publicRepos")).isEqualTo(60.0);
        }

        @Test
        @DisplayName("10+ repos should score 50")
        void tenPlusReposScores50() {
            Candidate candidate = createCandidateWithRepos(10);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("publicRepos")).isEqualTo(50.0);
        }

        @Test
        @DisplayName("Low repos should score based on formula")
        void lowReposScoresBasedOnFormula() {
            Candidate candidate = createCandidateWithRepos(3);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            // 3 * 5 = 15, but max(15, 20) = 20
            assertThat(score.getBreakdown().get("publicRepos")).isEqualTo(20.0);
        }
    }

    @Nested
    @DisplayName("Star Scoring")
    class StarScoring {

        @Test
        @DisplayName("500+ stars should score 100")
        void fiveHundredPlusStarsScores100() {
            Candidate candidate = createCandidateWithStars(500);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("stars")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("200+ stars should score 90")
        void twoHundredPlusStarsScores90() {
            Candidate candidate = createCandidateWithStars(200);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("stars")).isEqualTo(90.0);
        }

        @Test
        @DisplayName("100+ stars should score 80")
        void oneHundredPlusStarsScores80() {
            Candidate candidate = createCandidateWithStars(100);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("stars")).isEqualTo(80.0);
        }

        @Test
        @DisplayName("50+ stars should score 70")
        void fiftyPlusStarsScores70() {
            Candidate candidate = createCandidateWithStars(50);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("stars")).isEqualTo(70.0);
        }

        @Test
        @DisplayName("20+ stars should score 60")
        void twentyPlusStarsScores60() {
            Candidate candidate = createCandidateWithStars(20);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("stars")).isEqualTo(60.0);
        }

        @Test
        @DisplayName("10+ stars should score 50")
        void tenPlusStarsScores50() {
            Candidate candidate = createCandidateWithStars(10);
            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("stars")).isEqualTo(50.0);
        }

        @Test
        @DisplayName("Null repositories should score 20")
        void nullRepositoriesScores20() {
            Candidate candidate = Candidate.builder()
                .followers(10)
                .publicRepos(5)
                .repositories(null)
                .build();

            ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("stars")).isEqualTo(20.0);
        }
    }

    @Test
    @DisplayName("Total score should not exceed 100")
    void totalScoreShouldNotExceed100() {
        Candidate candidate = Candidate.builder()
            .followers(5000)
            .publicRepos(200)
            .repositories(createReposWithStars(1000))
            .build();

        ScoringStrategy.StrategyScore score = influenceStrategy.calculate(candidate);

        assertThat(score.getValue()).isLessThanOrEqualTo(100);
    }

    // Helper methods
    private Candidate createCandidateWithFollowers(int followers) {
        return Candidate.builder()
            .followers(followers)
            .publicRepos(10)
            .repositories(new ArrayList<>())
            .build();
    }

    private Candidate createCandidateWithRepos(int repoCount) {
        return Candidate.builder()
            .followers(50)
            .publicRepos(repoCount)
            .repositories(new ArrayList<>())
            .build();
    }

    private Candidate createCandidateWithStars(int totalStars) {
        return Candidate.builder()
            .followers(50)
            .publicRepos(10)
            .repositories(createReposWithStars(totalStars))
            .build();
    }

    private List<Repository> createReposWithStars(int totalStars) {
        List<Repository> repos = new ArrayList<>();
        repos.add(Repository.builder()
            .name("repo")
            .fullName("user/repo")
            .starCount(totalStars)
            .url("https://github.com/user/repo")
            .build());
        return repos;
    }
}
