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

class ActivityStrategyTest {

    private ActivityStrategy activityStrategy;

    @BeforeEach
    void setUp() {
        activityStrategy = new ActivityStrategy();
    }

    @Test
    @DisplayName("getName should return 'activity'")
    void getNameReturnsActivity() {
        assertThat(activityStrategy.getName()).isEqualTo("activity");
    }

    @Test
    @DisplayName("getDefaultWeight should return 0.25")
    void getDefaultWeightReturns025() {
        assertThat(activityStrategy.getDefaultWeight()).isEqualTo(0.25);
    }

    @Nested
    @DisplayName("Repository Count Scoring")
    class RepositoryCountScoring {

        @Test
        @DisplayName("50+ repos should score 100")
        void fiftyPlusReposScores100() {
            Candidate candidate = createCandidateWithRepos(50, 0, List.of("Java"));
            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("repositories")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("30+ repos should score 85")
        void thirtyPlusReposScores85() {
            Candidate candidate = createCandidateWithRepos(30, 0, List.of("Java"));
            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("repositories")).isEqualTo(85.0);
        }

        @Test
        @DisplayName("20+ repos should score 70")
        void twentyPlusReposScores70() {
            Candidate candidate = createCandidateWithRepos(20, 0, List.of("Java"));
            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("repositories")).isEqualTo(70.0);
        }

