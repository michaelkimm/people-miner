package com.peopleminer.scoring;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
@Slf4j
public class StrategyRegistry {

    private final Map<String, ScoringStrategy> strategies = new LinkedHashMap<>();
    private final Map<String, StrategyConfig> configs = new HashMap<>();

    public StrategyRegistry(List<ScoringStrategy> scoringStrategies) {
        for (ScoringStrategy strategy : scoringStrategies) {
            register(strategy);
        }
    }

    public void register(ScoringStrategy strategy) {
        strategies.put(strategy.getName(), strategy);
        configs.put(strategy.getName(), StrategyConfig.builder()
            .name(strategy.getName())
            .enabled(true)
            .weight(strategy.getDefaultWeight())
            .build());
        log.info("Registered strategy: {} (weight: {})", strategy.getName(), strategy.getDefaultWeight());
    }

    public Optional<ScoringStrategy> getStrategy(String name) {
        return Optional.ofNullable(strategies.get(name));
    }

    public List<StrategyWithConfig> getEnabledStrategies() {
        return strategies.entrySet().stream()
            .filter(e -> Boolean.TRUE.equals(configs.get(e.getKey()).getEnabled()))
            .map(e -> StrategyWithConfig.builder()
                .strategy(e.getValue())
                .config(configs.get(e.getKey()))
                .build())
            .collect(Collectors.toList());
    }

    public List<StrategyWithConfig> getAllStrategies() {
        return strategies.entrySet().stream()
            .map(e -> StrategyWithConfig.builder()
                .strategy(e.getValue())
                .config(configs.get(e.getKey()))
                .build())
            .collect(Collectors.toList());
    }

    public void updateConfig(String name, StrategyConfig updates) {
        StrategyConfig config = configs.get(name);
        if (config == null) {
            throw new IllegalArgumentException("Strategy " + name + " not found");
        }

        if (updates.getWeight() != null) {
            config.setWeight(updates.getWeight());
        }
        if (updates.getEnabled() != null) {
            config.setEnabled(updates.getEnabled());
        }

        log.info("Updated strategy config: {} -> {}", name, config);
    }

    public void setWeight(String name, double weight) {
        if (weight < 0 || weight > 1) {
            throw new IllegalArgumentException("Weight must be between 0 and 1");
        }
        StrategyConfig config = configs.get(name);
        if (config != null) {
            config.setWeight(weight);
        }
    }

    public void enable(String name) {
        StrategyConfig config = configs.get(name);
        if (config != null) {
            config.setEnabled(true);
        }
    }

    public void disable(String name) {
        StrategyConfig config = configs.get(name);
        if (config != null) {
            config.setEnabled(false);
        }
    }

    public Map<String, Double> getNormalizedWeights() {
        List<StrategyWithConfig> enabled = getEnabledStrategies();
        double totalWeight = enabled.stream()
            .mapToDouble(swc -> swc.getConfig().getWeight())
            .sum();

        Map<String, Double> normalized = new HashMap<>();
        for (StrategyWithConfig swc : enabled) {
            double normalizedWeight = totalWeight > 0
                ? swc.getConfig().getWeight() / totalWeight
                : 0;
            normalized.put(swc.getConfig().getName(), normalizedWeight);
        }

        return normalized;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StrategyConfig {
        private String name;
        private Boolean enabled;
        private Double weight;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StrategyWithConfig {
        private ScoringStrategy strategy;
        private StrategyConfig config;
    }
}
