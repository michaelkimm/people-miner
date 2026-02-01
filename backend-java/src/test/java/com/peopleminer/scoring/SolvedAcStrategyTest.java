package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.SolvedAcProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SolvedAcStrategyTest {

    private SolvedAcStrategy solvedAcStrategy;

    @BeforeEach
    void setUp() {
        solvedAcStrategy = new SolvedAcStrategy();
    }

    @Test
    @DisplayName("getName should return 'solvedAc'")
    void getNameReturnsSolvedAc() {
        assertThat(solvedAcStrategy.getName()).isEqualTo("solvedAc");
    }

    @Test
    @DisplayName("getDefaultWeight should return 0.20")
    void getDefaultWeightReturns020() {
        assertThat(solvedAcStrategy.getDefaultWeight()).isEqualTo(0.20);
    }

    @Nested
    @DisplayName("Applicability")
    class Applicability {

        @Test
        @DisplayName("Should be applicable when candidate has solved.ac profile")
        void shouldBeApplicableWithProfile() {
            Candidate candidate = createCandidateWithProfile(20, 1000, 1500, 100);
            assertThat(solvedAcStrategy.isApplicable(candidate)).isTrue();
        }

        @Test
        @DisplayName("Should not be applicable when candidate has no solved.ac profile")
        void shouldNotBeApplicableWithoutProfile() {
            Candidate candidate = Candidate.builder().build();
            assertThat(solvedAcStrategy.isApplicable(candidate)).isFalse();
        }
    }

    @Nested
    @DisplayName("Tier Scoring")
    class TierScoring {

        @Test
        @DisplayName("Master tier (31) should score 100")
        void masterTierScores100() {
            Candidate candidate = createCandidateWithProfile(31, 2000, 3000, 365);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tier")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("Ruby tier (26-30) should score 95")
        void rubyTierScores95() {
            Candidate candidate = createCandidateWithProfile(26, 1500, 2500, 200);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tier")).isEqualTo(95.0);
        }

        @Test
        @DisplayName("Diamond tier (21-25) should score 85")
        void diamondTierScores85() {
            Candidate candidate = createCandidateWithProfile(21, 1200, 2000, 150);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tier")).isEqualTo(85.0);
        }

        @Test
        @DisplayName("Platinum tier (16-20) should score 75")
        void platinumTierScores75() {
            Candidate candidate = createCandidateWithProfile(16, 800, 1500, 100);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tier")).isEqualTo(75.0);
        }

        @Test
        @DisplayName("Gold tier (11-15) should score 60")
        void goldTierScores60() {
            Candidate candidate = createCandidateWithProfile(11, 500, 1200, 50);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tier")).isEqualTo(60.0);
        }

        @Test
        @DisplayName("Silver tier (6-10) should score 45")
        void silverTierScores45() {
            Candidate candidate = createCandidateWithProfile(6, 200, 800, 30);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tier")).isEqualTo(45.0);
        }

        @Test
        @DisplayName("Bronze tier (1-5) should score 30")
        void bronzeTierScores30() {
            Candidate candidate = createCandidateWithProfile(1, 50, 300, 10);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tier")).isEqualTo(30.0);
        }

        @Test
        @DisplayName("Unrated tier (0) should score 10")
        void unratedTierScores10() {
            Candidate candidate = createCandidateWithProfile(0, 0, 0, 0);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tier")).isEqualTo(10.0);
        }
    }

    @Nested
    @DisplayName("Solved Count Scoring")
    class SolvedCountScoring {

        @Test
        @DisplayName("2000+ solved should score 100")
        void twoThousandPlusSolvedScores100() {
            Candidate candidate = createCandidateWithProfile(20, 2000, 2000, 100);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("solvedCount")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("1000+ solved should score 80")
        void oneThousandPlusSolvedScores80() {
            Candidate candidate = createCandidateWithProfile(20, 1000, 2000, 100);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("solvedCount")).isEqualTo(80.0);
        }

        @Test
        @DisplayName("500+ solved should score 70")
        void fiveHundredPlusSolvedScores70() {
            Candidate candidate = createCandidateWithProfile(15, 500, 1500, 50);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("solvedCount")).isEqualTo(70.0);
        }

        @Test
        @DisplayName("100 solved should score 40")
        void oneHundredSolvedScores40() {
            Candidate candidate = createCandidateWithProfile(10, 100, 1000, 20);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("solvedCount")).isEqualTo(40.0);
        }
    }

    @Nested
    @DisplayName("Rating Scoring")
    class RatingScoring {

        @Test
        @DisplayName("3000+ rating should score 100")
        void threeThousandPlusRatingScores100() {
            Candidate candidate = createCandidateWithProfile(31, 2000, 3000, 365);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("rating")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("2000+ rating should score 80")
        void twoThousandPlusRatingScores80() {
            Candidate candidate = createCandidateWithProfile(21, 1000, 2000, 200);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("rating")).isEqualTo(80.0);
        }

        @Test
        @DisplayName("1200+ rating should score 60")
        void twelvehundredPlusRatingScores60() {
            Candidate candidate = createCandidateWithProfile(16, 500, 1200, 100);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("rating")).isEqualTo(60.0);
        }
    }

    @Nested
    @DisplayName("Streak Scoring")
    class StreakScoring {

        @Test
        @DisplayName("365+ day streak should score 100")
        void yearStreakScores100() {
            Candidate candidate = createCandidateWithProfile(20, 1000, 2000, 365);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("maxStreak")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("180+ day streak should score 85")
        void halfYearStreakScores85() {
            Candidate candidate = createCandidateWithProfile(20, 1000, 2000, 180);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("maxStreak")).isEqualTo(85.0);
        }

        @Test
        @DisplayName("100+ day streak should score 70")
        void hundredDayStreakScores70() {
            Candidate candidate = createCandidateWithProfile(20, 1000, 2000, 100);
            ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("maxStreak")).isEqualTo(70.0);
        }
    }

    @Test
    @DisplayName("Candidate without profile should return 0 score")
    void candidateWithoutProfileReturnsZero() {
        Candidate candidate = Candidate.builder().build();
        ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

        assertThat(score.getValue()).isEqualTo(0);
    }

    @Test
    @DisplayName("Total score should not exceed 100")
    void totalScoreShouldNotExceed100() {
        Candidate candidate = createCandidateWithProfile(31, 5000, 5000, 1000);
        ScoringStrategy.StrategyScore score = solvedAcStrategy.calculate(candidate);

        assertThat(score.getValue()).isLessThanOrEqualTo(100);
    }

    // Helper method
    private Candidate createCandidateWithProfile(int tier, int solvedCount, int rating, int maxStreak) {
        SolvedAcProfile profile = SolvedAcProfile.builder()
            .handle("testuser")
            .tier(tier)
            .tierName("Test Tier")
            .solvedCount(solvedCount)
            .rating(rating)
            .maxStreak(maxStreak)
            .voteCount(100)
            .classLevel(5)
            .build();

        Candidate candidate = Candidate.builder()
            .githubUsername("testuser")
            .solvedAcProfile(profile)
            .build();

        profile.setCandidate(candidate);
        return candidate;
    }
}