        @Test
        @DisplayName("5 repos should score 40")
        void fiveReposScores40() {
            Candidate candidate = createCandidateWithRepos(5, 0, List.of("Java"));
            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("repositories")).isEqualTo(40.0);
        }
    }

    @Nested
    @DisplayName("Language Diversity Scoring")
    class LanguageDiversityScoring {

        @Test
        @DisplayName("5+ languages should score 100")
        void fivePlusLanguagesScores100() {
            Candidate candidate = createCandidateWithLanguages(List.of("Java", "Python", "Go", "Rust", "TypeScript"));
            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("languageDiversity")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("3 languages should score 70")
        void threeLanguagesScores70() {
            Candidate candidate = createCandidateWithLanguages(List.of("Java", "Python", "Go"));
            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("languageDiversity")).isEqualTo(70.0);
        }

        @Test
        @DisplayName("1 language should score 40")
        void oneLanguageScores40() {
            Candidate candidate = createCandidateWithLanguages(List.of("Java"));
            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("languageDiversity")).isEqualTo(40.0);
        }

        @Test
        @DisplayName("No languages should score 20")
        void noLanguagesScores20() {
            Candidate candidate = createCandidateWithLanguages(List.of());
            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("languageDiversity")).isEqualTo(20.0);
        }
    }

    @Nested
    @DisplayName("Commit Activity Scoring")
    class CommitActivityScoring {

        @Test
        @DisplayName("1000+ commits should score 100")
        void thousandPlusCommitsScores100() {
            Candidate candidate = createCandidateWithCommits(1000);
            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("commits")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("500+ commits should score 85")
        void fiveHundredPlusCommitsScores85() {
            Candidate candidate = createCandidateWithCommits(500);
            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("commits")).isEqualTo(85.0);
        }

        @Test
        @DisplayName("50 commits should score 40")
        void fiftyCommitsScores40() {
            Candidate candidate = createCandidateWithCommits(50);
            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("commits")).isEqualTo(40.0);
        }
    }

    @Nested
    @DisplayName("TIL Bonus Scoring")
    class TilBonusScoring {

        @Test
        @DisplayName("2+ TIL repos should give 15 bonus")
        void twoOrMoreTilReposGives15Bonus() {
            Candidate candidate = Candidate.builder()
                .publicRepos(10)
                .totalCommits(100)
                .hasTilRepo(true)
                .tilRepoCount(2)
                .repositories(createRepositories(5, List.of("Java")))
                .build();

            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tilBonus")).isEqualTo(15.0);
        }

        @Test
        @DisplayName("1 TIL repo should give 10 bonus")
        void oneTilRepoGives10Bonus() {
            Candidate candidate = Candidate.builder()
                .publicRepos(10)
                .totalCommits(100)
                .hasTilRepo(true)
                .tilRepoCount(1)
                .repositories(createRepositories(5, List.of("Java")))
                .build();

            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tilBonus")).isEqualTo(10.0);
        }

        @Test
        @DisplayName("No TIL repo should give 0 bonus")
        void noTilRepoGives0Bonus() {
            Candidate candidate = Candidate.builder()
                .publicRepos(10)
                .totalCommits(100)
                .hasTilRepo(false)
                .tilRepoCount(0)
                .repositories(createRepositories(5, List.of("Java")))
                .build();

            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tilBonus")).isEqualTo(0.0);
        }
    }

    @Nested
    @DisplayName("Long Term Project Bonus Scoring")
    class LongTermProjectBonusScoring {

        @Test
        @DisplayName("12+ months project should give 20 bonus")
        void twelveOrMoreMonthsGives20Bonus() {
            Candidate candidate = Candidate.builder()
                .publicRepos(10)
                .totalCommits(100)
                .longestProjectMonths(12)
                .repositories(createRepositories(5, List.of("Java")))
                .build();

            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("longTermBonus")).isEqualTo(20.0);
        }

        @Test
        @DisplayName("6+ months project should give 15 bonus")
        void sixOrMoreMonthsGives15Bonus() {
            Candidate candidate = Candidate.builder()
                .publicRepos(10)
                .totalCommits(100)
                .longestProjectMonths(6)
                .repositories(createRepositories(5, List.of("Java")))
                .build();

            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("longTermBonus")).isEqualTo(15.0);
        }

        @Test
        @DisplayName("3+ months project should give 10 bonus")
        void threeOrMoreMonthsGives10Bonus() {
            Candidate candidate = Candidate.builder()
                .publicRepos(10)
                .totalCommits(100)
                .longestProjectMonths(3)
                .repositories(createRepositories(5, List.of("Java")))
                .build();

            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("longTermBonus")).isEqualTo(10.0);
        }

        @Test
        @DisplayName("Less than 3 months should give 0 bonus")
        void lessThanThreeMonthsGives0Bonus() {
            Candidate candidate = Candidate.builder()
                .publicRepos(10)
                .totalCommits(100)
                .longestProjectMonths(2)
                .repositories(createRepositories(5, List.of("Java")))
                .build();

            ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("longTermBonus")).isEqualTo(0.0);
        }
    }

    @Test
    @DisplayName("Total score should not exceed 100")
    void totalScoreShouldNotExceed100() {
        Candidate candidate = Candidate.builder()
            .publicRepos(100)
            .totalCommits(2000)
            .hasTilRepo(true)
            .tilRepoCount(5)
            .longestProjectMonths(24)
            .repositories(createRepositories(10, List.of("Java", "Python", "Go", "Rust", "TypeScript", "Kotlin")))
            .build();

        ScoringStrategy.StrategyScore score = activityStrategy.calculate(candidate);

        assertThat(score.getValue()).isLessThanOrEqualTo(100);
    }

    // Helper methods
    private Candidate createCandidateWithRepos(int repoCount, int commits, List<String> languages) {
        return Candidate.builder()
            .publicRepos(repoCount)
            .totalCommits(commits)
            .repositories(createRepositories(Math.min(repoCount, 10), languages))
            .build();
    }

    private Candidate createCandidateWithLanguages(List<String> languages) {
        List<Repository> repos = new ArrayList<>();
        for (String language : languages) {
            repos.add(Repository.builder()
                .name("repo-" + language.toLowerCase())
                .fullName("user/repo-" + language.toLowerCase())
                .language(language)
                .description("A project written in " + language)
                .url("https://github.com/user/repo-" + language.toLowerCase())
                .build());
        }

        return Candidate.builder()
            .publicRepos(repos.size())
            .totalCommits(100)
            .repositories(repos)
            .build();
    }

    private Candidate createCandidateWithCommits(int commits) {
        return Candidate.builder()
            .publicRepos(10)
            .totalCommits(commits)
            .repositories(createRepositories(5, List.of("Java")))
            .build();
    }

    private List<Repository> createRepositories(int count, List<String> languages) {
        List<Repository> repos = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            String language = languages.isEmpty() ? null : languages.get(i % languages.size());
            repos.add(Repository.builder()
                .name("repo-" + i)
                .fullName("user/repo-" + i)
                .language(language)
                .description("Description for repository " + i)
                .url("https://github.com/user/repo-" + i)
                .build());
        }
        return repos;
    }
}
