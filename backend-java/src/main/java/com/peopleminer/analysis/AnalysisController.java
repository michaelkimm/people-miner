package com.peopleminer.analysis;

import com.peopleminer.github.RateLimiterService;
import com.peopleminer.solvedac.SolvedAcService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final SolvedAcService solvedAcService;
    private final RateLimiterService rateLimiter;

    @PostMapping("/solved-ac/sync")
    public ResponseEntity<Map<String, Object>> startSolvedAcSync(
            @RequestBody(required = false) SyncRequest request
    ) {
        String jobId = "solved-ac-sync-" + System.currentTimeMillis();
        int batchSize = request != null && request.batchSize() != null ? request.batchSize() : 100;
        boolean force = request != null && Boolean.TRUE.equals(request.force());

        CompletableFuture.runAsync(() -> solvedAcService.syncAllCandidates(force, batchSize));

        return ResponseEntity.status(HttpStatus.ACCEPTED)
            .body(Map.of(
                "jobId", jobId,
                "message", "solved.ac 동기화 작업이 시작되었습니다"
            ));
    }

    @PostMapping("/github/analyze")
    public ResponseEntity<Map<String, Object>> startGitHubAnalysis(
            @RequestBody(required = false) AnalyzeRequest request
    ) {
        String jobId = "github-analysis-" + System.currentTimeMillis();

        // GitHub analysis would be implemented here
        // For now, return accepted status

        return ResponseEntity.status(HttpStatus.ACCEPTED)
            .body(Map.of(
                "jobId", jobId,
                "message", "GitHub 레포 분석 작업이 시작되었습니다"
            ));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        RateLimiterService.RateLimitStatusResponse githubRateLimit = rateLimiter.getStatus();

        return ResponseEntity.ok(Map.of(
            "rateLimits", Map.of(
                "github", githubRateLimit
            )
        ));
    }

    record SyncRequest(Integer batchSize, Boolean force) {}
    record AnalyzeRequest(Integer batchSize, Integer reposPerCandidate) {}
}
