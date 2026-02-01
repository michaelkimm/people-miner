package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.RepoAnalysis;
import com.peopleminer.domain.entity.Repository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CodeQualityStrategyTest {

    private CodeQualityStrategy codeQualityStrategy;

    @BeforeEach
    void setUp() {
        codeQualityStrategy = new CodeQualityStrategy();
    }

    @Test
    @DisplayName("getName should return 'codeQuality'")
    void getNameReturnsCodeQuality() {
        assertThat(codeQualityStrategy.getName()).isEqualTo("codeQuality");
    }

    @Test
    @DisplayName("getDefaultWeight should return 0.20")
    void getDefaultWeightReturns020() {
        assertThat(codeQualityStrategy.getDefaultWeight()).isEqualTo(0.20);
    }

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCases {

        @Test
        @DisplayName("Null repositories should return score of 30")
        void nullRepositoriesReturnsScore30() {
            Candidate candidate = Candidate.builder()
                .repositories(null)
                .build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getValue()).isEqualTo(30);
        }

        @Test
        @DisplayName("Empty repositories should return score of 30")
        void emptyRepositoriesReturnsScore30() {
            Candidate candidate = Candidate.builder()
                .repositories(new ArrayList<>())
                .build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getValue()).isEqualTo(30);
        }

        @Test
        @DisplayName("Repositories without analysis should return score of 40")
        void repositoriesWithoutAnalysisReturnsScore40() {
            List<Repository> repos = List.of(
                Repository.builder().name("repo1").fullName("user/repo1").url("url").build(),
                Repository.builder().name("repo2").fullName("user/repo2").url("url").build()
            );

            Candidate candidate = Candidate.builder()
                .repositories(repos)
                .build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getValue()).isEqualTo(40);
            assertThat(score.getBreakdown().get("noAnalysis")).isEqualTo(40.0);
        }
    }

    @Nested
    @DisplayName("Test Coverage Scoring")
    class TestCoverageScoring {

        @Test
        @DisplayName("80%+ test coverage should score 100")
        void eightyPercentPlusCoverageScores100() {
            List<Repository> repos = createReposWithTestCoverage(10, 8);
            Candidate candidate = Candidate.builder().repositories(repos).build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tests")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("60%+ test coverage should score 85")
        void sixtyPercentPlusCoverageScores85() {
            List<Repository> repos = createReposWithTestCoverage(10, 6);
            Candidate candidate = Candidate.builder().repositories(repos).build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tests")).isEqualTo(85.0);
        }

        @Test
        @DisplayName("40%+ test coverage should score 70")
        void fortyPercentPlusCoverageScores70() {
            List<Repository> repos = createReposWithTestCoverage(10, 4);
            Candidate candidate = Candidate.builder().repositories(repos).build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tests")).isEqualTo(70.0);
        }

        @Test
        @DisplayName("20%+ test coverage should score 55")
        void twentyPercentPlusCoverageScores55() {
            List<Repository> repos = createReposWithTestCoverage(10, 2);
            Candidate candidate = Candidate.builder().repositories(repos).build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tests")).isEqualTo(55.0);
        }

        @Test
        @DisplayName("Some test coverage should score 40")
        void someTestCoverageScores40() {
            List<Repository> repos = createReposWithTestCoverage(10, 1);
            Candidate candidate = Candidate.builder().repositories(repos).build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tests")).isEqualTo(40.0);
        }

        @Test
        @DisplayName("No test coverage should score 20")
        void noTestCoverageScores20() {
            List<Repository> repos = createReposWithTestCoverage(10, 0);
            Candidate candidate = Candidate.builder().repositories(repos).build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("tests")).isEqualTo(20.0);
        }
    }

    @Nested
    @DisplayName("CI/CD Scoring")
    class CICDScoring {

        @Test
        @DisplayName("70%+ CI coverage should score 100")
        void seventyPercentPlusCIScores100() {
            List<Repository> repos = createReposWithCI(10, 7);
            Candidate candidate = Candidate.builder().repositories(repos).build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("cicd")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("50%+ CI coverage should score 85")
        void fiftyPercentPlusCIScores85() {
            List<Repository> repos = createReposWithCI(10, 5);
            Candidate candidate = Candidate.builder().repositories(repos).build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("cicd")).isEqualTo(85.0);
        }

        @Test
        @DisplayName("30%+ CI coverage should score 70")
        void thirtyPercentPlusCIScores70() {
            List<Repository> repos = createReposWithCI(10, 3);
            Candidate candidate = Candidate.builder().repositories(repos).build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("cicd")).isEqualTo(70.0);
        }

        @Test
        @DisplayName("10%+ CI coverage should score 55")
        void tenPercentPlusCIScores55() {
            List<Repository> repos = createReposWithCI(10, 1);
            Candidate candidate = Candidate.builder().repositories(repos).build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("cicd")).isEqualTo(55.0);
        }

        @Test
        @DisplayName("No CI should score 20")
        void noCIScores20() {
            List<Repository> repos = createReposWithCI(10, 0);
            Candidate candidate = Candidate.builder().repositories(repos).build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("cicd")).isEqualTo(20.0);
        }
    }

    @Nested
    @DisplayName("Documentation Scoring")
    class DocumentationScoring {

        @Test
        @DisplayName("Full documentation should score 100")
        void fullDocumentationScores100() {
            RepoAnalysis analysis = RepoAnalysis.builder()
                .hasReadme(true)
                .hasContributing(true)
                .hasLicense(true)
                .hasDocs(true)
                .build();

            Repository repo = Repository.builder()
                .name("repo")
                .fullName("user/repo")
                .url("url")
                .analysis(analysis)
                .build();

            Candidate candidate = Candidate.builder()
                .repositories(List.of(repo))
                .build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("documentation")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("Only README should score 40")
        void onlyReadmeScores40() {
            RepoAnalysis analysis = RepoAnalysis.builder()
                .hasReadme(true)
                .hasContributing(false)
                .hasLicense(false)
                .hasDocs(false)
                .build();

            Repository repo = Repository.builder()
                .name("repo")
                .fullName("user/repo")
                .url("url")
                .analysis(analysis)
                .build();

            Candidate candidate = Candidate.builder()
                .repositories(List.of(repo))
                .build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("documentation")).isEqualTo(40.0);
        }
    }

    @Nested
    @DisplayName("Code Standards Scoring")
    class CodeStandardsScoring {

        @Test
        @DisplayName("Full code standards should score 100")
        void fullCodeStandardsScores100() {
            RepoAnalysis analysis = RepoAnalysis.builder()
                .hasLinter(true)
                .hasTypeCheck(true)
                .conventionalCommitRatio(0.8)
                .build();

            Repository repo = Repository.builder()
                .name("repo")
                .fullName("user/repo")
                .url("url")
                .analysis(analysis)
                .build();

            Candidate candidate = Candidate.builder()
                .repositories(List.of(repo))
                .build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("codeStandards")).isEqualTo(100.0);
        }

        @Test
        @DisplayName("Base score without standards should be 40")
        void baseScoreWithoutStandardsShouldBe40() {
            RepoAnalysis analysis = RepoAnalysis.builder()
                .hasLinter(false)
                .hasTypeCheck(false)
                .conventionalCommitRatio(0.0)
                .build();

            Repository repo = Repository.builder()
                .name("repo")
                .fullName("user/repo")
                .url("url")
                .analysis(analysis)
                .build();

            Candidate candidate = Candidate.builder()
                .repositories(List.of(repo))
                .build();

            ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

            assertThat(score.getBreakdown().get("codeStandards")).isEqualTo(40.0);
        }
    }

    @Test
    @DisplayName("Total score should not exceed 100")
    void totalScoreShouldNotExceed100() {
        RepoAnalysis analysis = RepoAnalysis.builder()
            .hasTests(true)
            .hasCI(true)
            .hasReadme(true)
            .hasContributing(true)
            .hasLicense(true)
            .hasDocs(true)
            .hasLinter(true)
            .hasTypeCheck(true)
            .conventionalCommitRatio(1.0)
            .build();

        Repository repo = Repository.builder()
            .name("repo")
            .fullName("user/repo")
            .url("url")
            .analysis(analysis)
            .build();

        Candidate candidate = Candidate.builder()
            .repositories(List.of(repo))
            .build();

        ScoringStrategy.StrategyScore score = codeQualityStrategy.calculate(candidate);

        assertThat(score.getValue()).isLessThanOrEqualTo(100);
    }

    // Helper methods
    private List<Repository> createReposWithTestCoverage(int totalRepos, int reposWithTests) {
        List<Repository> repos = new ArrayList<>();
        for (int i = 0; i < totalRepos; i++) {
            RepoAnalysis analysis = RepoAnalysis.builder()
                .hasTests(i < reposWithTests)
                .build();

            Repository repo = Repository.builder()
                .name("repo-" + i)
                .fullName("user/repo-" + i)
                .url("url")
                .analysis(analysis)
                .build();
            repos.add(repo);
        }
        return repos;
    }

    private List<Repository> createReposWithCI(int totalRepos, int reposWithCI) {
        List<Repository> repos = new ArrayList<>();
        for (int i = 0; i < totalRepos; i++) {
            RepoAnalysis analysis = RepoAnalysis.builder()
                .hasCI(i < reposWithCI)
                .build();

            Repository repo = Repository.builder()
                .name("repo-" + i)
                .fullName("user/repo-" + i)
                .url("url")
                .analysis(analysis)
                .build();
            repos.add(repo);
        }
        return repos;
    }
}
