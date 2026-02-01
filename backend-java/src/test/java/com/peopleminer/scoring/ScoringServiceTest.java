package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.repository.CandidateRepository;
import com.peopleminer.scoring.StrategyRegistry.StrategyConfig;
import com.peopleminer.scoring.StrategyRegistry.StrategyWithConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class ScoringServiceTest {

    @Mock
    private CandidateRepository candidateRepository;

    @Mock
    private StrategyRegistry strategyRegistry;

    private ScoringService scoringService;
    private Candidate testCandidate;

    @BeforeEach
    void setUp() {
        scoringService = new ScoringService(candidateRepository, strategyRegistry);
        testCandidate = createTestCandidate();
    }

    @Nested
    @DisplayName("scoreCandidate")
    class ScoreCandidate {

        @Test
        @DisplayName("Should score candidate and return result")
        void shouldScoreCandidateAndReturnResult() {
            setupMocksForScoring();
            when(candidateRepository.findByIdWithRelations("test-id"))
                .thenReturn(Optional.of(testCandidate));

            ScoringService.ScoringResult result = scoringService.scoreCandidate("test-id");

            assertThat(result.getCandidateId()).isEqualTo("test-id");
            assertThat(result.getTotalScore()).isGreaterThan(0);
            assertThat(result.getStrategyScores()).isNotEmpty();
        }

        @Test
        @DisplayName("Should throw when candidate not found")
        void shouldThrowWhenCandidateNotFound() {
            when(candidateRepository.findByIdWithRelations("nonexistent"))
                .thenReturn(Optional.empty());

            assertThatThrownBy(() -> scoringService.scoreCandidate("nonexistent"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("nonexistent");
        }
    }

    @Nested
    @DisplayName("calculateScore")
    class CalculateScore {

        @Test
        @DisplayName("Should calculate total score from enabled strategies")
        void shouldCalculateTotalScoreFromEnabledStrategies() {
            ScoringStrategy strategy1 = createMockStrategy("strategy1", 80);
            ScoringStrategy strategy2 = createMockStrategy("strategy2", 60);

            when(strategyRegistry.getEnabledStrategies()).thenReturn(List.of(
                StrategyWithConfig.builder()
                    .strategy(strategy1)
                    .config(StrategyConfig.builder().name("strategy1").enabled(true).weight(0.5).build())
                    .build(),
                StrategyWithConfig.builder()
                    .strategy(strategy2)
                    .config(StrategyConfig.builder().name("strategy2").enabled(true).weight(0.5).build())
                    .build()
            ));
            when(strategyRegistry.getNormalizedWeights()).thenReturn(Map.of(
                "strategy1", 0.5,
                "strategy2", 0.5
            ));
            when(candidateRepository.save(any())).thenReturn(testCandidate);

            ScoringService.ScoringResult result = scoringService.calculateScore(testCandidate);

            // 80 * 0.5 + 60 * 0.5 = 70
            assertThat(result.getTotalScore()).isEqualTo(70);
            assertThat(result.getStrategyScores()).hasSize(2);
        }

        @Test
        @DisplayName("Should skip non-applicable strategies")
        void shouldSkipNonApplicableStrategies() {
            ScoringStrategy applicableStrategy = createMockStrategy("applicable", 80);
            ScoringStrategy nonApplicableStrategy = mock(ScoringStrategy.class);
            lenient().when(nonApplicableStrategy.getName()).thenReturn("nonApplicable");
            when(nonApplicableStrategy.isApplicable(any())).thenReturn(false);

            when(strategyRegistry.getEnabledStrategies()).thenReturn(List.of(
                StrategyWithConfig.builder()
                    .strategy(applicableStrategy)
                    .config(StrategyConfig.builder().name("applicable").enabled(true).weight(0.5).build())
                    .build(),
                StrategyWithConfig.builder()
                    .strategy(nonApplicableStrategy)
                    .config(StrategyConfig.builder().name("nonApplicable").enabled(true).weight(0.5).build())
                    .build()
            ));
            when(strategyRegistry.getNormalizedWeights()).thenReturn(Map.of(
                "applicable", 0.5,
                "nonApplicable", 0.5
            ));
            when(candidateRepository.save(any())).thenReturn(testCandidate);

            ScoringService.ScoringResult result = scoringService.calculateScore(testCandidate);

            // Only applicable strategy should be in result
            assertThat(result.getStrategyScores()).hasSize(1);
            assertThat(result.getStrategyScores().get(0).getStrategyName()).isEqualTo("applicable");
        }

        @Test
        @DisplayName("Should handle strategy exceptions gracefully")
        void shouldHandleStrategyExceptionsGracefully() {
            ScoringStrategy failingStrategy = mock(ScoringStrategy.class);
            when(failingStrategy.getName()).thenReturn("failing");
            when(failingStrategy.isApplicable(any())).thenReturn(true);
            when(failingStrategy.calculate(any())).thenThrow(new RuntimeException("Test error"));

            ScoringStrategy workingStrategy = createMockStrategy("working", 80);

            when(strategyRegistry.getEnabledStrategies()).thenReturn(List.of(
                StrategyWithConfig.builder()
                    .strategy(failingStrategy)
                    .config(StrategyConfig.builder().name("failing").enabled(true).weight(0.5).build())
                    .build(),
                StrategyWithConfig.builder()
                    .strategy(workingStrategy)
                    .config(StrategyConfig.builder().name("working").enabled(true).weight(0.5).build())
                    .build()
            ));
            when(strategyRegistry.getNormalizedWeights()).thenReturn(Map.of(
                "failing", 0.5,
                "working", 0.5
            ));
            when(candidateRepository.save(any())).thenReturn(testCandidate);

            // Should not throw
            ScoringService.ScoringResult result = scoringService.calculateScore(testCandidate);

            // Only working strategy should be in results
            assertThat(result.getStrategyScores()).hasSize(1);
            assertThat(result.getStrategyScores().get(0).getStrategyName()).isEqualTo("working");
        }

        @Test
        @DisplayName("Should update candidate score fields")
        void shouldUpdateCandidateScoreFields() {
            ScoringStrategy codeQualityStrategy = mock(ScoringStrategy.class);
            when(codeQualityStrategy.getName()).thenReturn("codeQuality");
            when(codeQualityStrategy.isApplicable(any())).thenReturn(true);
            when(codeQualityStrategy.calculate(any())).thenReturn(
                ScoringStrategy.StrategyScore.builder().value(85).breakdown(Map.of()).build()
            );

            when(strategyRegistry.getEnabledStrategies()).thenReturn(List.of(
                StrategyWithConfig.builder()
                    .strategy(codeQualityStrategy)
                    .config(StrategyConfig.builder().name("codeQuality").enabled(true).weight(1.0).build())
                    .build()
            ));
            when(strategyRegistry.getNormalizedWeights()).thenReturn(Map.of("codeQuality", 1.0));
            when(candidateRepository.save(any())).thenReturn(testCandidate);

            scoringService.calculateScore(testCandidate);

            verify(candidateRepository).save(testCandidate);
            assertThat(testCandidate.getReadabilityScore()).isEqualTo(85.0);
            assertThat(testCandidate.getScoredAt()).isNotNull();
        }
    }

    @Nested
    @DisplayName("scoreAllCandidates")
    class ScoreAllCandidates {

        @Test
        @DisplayName("Should score candidates needing scoring when force is false")
        void shouldScoreCandidatesNeedingScoringWhenForceIsFalse() {
            setupMocksForScoring();
            when(candidateRepository.findCandidatesNeedingScoring(any(), any()))
                .thenReturn(List.of(testCandidate));

            ScoringService.ScoreBatchResult result = scoringService.scoreAllCandidates(false, 100);

            assertThat(result.getScored()).isEqualTo(1);
            assertThat(result.getFailed()).isEqualTo(0);
            verify(candidateRepository).findCandidatesNeedingScoring(any(), any());
        }

        @Test
        @DisplayName("Should score all candidates when force is true")
        void shouldScoreAllCandidatesWhenForceIsTrue() {
            setupMocksForScoring();
            when(candidateRepository.findAll(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(testCandidate)));

            ScoringService.ScoreBatchResult result = scoringService.scoreAllCandidates(true, 100);

            assertThat(result.getScored()).isEqualTo(1);
            verify(candidateRepository).findAll(any(PageRequest.class));
        }

        @Test
        @DisplayName("Should count failed scorings")
        void shouldCountFailedScorings() {
            when(strategyRegistry.getEnabledStrategies()).thenThrow(new RuntimeException("Test error"));
            when(candidateRepository.findCandidatesNeedingScoring(any(), any()))
                .thenReturn(List.of(testCandidate));

            ScoringService.ScoreBatchResult result = scoringService.scoreAllCandidates(false, 100);

            assertThat(result.getScored()).isEqualTo(0);
            assertThat(result.getFailed()).isEqualTo(1);
        }
    }

    @Nested
    @DisplayName("getStrategies")
    class GetStrategies {

        @Test
        @DisplayName("Should return all strategy info")
        void shouldReturnAllStrategyInfo() {
            ScoringStrategy strategy = mock(ScoringStrategy.class);
            when(strategy.getName()).thenReturn("testStrategy");
            when(strategy.getDescription()).thenReturn("Test description");
            when(strategy.getDefaultWeight()).thenReturn(0.25);

            when(strategyRegistry.getAllStrategies()).thenReturn(List.of(
                StrategyWithConfig.builder()
                    .strategy(strategy)
                    .config(StrategyConfig.builder()
                        .name("testStrategy")
                        .enabled(true)
                        .weight(0.3)
                        .build())
                    .build()
            ));

            List<ScoringService.StrategyInfo> result = scoringService.getStrategies();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("testStrategy");
            assertThat(result.get(0).getDescription()).isEqualTo("Test description");
            assertThat(result.get(0).getEnabled()).isTrue();
            assertThat(result.get(0).getWeight()).isEqualTo(0.3);
            assertThat(result.get(0).getDefaultWeight()).isEqualTo(0.25);
        }
    }

    @Nested
    @DisplayName("Strategy Management")
    class StrategyManagement {

        @Test
        @DisplayName("Should update strategy weight")
        void shouldUpdateStrategyWeight() {
            scoringService.updateStrategyWeight("activity", 0.4);

            verify(strategyRegistry).setWeight("activity", 0.4);
        }

        @Test
        @DisplayName("Should enable strategy")
        void shouldEnableStrategy() {
            scoringService.enableStrategy("activity");

            verify(strategyRegistry).enable("activity");
        }

        @Test
        @DisplayName("Should disable strategy")
        void shouldDisableStrategy() {
            scoringService.disableStrategy("activity");

            verify(strategyRegistry).disable("activity");
        }
    }

    // Helper methods
    private Candidate createTestCandidate() {
        return Candidate.builder()
            .id("test-id")
            .githubUsername("testuser")
            .githubId(12345)
            .followers(100)
            .publicRepos(10)
            .totalCommits(500)
            .build();
    }

    private ScoringStrategy createMockStrategy(String name, double score) {
        ScoringStrategy strategy = mock(ScoringStrategy.class);
        when(strategy.getName()).thenReturn(name);
        when(strategy.isApplicable(any())).thenReturn(true);
        when(strategy.calculate(any())).thenReturn(
            ScoringStrategy.StrategyScore.builder()
                .value(score)
                .breakdown(Map.of())
                .build()
        );
        return strategy;
    }

    private void setupMocksForScoring() {
        ScoringStrategy strategy = createMockStrategy("testStrategy", 75);

        when(strategyRegistry.getEnabledStrategies()).thenReturn(List.of(
            StrategyWithConfig.builder()
                .strategy(strategy)
                .config(StrategyConfig.builder().name("testStrategy").enabled(true).weight(1.0).build())
                .build()
        ));
        when(strategyRegistry.getNormalizedWeights()).thenReturn(Map.of("testStrategy", 1.0));
        when(candidateRepository.save(any())).thenReturn(testCandidate);
    }
}
