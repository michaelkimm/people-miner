package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StrategyRegistryTest {

    private StrategyRegistry strategyRegistry;
    private ScoringStrategy testStrategy1;
    private ScoringStrategy testStrategy2;

    @BeforeEach
    void setUp() {
        testStrategy1 = new TestStrategy("test1", 0.30);
        testStrategy2 = new TestStrategy("test2", 0.20);

        strategyRegistry = new StrategyRegistry(List.of(testStrategy1, testStrategy2));
    }

    @Nested
    @DisplayName("Registration")
    class Registration {

        @Test
        @DisplayName("Should register strategies from constructor")
        void shouldRegisterStrategiesFromConstructor() {
            assertThat(strategyRegistry.getStrategy("test1")).isPresent();
            assertThat(strategyRegistry.getStrategy("test2")).isPresent();
        }

        @Test
        @DisplayName("Should register new strategy dynamically")
        void shouldRegisterNewStrategyDynamically() {
            ScoringStrategy newStrategy = new TestStrategy("test3", 0.15);
            strategyRegistry.register(newStrategy);

            assertThat(strategyRegistry.getStrategy("test3")).isPresent();
        }

        @Test
        @DisplayName("Should return empty for non-existent strategy")
        void shouldReturnEmptyForNonExistentStrategy() {
            Optional<ScoringStrategy> result = strategyRegistry.getStrategy("nonexistent");

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("Get Strategies")
    class GetStrategies {

        @Test
        @DisplayName("Should return all strategies")
        void shouldReturnAllStrategies() {
            List<StrategyRegistry.StrategyWithConfig> all = strategyRegistry.getAllStrategies();

            assertThat(all).hasSize(2);
        }

        @Test
        @DisplayName("Should return only enabled strategies")
        void shouldReturnOnlyEnabledStrategies() {
            strategyRegistry.disable("test1");

            List<StrategyRegistry.StrategyWithConfig> enabled = strategyRegistry.getEnabledStrategies();

            assertThat(enabled).hasSize(1);
            assertThat(enabled.get(0).getConfig().getName()).isEqualTo("test2");
        }

        @Test
        @DisplayName("All strategies should be enabled by default")
        void allStrategiesShouldBeEnabledByDefault() {
            List<StrategyRegistry.StrategyWithConfig> enabled = strategyRegistry.getEnabledStrategies();

            assertThat(enabled).hasSize(2);
        }
    }

    @Nested
    @DisplayName("Enable/Disable")
    class EnableDisable {

        @Test
        @DisplayName("Should disable strategy")
        void shouldDisableStrategy() {
            strategyRegistry.disable("test1");

            List<StrategyRegistry.StrategyWithConfig> all = strategyRegistry.getAllStrategies();
            StrategyRegistry.StrategyConfig config = all.stream()
                .filter(s -> s.getConfig().getName().equals("test1"))
                .findFirst()
                .map(StrategyRegistry.StrategyWithConfig::getConfig)
                .orElseThrow();

            assertThat(config.getEnabled()).isFalse();
        }

        @Test
        @DisplayName("Should enable strategy")
        void shouldEnableStrategy() {
            strategyRegistry.disable("test1");
            strategyRegistry.enable("test1");

            List<StrategyRegistry.StrategyWithConfig> all = strategyRegistry.getAllStrategies();
            StrategyRegistry.StrategyConfig config = all.stream()
                .filter(s -> s.getConfig().getName().equals("test1"))
                .findFirst()
                .map(StrategyRegistry.StrategyWithConfig::getConfig)
                .orElseThrow();

            assertThat(config.getEnabled()).isTrue();
        }

        @Test
        @DisplayName("Should not throw for non-existent strategy on disable")
        void shouldNotThrowForNonExistentStrategyOnDisable() {
            strategyRegistry.disable("nonexistent");
            // Should not throw
        }
    }

    @Nested
    @DisplayName("Weight Management")
    class WeightManagement {

        @Test
        @DisplayName("Should set weight")
        void shouldSetWeight() {
            strategyRegistry.setWeight("test1", 0.5);

            List<StrategyRegistry.StrategyWithConfig> all = strategyRegistry.getAllStrategies();
            StrategyRegistry.StrategyConfig config = all.stream()
                .filter(s -> s.getConfig().getName().equals("test1"))
                .findFirst()
                .map(StrategyRegistry.StrategyWithConfig::getConfig)
                .orElseThrow();

            assertThat(config.getWeight()).isEqualTo(0.5);
        }

        @Test
        @DisplayName("Should throw for weight less than 0")
        void shouldThrowForWeightLessThanZero() {
            assertThatThrownBy(() -> strategyRegistry.setWeight("test1", -0.1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Weight must be between 0 and 1");
        }

        @Test
        @DisplayName("Should throw for weight greater than 1")
        void shouldThrowForWeightGreaterThanOne() {
            assertThatThrownBy(() -> strategyRegistry.setWeight("test1", 1.5))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Weight must be between 0 and 1");
        }

        @Test
        @DisplayName("Should use default weight on registration")
        void shouldUseDefaultWeightOnRegistration() {
            List<StrategyRegistry.StrategyWithConfig> all = strategyRegistry.getAllStrategies();
            StrategyRegistry.StrategyConfig config = all.stream()
                .filter(s -> s.getConfig().getName().equals("test1"))
                .findFirst()
                .map(StrategyRegistry.StrategyWithConfig::getConfig)
                .orElseThrow();

            assertThat(config.getWeight()).isEqualTo(0.30);
        }
    }

    @Nested
    @DisplayName("Normalized Weights")
    class NormalizedWeights {

        @Test
        @DisplayName("Should normalize weights to sum to 1")
        void shouldNormalizeWeightsToSumToOne() {
            Map<String, Double> normalized = strategyRegistry.getNormalizedWeights();

            double sum = normalized.values().stream().mapToDouble(Double::doubleValue).sum();
            assertThat(sum).isCloseTo(1.0, org.assertj.core.api.Assertions.within(0.001));
        }

        @Test
        @DisplayName("Should only include enabled strategies in normalized weights")
        void shouldOnlyIncludeEnabledStrategiesInNormalizedWeights() {
            strategyRegistry.disable("test1");

            Map<String, Double> normalized = strategyRegistry.getNormalizedWeights();

            assertThat(normalized).hasSize(1);
            assertThat(normalized.containsKey("test2")).isTrue();
            assertThat(normalized.get("test2")).isEqualTo(1.0);
        }

        @Test
        @DisplayName("Should return empty map when all strategies disabled")
        void shouldReturnEmptyMapWhenAllStrategiesDisabled() {
            strategyRegistry.disable("test1");
            strategyRegistry.disable("test2");

            Map<String, Double> normalized = strategyRegistry.getNormalizedWeights();

            assertThat(normalized).isEmpty();
        }

        @Test
        @DisplayName("Should calculate correct normalized weights")
        void shouldCalculateCorrectNormalizedWeights() {
            // test1: 0.30, test2: 0.20, total: 0.50
            Map<String, Double> normalized = strategyRegistry.getNormalizedWeights();

            assertThat(normalized.get("test1")).isCloseTo(0.60, org.assertj.core.api.Assertions.within(0.001));
            assertThat(normalized.get("test2")).isCloseTo(0.40, org.assertj.core.api.Assertions.within(0.001));
        }
    }

    @Nested
    @DisplayName("Update Config")
    class UpdateConfig {

        @Test
        @DisplayName("Should update weight via updateConfig")
        void shouldUpdateWeightViaUpdateConfig() {
            StrategyRegistry.StrategyConfig updates = StrategyRegistry.StrategyConfig.builder()
                .weight(0.5)
                .build();

            strategyRegistry.updateConfig("test1", updates);

            List<StrategyRegistry.StrategyWithConfig> all = strategyRegistry.getAllStrategies();
            StrategyRegistry.StrategyConfig config = all.stream()
                .filter(s -> s.getConfig().getName().equals("test1"))
                .findFirst()
                .map(StrategyRegistry.StrategyWithConfig::getConfig)
                .orElseThrow();

            assertThat(config.getWeight()).isEqualTo(0.5);
        }

        @Test
        @DisplayName("Should update enabled via updateConfig")
        void shouldUpdateEnabledViaUpdateConfig() {
            StrategyRegistry.StrategyConfig updates = StrategyRegistry.StrategyConfig.builder()
                .enabled(false)
                .build();

            strategyRegistry.updateConfig("test1", updates);

            List<StrategyRegistry.StrategyWithConfig> all = strategyRegistry.getAllStrategies();
            StrategyRegistry.StrategyConfig config = all.stream()
                .filter(s -> s.getConfig().getName().equals("test1"))
                .findFirst()
                .map(StrategyRegistry.StrategyWithConfig::getConfig)
                .orElseThrow();

            assertThat(config.getEnabled()).isFalse();
        }

        @Test
        @DisplayName("Should throw for non-existent strategy")
        void shouldThrowForNonExistentStrategy() {
            StrategyRegistry.StrategyConfig updates = StrategyRegistry.StrategyConfig.builder()
                .weight(0.5)
                .build();

            assertThatThrownBy(() -> strategyRegistry.updateConfig("nonexistent", updates))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not found");
        }
    }

    // Test strategy implementation
    private static class TestStrategy implements ScoringStrategy {
        private final String name;
        private final double weight;

        public TestStrategy(String name, double weight) {
            this.name = name;
            this.weight = weight;
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public String getDescription() {
            return "Test strategy: " + name;
        }

        @Override
        public double getDefaultWeight() {
            return weight;
        }

        @Override
        public StrategyScore calculate(Candidate candidate) {
            return StrategyScore.builder()
                .value(50)
                .breakdown(Map.of())
                .build();
        }
    }
}
