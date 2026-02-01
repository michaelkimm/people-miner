package com.peopleminer.rejection;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.CandidateFeedback;
import com.peopleminer.domain.entity.RejectionRule;
import com.peopleminer.domain.enums.CandidateStatus;
import com.peopleminer.domain.enums.FeedbackAction;
import com.peopleminer.domain.enums.RejectionReason;
import com.peopleminer.domain.repository.CandidateFeedbackRepository;
import com.peopleminer.domain.repository.CandidateRepository;
import com.peopleminer.domain.repository.RejectionRuleRepository;
import com.peopleminer.rejection.dto.CreateRuleRequest;
import com.peopleminer.rejection.dto.UpdateRuleRequest;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RejectionService {

    private final CandidateRepository candidateRepository;
    private final CandidateFeedbackRepository feedbackRepository;
    private final RejectionRuleRepository ruleRepository;

    @Transactional
    public Map<String, Object> rejectCandidate(String candidateId, RejectionReason reason, String notes) {
        Candidate candidate = candidateRepository.findByIdWithRelations(candidateId)
            .orElseThrow(() -> new EntityNotFoundException("Candidate " + candidateId + " not found"));

        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("totalScore", candidate.getTotalScore());
        snapshot.put("followers", candidate.getFollowers());
        snapshot.put("publicRepos", candidate.getPublicRepos());
        snapshot.put("totalCommits", candidate.getTotalCommits());
        snapshot.put("company", candidate.getCompany());
        snapshot.put("location", candidate.getLocation());
        snapshot.put("primaryLanguage", !candidate.getRepositories().isEmpty()
            ? candidate.getRepositories().get(0).getLanguage() : null);
        snapshot.put("sources", candidate.getSources().stream()
            .map(s -> s.getSourceName())
            .toList());

        candidate.setStatus(CandidateStatus.REJECTED);
        candidateRepository.save(candidate);

        CandidateFeedback feedback = CandidateFeedback.builder()
            .action(FeedbackAction.REJECT)
            .reason(reason)
            .notes(notes)
            .snapshot(snapshot)
            .build();
        candidate.addFeedback(feedback);
        feedbackRepository.save(feedback);

        log.info("Candidate {} rejected with reason: {}", candidateId, reason);

        return Map.of(
            "success", true,
            "status", CandidateStatus.REJECTED.name()
        );
    }

    @Transactional
    public Map<String, Object> shortlistCandidate(String candidateId) {
        Candidate candidate = candidateRepository.findById(candidateId)
            .orElseThrow(() -> new EntityNotFoundException("Candidate " + candidateId + " not found"));

        candidate.setStatus(CandidateStatus.SHORTLISTED);
        candidateRepository.save(candidate);

        CandidateFeedback feedback = CandidateFeedback.builder()
            .action(FeedbackAction.SHORTLIST)
            .build();
        candidate.addFeedback(feedback);
        feedbackRepository.save(feedback);

        log.info("Candidate {} shortlisted", candidateId);

        return Map.of(
            "success", true,
            "status", CandidateStatus.SHORTLISTED.name()
        );
    }

    @Transactional
    public Map<String, Object> undoFeedback(String candidateId) {
        Candidate candidate = candidateRepository.findById(candidateId)
            .orElseThrow(() -> new EntityNotFoundException("Candidate " + candidateId + " not found"));

        candidate.setStatus(CandidateStatus.ACTIVE);
        candidateRepository.save(candidate);

        CandidateFeedback feedback = CandidateFeedback.builder()
            .action(FeedbackAction.UNDO)
            .build();
        candidate.addFeedback(feedback);
        feedbackRepository.save(feedback);

        log.info("Candidate {} feedback undone", candidateId);

        return Map.of(
            "success", true,
            "status", CandidateStatus.ACTIVE.name()
        );
    }

    @Transactional(readOnly = true)
    public RejectionStats getStats() {
        long totalRejected = candidateRepository.countByStatus(CandidateStatus.REJECTED);
        long totalShortlisted = candidateRepository.countByStatus(CandidateStatus.SHORTLISTED);
        long activeRules = ruleRepository.countByEnabledTrue();

        List<Object[]> reasonCounts = feedbackRepository.countByReason();
        long totalReasons = reasonCounts.stream()
            .mapToLong(row -> (Long) row[1])
            .sum();

        List<RejectionStats.ReasonCount> reasonDistribution = reasonCounts.stream()
            .map(row -> {
                RejectionReason reason = (RejectionReason) row[0];
                long count = (Long) row[1];
                int percentage = totalReasons > 0 ? (int) Math.round(count * 100.0 / totalReasons) : 0;
                return RejectionStats.ReasonCount.builder()
                    .reason(reason)
                    .count(count)
                    .percentage(percentage)
                    .build();
            })
            .sorted(Comparator.comparingLong(RejectionStats.ReasonCount::getCount).reversed())
            .collect(Collectors.toList());

        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        long recentRejections = feedbackRepository.countByActionAndCreatedAtGreaterThanEqual(
            FeedbackAction.REJECT, weekAgo);

        return RejectionStats.builder()
            .totalRejected(totalRejected)
            .totalShortlisted(totalShortlisted)
            .activeRules(activeRules)
            .reasonDistribution(reasonDistribution)
            .recentRejections(recentRejections)
            .build();
    }

    @Transactional(readOnly = true)
    public List<RejectionRule> getRules() {
        return ruleRepository.findAllByOrderByEnabledDescConfidenceDesc();
    }

    @Transactional
    public RejectionRule createRule(CreateRuleRequest request) {
        RejectionRule rule = RejectionRule.builder()
            .name(request.getName())
            .description(request.getDescription())
            .conditions(request.getConditions())
            .autoGenerated(false)
            .build();
        return ruleRepository.save(rule);
    }

    @Transactional
    public RejectionRule updateRule(String id, UpdateRuleRequest request) {
        RejectionRule rule = ruleRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Rule " + id + " not found"));

        if (request.getName() != null) {
            rule.setName(request.getName());
        }
        if (request.getDescription() != null) {
            rule.setDescription(request.getDescription());
        }
        if (request.getConditions() != null) {
            rule.setConditions(request.getConditions());
        }
        if (request.getEnabled() != null) {
            rule.setEnabled(request.getEnabled());
        }

        return ruleRepository.save(rule);
    }

    @Transactional
    public Map<String, Object> deleteRule(String id) {
        RejectionRule rule = ruleRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Rule " + id + " not found"));

        ruleRepository.delete(rule);
        return Map.of("success", true);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> checkAutoExclude(String candidateId) {
        Candidate candidate = candidateRepository.findByIdWithRelations(candidateId)
            .orElse(null);

        if (candidate == null) {
            return Map.of("shouldExclude", false, "matchedRules", List.of());
        }

        List<RejectionRule> enabledRules = ruleRepository.findByEnabledTrueOrderByConfidenceDesc();
        List<String> matchedRules = new ArrayList<>();

        for (RejectionRule rule : enabledRules) {
            if (evaluateConditions(candidate, rule.getConditions())) {
                matchedRules.add(rule.getName());
            }
        }

        return Map.of(
            "shouldExclude", !matchedRules.isEmpty(),
            "matchedRules", matchedRules
        );
    }

    private boolean evaluateConditions(Candidate candidate, List<RejectionRule.RuleCondition> conditions) {
        if (conditions == null || conditions.isEmpty()) {
            return false;
        }

        for (RejectionRule.RuleCondition condition : conditions) {
            Object value = getCandidateFieldValue(candidate, condition.getField());
            if (!evaluateCondition(value, condition)) {
                return false;
            }
        }

        return true;
    }

    private Object getCandidateFieldValue(Candidate candidate, String field) {
        return switch (field) {
            case "totalScore" -> candidate.getTotalScore();
            case "followers" -> candidate.getFollowers();
            case "publicRepos" -> candidate.getPublicRepos();
            case "totalCommits" -> candidate.getTotalCommits();
            case "company" -> candidate.getCompany();
            case "location" -> candidate.getLocation();
            case "primaryLanguage" -> candidate.getRepositories().isEmpty() ? null
                : candidate.getRepositories().get(0).getLanguage();
            case "sources" -> candidate.getSources().stream()
                .map(s -> s.getSourceName())
                .toList();
            default -> null;
        };
    }

    @SuppressWarnings("unchecked")
    private boolean evaluateCondition(Object value, RejectionRule.RuleCondition condition) {
        String operator = condition.getOperator();
        Object conditionValue = condition.getValue();

        if (value == null) {
            return "=".equals(operator) && conditionValue == null;
        }

        return switch (operator) {
            case "<" -> compareNumbers(value, conditionValue) < 0;
            case ">" -> compareNumbers(value, conditionValue) > 0;
            case "<=" -> compareNumbers(value, conditionValue) <= 0;
            case ">=" -> compareNumbers(value, conditionValue) >= 0;
            case "=" -> Objects.equals(value, conditionValue);
            case "!=" -> !Objects.equals(value, conditionValue);
            case "in" -> conditionValue instanceof List && ((List<?>) conditionValue).contains(value);
            case "notIn" -> !(conditionValue instanceof List && ((List<?>) conditionValue).contains(value));
            case "contains" -> {
                if (value instanceof List) {
                    yield ((List<?>) value).contains(conditionValue);
                }
                yield String.valueOf(value).contains(String.valueOf(conditionValue));
            }
            default -> false;
        };
    }

    private int compareNumbers(Object a, Object b) {
        double numA = a instanceof Number ? ((Number) a).doubleValue() : 0;
        double numB = b instanceof Number ? ((Number) b).doubleValue() : 0;
        return Double.compare(numA, numB);
    }
}
