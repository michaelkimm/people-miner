package com.peopleminer.scoring;

import com.peopleminer.scoring.ScoringService.ScoreBatchResult;
import com.peopleminer.scoring.ScoringService.ScoringResult;
import com.peopleminer.scoring.ScoringService.StrategyInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/scoring")
@RequiredArgsConstructor
public class ScoringController {

    private final ScoringService scoringService;

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startScoring(@RequestBody(required = false) StartScoringRequest request) {
        String jobId = "score-" + System.currentTimeMillis();
        boolean force = request != null && Boolean.TRUE.equals(request.force);
        int batchSize = request != null && request.batchSize != null ? request.batchSize : 50;

        // Start async scoring
        CompletableFuture.runAsync(() -> scoringService.scoreAllCandidates(force, batchSize));

        return ResponseEntity.status(HttpStatus.ACCEPTED)
            .body(Map.of(
                "jobId", jobId,
                "message", "Scoring job started"
            ));
    }

    @PostMapping("/candidate/{id}")
    public ResponseEntity<Map<String, Object>> scoreCandidate(@PathVariable String id) {
        String jobId = "score-" + id + "-" + System.currentTimeMillis();

        // Start async scoring
        CompletableFuture.runAsync(() -> scoringService.scoreCandidate(id));

        return ResponseEntity.status(HttpStatus.ACCEPTED)
            .body(Map.of(
                "jobId", jobId,
                "candidateId", id,
                "message", "Scoring job queued"
            ));
    }

    @GetMapping("/strategies")
    public ResponseEntity<List<StrategyInfo>> getStrategies() {
        return ResponseEntity.ok(scoringService.getStrategies());
    }

    @PatchMapping("/strategies/{name}/weight")
    public ResponseEntity<Map<String, Object>> updateWeight(
            @PathVariable String name,
            @RequestBody Map<String, Double> body
    ) {
        Double weight = body.get("weight");
        if (weight == null) {
            return ResponseEntity.badRequest().build();
        }

        scoringService.updateStrategyWeight(name, weight);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "name", name,
            "weight", weight
        ));
    }

    @PatchMapping("/strategies/{name}/enable")
    public ResponseEntity<Map<String, Object>> enableStrategy(@PathVariable String name) {
        scoringService.enableStrategy(name);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "name", name,
            "enabled", true
        ));
    }

    @PatchMapping("/strategies/{name}/disable")
    public ResponseEntity<Map<String, Object>> disableStrategy(@PathVariable String name) {
        scoringService.disableStrategy(name);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "name", name,
            "enabled", false
        ));
    }

    record StartScoringRequest(Boolean force, Integer batchSize) {}
}
