package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.OSSContribution;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ProblemSolvingStrategyTest {

    private ProblemSolvingStrategy problemSolvingStrategy;

    @BeforeEach
    void setUp() {
        problemSolvingStrategy = new ProblemSolvingStrategy();
    }

    @Test
    @DisplayName("getName should return 'problemSolving'")
    void getNameReturnsProblemSolving() {
        assertThat(problemSolvingStrategy.getName()).isEqualTo("problemSolving");
    }

    @Test
    @DisplayName("getDefaultWeight should return 0.20")
    void getDefaultWeightReturns020() {
        assertThat(problemSolvingStrategy.getDefaultWeight()).isEqualTo(0.20);
    }

    @Nested
    @DisplayName("Applicability")
    class Applicability {

        @Test
        @DisplayName("Should be applicable when candidate has OSS contributions")
        void shouldBeApplicableWithContributions() {
            Candidate candidate = createCandidateWithContributions(5, 3, 2);
            assertThat(problemSolvingStrategy.isApplicable(candidate)).isTrue();
        }

        @Test
        @DisplayName("Should not be applicable when candidate has no OSS contributions")
        void shouldNotBeApplicableWithoutContributions() {
            Candidate candidate = Candidate.builder().build();
            assertThat(problemSolvingStrategy.isApplicable(candidate)).isFalse();
        }

        @Test
        @DisplayName("Should not be applicable when OSS contributions is empty")
        void shouldNotBeApplicableWithEmptyContributions() {
            Candidate candidate = Candidate.builder()
                .ossContributions(new ArrayList<>())
                .build();
            assertThat(problemSolvingStrategy.isApplicable(candidate)).isFalse();
        }
    }

    @Nested
    @DisplayName("Contribution Count Scoring")
    class ContributionCountScoring {

        @Test
        @DisplayName("50+ contributions should score 100")
        void fiftyPlusContributionsScores100() {
            Candidate candidate = createCandidateWithContributions(50, 0, 0);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("contributionCount")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("30+ contributions should score 90")
        void thirtyPlusContributionsScores90() {
            Candidate candidate = createCandidateWithContributions(30, 0, 0);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("contributionCount")).isEqualTo(90.0);
        }

        @Test
        @DisplayName("20+ contributions should score 80")
        void twentyPlusContributionsScores80() {
            Candidate candidate = createCandidateWithContributions(20, 0, 0);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("contributionCount")).isEqualTo(80.0);
        }

        @Test
        @DisplayName("10+ contributions should score 70")
        void tenPlusContributionsScores70() {
            Candidate candidate = createCandidateWithContributions(10, 0, 0);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("contributionCount")).isEqualTo(70.0);
        }

        @Test
        @DisplayName("5+ contributions should score 60")
        void fivePlusContributionsScores60() {
            Candidate candidate = createCandidateWithContributions(5, 0, 0);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("contributionCount")).isEqualTo(60.0);
        }

        @Test
        @DisplayName("3+ contributions should score 50")
        void threePlusContributionsScores50() {
            Candidate candidate = createCandidateWithContributions(3, 0, 0);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("contributionCount")).isEqualTo(50.0);
        }

        @Test
        @DisplayName("1+ contributions should score 40")
        void onePlusContributionsScores40() {
            Candidate candidate = createCandidateWithContributions(1, 0, 0);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("contributionCount")).isEqualTo(40.0);
        }
    }

    @Nested
    @DisplayName("Merged PRs Scoring")
    class MergedPRsScoring {

        @Test
        @DisplayName("30+ merged PRs should score 100")
        void thirtyPlusMergedPRsScores100() {
            Candidate candidate = createCandidateWithMergedPRs(30);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("mergedPRs")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("20+ merged PRs should score 90")
        void twentyPlusMergedPRsScores90() {
            Candidate candidate = createCandidateWithMergedPRs(20);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("mergedPRs")).isEqualTo(90.0);
        }

        @Test
        @DisplayName("10+ merged PRs should score 80")
        void tenPlusMergedPRsScores80() {
            Candidate candidate = createCandidateWithMergedPRs(10);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("mergedPRs")).isEqualTo(80.0);
        }

        @Test
        @DisplayName("5+ merged PRs should score 70")
        void fivePlusMergedPRsScores70() {
            Candidate candidate = createCandidateWithMergedPRs(5);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("mergedPRs")).isEqualTo(70.0);
        }

        @Test
        @DisplayName("3+ merged PRs should score 60")
        void threePlusMergedPRsScores60() {
            Candidate candidate = createCandidateWithMergedPRs(3);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("mergedPRs")).isEqualTo(60.0);
        }

        @Test
        @DisplayName("1+ merged PRs should score 50")
        void onePlusMergedPRsScores50() {
            Candidate candidate = createCandidateWithMergedPRs(1);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("mergedPRs")).isEqualTo(50.0);
        }

        @Test
        @DisplayName("0 merged PRs should score 20")
        void zeroMergedPRsScores20() {
            Candidate candidate = createCandidateWithMergedPRs(0);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("mergedPRs")).isEqualTo(20.0);
        }
    }

    @Nested
    @DisplayName("Significant Contributions Scoring")
    class SignificantContributionsScoring {

        @Test
        @DisplayName("10+ significant contributions should score 100")
        void tenPlusSignificantScores100() {
            Candidate candidate = createCandidateWithSignificantContributions(10);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("significantContributions")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("5+ significant contributions should score 85")
        void fivePlusSignificantScores85() {
            Candidate candidate = createCandidateWithSignificantContributions(5);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("significantContributions")).isEqualTo(85.0);
        }

        @Test
        @DisplayName("3+ significant contributions should score 70")
        void threePlusSignificantScores70() {
            Candidate candidate = createCandidateWithSignificantContributions(3);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("significantContributions")).isEqualTo(70.0);
        }

        @Test
        @DisplayName("1+ significant contributions should score 55")
        void onePlusSignificantScores55() {
            Candidate candidate = createCandidateWithSignificantContributions(1);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("significantContributions")).isEqualTo(55.0);
        }

        @Test
        @DisplayName("0 significant contributions should score 30")
        void zeroSignificantScores30() {
            Candidate candidate = createCandidateWithSignificantContributions(0);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("significantContributions")).isEqualTo(30.0);
        }
    }

    @Nested
    @DisplayName("Code Complexity Scoring")
    class CodeComplexityScoring {

        @Test
        @DisplayName("500+ changes should score 100")
        void fiveHundredPlusChangesScores100() {
            Candidate candidate = createCandidateWithCodeChanges(500);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("codeComplexity")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("200+ changes should score 80")
        void twoHundredPlusChangesScores80() {
            Candidate candidate = createCandidateWithCodeChanges(200);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("codeComplexity")).isEqualTo(80.0);
        }

        @Test
        @DisplayName("100+ changes should score 60")
        void oneHundredPlusChangesScores60() {
            Candidate candidate = createCandidateWithCodeChanges(100);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("codeComplexity")).isEqualTo(60.0);
        }

        @Test
        @DisplayName("50+ changes should score 45")
        void fiftyPlusChangesScores45() {
            Candidate candidate = createCandidateWithCodeChanges(50);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("codeComplexity")).isEqualTo(45.0);
        }

        @Test
        @DisplayName("Low changes should score 30")
        void lowChangesScores30() {
            Candidate candidate = createCandidateWithCodeChanges(10);
            ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("codeComplexity")).isEqualTo(30.0);
        }
    }

    @Test
    @DisplayName("Candidate without contributions should return 0 score")
    void candidateWithoutContributionsReturnsZero() {
        Candidate candidate = Candidate.builder().build();
        ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

        assertThat(score.getValue()).isEqualTo(0);
    }

    @Test
    @DisplayName("Total score should not exceed 100")
    void totalScoreShouldNotExceed100() {
        List<OSSContribution> contributions = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            contributions.add(OSSContribution.builder()
                .externalRepo("org/repo-" + i)
                .prNumber(i)
                .prTitle("PR " + i)
                .prUrl("https://github.com/org/repo-" + i + "/pull/" + i)
                .additions(1000)
                .deletions(500)
                .isSignificant(true)
                .mergedAt(LocalDateTime.now())
                .build());
        }

        Candidate candidate = Candidate.builder()
            .ossContributions(contributions)
            .build();

        ScoringStrategy.StrategyScore score = problemSolvingStrategy.calculate(candidate);

        assertThat(score.getValue()).isLessThanOrEqualTo(100);
    }

    // Helper methods
    private Candidate createCandidateWithContributions(int count, int merged, int significant) {
        List<OSSContribution> contributions = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            contributions.add(OSSContribution.builder()
                .externalRepo("org/repo")
                .prNumber(i + 1)
                .prTitle("PR " + (i + 1))
                .prUrl("https://github.com/org/repo/pull/" + (i + 1))
                .additions(50)
                .deletions(20)
                .mergedAt(i < merged ? LocalDateTime.now() : null)
                .isSignificant(i < significant)
                .build());
        }

        return Candidate.builder()
            .ossContributions(contributions)
            .build();
    }

    private Candidate createCandidateWithMergedPRs(int mergedCount) {
        List<OSSContribution> contributions = new ArrayList<>();
        int totalCount = Math.max(mergedCount, 1);

        for (int i = 0; i < totalCount; i++) {
            contributions.add(OSSContribution.builder()
                .externalRepo("org/repo")
                .prNumber(i + 1)
                .prTitle("PR " + (i + 1))
                .prUrl("https://github.com/org/repo/pull/" + (i + 1))
                .additions(50)
                .deletions(20)
                .mergedAt(i < mergedCount ? LocalDateTime.now() : null)
                .isSignificant(false)
                .build());
        }

        return Candidate.builder()
            .ossContributions(contributions)
            .build();
    }

    private Candidate createCandidateWithSignificantContributions(int significantCount) {
        List<OSSContribution> contributions = new ArrayList<>();
        int totalCount = Math.max(significantCount, 1);

        for (int i = 0; i < totalCount; i++) {
            contributions.add(OSSContribution.builder()
                .externalRepo("org/repo")
                .prNumber(i + 1)
                .prTitle("PR " + (i + 1))
                .prUrl("https://github.com/org/repo/pull/" + (i + 1))
                .additions(50)
                .deletions(20)
                .mergedAt(null)
                .isSignificant(i < significantCount)
                .build());
        }

        return Candidate.builder()
            .ossContributions(contributions)
            .build();
    }

    private Candidate createCandidateWithCodeChanges(int totalChanges) {
        List<OSSContribution> contributions = new ArrayList<>();
        contributions.add(OSSContribution.builder()
            .externalRepo("org/repo")
            .prNumber(1)
            .prTitle("PR 1")
            .prUrl("https://github.com/org/repo/pull/1")
            .additions(totalChanges / 2)
            .deletions(totalChanges / 2)
            .mergedAt(null)
            .isSignificant(false)
            .build());

        return Candidate.builder()
            .ossContributions(contributions)
            .build();
    }
}
