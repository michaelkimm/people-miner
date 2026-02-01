package com.peopleminer.scoring;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.repository.CandidateRepository;
import com.peopleminer.scoring.StrategyRegistry.StrategyWithConfig;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScoringService {

    private final CandidateRepository candidateRepository;
    private final StrategyRegistry strategyRegistry;

    @Transactional
    public ScoringResult scoreCandidate(String candidateId) {
        Candidate candidate = candidateRepository.findByIdWithRelations(candidateId)
            .orElseThrow(() -> new IllegalArgumentException("Candidate " + candidateId + " not found"));

        return calculateScore(candidate);
    }

    @Transactional
    public ScoringResult calculateScore(Candidate candidate) {
        List<StrategyWithConfig> enabledStrategies = strategyRegistry.getEnabledStrategies();
        Map<String, Double> normalizedWeights = strategyRegistry.getNormalizedWeights();

        List<StrategyScoreResult> strategyScores = new ArrayList<>();
        double totalScore = 0;

        for (StrategyWithConfig swc : enabledStrategies) {
            try {
                ScoringStrategy strategy = swc.getStrategy();

                if (strategy.isApplicable(candidate)) {
                    ScoringStrategy.StrategyScore result = strategy.calculate(candidate);
                    double normalizedWeight = normalizedWeights.getOrDefault(swc.getConfig().getName(), 0.0);
                    double weightedScore = result.getValue() * normalizedWeight;

                    strategyScores.add(StrategyScoreResult.builder()
                        .strategyName(strategy.getName())
                        .score(result.getValue())
                        .weight(normalizedWeight)
                        .weightedScore(weightedScore)
                        .breakdown(result.getBreakdown())
                        .build());

                    totalScore += weightedScore;
                }
            } catch (Exception e) {
                log.error("Strategy {} failed for candidate {}: {}",
                    swc.getStrategy().getName(), candidate.getId(), e.getMessage());
            }
        }

        totalScore = Math.round(totalScore * 100) / 100.0;

        // Update candidate scores
        candidate.setTotalScore(totalScore);
        candidate.setReadabilityScore(findStrategyScore(strategyScores, "codeQuality"));
        candidate.setProblemSolvingScore(findStrategyScore(strategyScores, "problemSolving"));
        candidate.setCleanCodeScore(findStrategyScore(strategyScores, "activity"));
        candidate.setSolvedAcScore(findStrategyScore(strategyScores, "solvedAc"));
        candidate.setScoredAt(LocalDateTime.now());

        candidateRepository.save(candidate);

        return ScoringResult.builder()
            .candidateId(candidate.getId())
            .totalScore(totalScore)
            .strategyScores(strategyScores)
            .scoredAt(LocalDateTime.now())
            .build();
    }

    private Double findStrategyScore(List<StrategyScoreResult> scores, String strategyName) {
        return scores.stream()
            .filter(s -> s.getStrategyName().equals(strategyName))
            .map(StrategyScoreResult::getScore)
            .findFirst()
            .orElse(null);
    }

    @Transactional
    public ScoreBatchResult scoreAllCandidates(boolean force, int batchSize) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        List<Candidate> candidates = force
            ? candidateRepository.findAll(PageRequest.of(0, batchSize)).getContent()
            : candidateRepository.findCandidatesNeedingScoring(cutoff, PageRequest.of(0, batchSize));

        int scored = 0;
        int failed = 0;

        for (Candidate candidate : candidates) {
            try {
                calculateScore(candidate);
                scored++;

                if (scored % 10 == 0) {
                    log.info("Scored {}/{} candidates", scored, candidates.size());
                }
            } catch (Exception e) {
                log.error("Failed to score candidate {}: {}", candidate.getId(), e.getMessage());
                failed++;
            }
        }

        log.info("Scoring complete: {} scored, {} failed", scored, failed);
        return ScoreBatchResult.builder()
            .scored(scored)
            .failed(failed)
            .build();
    }

    public List<StrategyInfo> getStrategies() {
        return strategyRegistry.getAllStrategies().stream()
            .map(swc -> StrategyInfo.builder()
                .name(swc.getStrategy().getName())
                .description(swc.getStrategy().getDescription())
                .enabled(swc.getConfig().getEnabled())
                .weight(swc.getConfig().getWeight())
                .defaultWeight(swc.getStrategy().getDefaultWeight())
                .build())
            .toList();
    }

    public void updateStrategyWeight(String name, double weight) {
        strategyRegistry.setWeight(name, weight);
    }

    public void enableStrategy(String name) {
        strategyRegistry.enable(name);
    }

    public void disableStrategy(String name) {
        strategyRegistry.disable(name);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScoringResult {
        private String candidateId;
        private double totalScore;
        private List<StrategyScoreResult> strategyScores;
        private LocalDateTime scoredAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StrategyScoreResult {
        private String strategyName;
        private double score;
        private double weight;
        private double weightedScore;
        private Map<String, Double> breakdown;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScoreBatchResult {
        private int scored;
        private int failed;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StrategyInfo {
        private String name;
        private String description;
        private Boolean enabled;
        private Double weight;
        private double defaultWeight;
    }
}
