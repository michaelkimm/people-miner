package com.peopleminer.rejection;

import com.peopleminer.domain.entity.RejectionRule;
import com.peopleminer.rejection.dto.CreateRuleRequest;
import com.peopleminer.rejection.dto.UpdateRuleRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/rejection")
@RequiredArgsConstructor
public class RejectionController {

    private final RejectionService rejectionService;

    @GetMapping("/stats")
    public ResponseEntity<RejectionStats> getStats() {
        return ResponseEntity.ok(rejectionService.getStats());
    }

    @GetMapping("/rules")
    public ResponseEntity<List<RejectionRule>> getRules() {
        return ResponseEntity.ok(rejectionService.getRules());
    }

    @PostMapping("/rules")
    public ResponseEntity<RejectionRule> createRule(@RequestBody CreateRuleRequest request) {
        return ResponseEntity.ok(rejectionService.createRule(request));
    }

    @PatchMapping("/rules/{id}")
    public ResponseEntity<RejectionRule> updateRule(
            @PathVariable String id,
            @RequestBody UpdateRuleRequest request
    ) {
        return ResponseEntity.ok(rejectionService.updateRule(id, request));
    }

    @DeleteMapping("/rules/{id}")
    public ResponseEntity<Map<String, Object>> deleteRule(@PathVariable String id) {
        return ResponseEntity.ok(rejectionService.deleteRule(id));
    }

    @GetMapping("/check/{candidateId}")
    public ResponseEntity<Map<String, Object>> checkAutoExclude(@PathVariable String candidateId) {
        return ResponseEntity.ok(rejectionService.checkAutoExclude(candidateId));
    }
}
