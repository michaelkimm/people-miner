package com.peopleminer.candidate;

import com.peopleminer.config.TechStackConfig.TargetRole;
import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.rejection.RejectionService;
import com.peopleminer.rejection.dto.RejectCandidateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/candidates")
@RequiredArgsConstructor
public class CandidateController {

    private final CandidateService candidateService;
    private final RejectionService rejectionService;

    @GetMapping
    public ResponseEntity<CandidateListResponse> findAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String order,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) Double minScore,
            @RequestParam(required = false) Double maxScore,
            @RequestParam(required = false) Boolean excludeRejected,
            @RequestParam(required = false) Boolean autoExclude,
            @RequestParam(required = false) TargetRole role,
            @RequestParam(required = false) Boolean recentActivityOnly,
            @RequestParam(required = false) Integer activityMonths
    ) {
        CandidateSearchCriteria criteria = CandidateSearchCriteria.builder()
                .page(page)
                .limit(limit)
                .sortBy(sortBy)
                .order(order)
                .search(search)
                .source(source)
                .minScore(minScore)
                .maxScore(maxScore)
                .excludeRejected(excludeRejected)
                .autoExclude(autoExclude)
                .role(role)
                .recentActivityOnly(recentActivityOnly)
                .activityMonths(activityMonths)
                .build();

        return ResponseEntity.ok(candidateService.findAll(criteria));
    }

    @GetMapping("/stats")
    public ResponseEntity<CandidateStatsResponse> getStats() {
        return ResponseEntity.ok(candidateService.getStats());
    }

    @GetMapping("/sources")
    public ResponseEntity<List<SourceCountResponse>> getSources() {
        return ResponseEntity.ok(candidateService.getSources());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Candidate> findById(@PathVariable String id) {
        return candidateService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<Candidate> findByUsername(@PathVariable String username) {
        return candidateService.findByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectCandidate(
            @PathVariable String id,
            @RequestBody RejectCandidateRequest request
    ) {
        return ResponseEntity.ok(rejectionService.rejectCandidate(id, request.getReason(), request.getNotes()));
    }

    @PostMapping("/{id}/shortlist")
    public ResponseEntity<Map<String, Object>> shortlistCandidate(@PathVariable String id) {
        return ResponseEntity.ok(rejectionService.shortlistCandidate(id));
    }

    @PostMapping("/{id}/undo")
    public ResponseEntity<Map<String, Object>> undoFeedback(@PathVariable String id) {
        return ResponseEntity.ok(rejectionService.undoFeedback(id));
    }
}
