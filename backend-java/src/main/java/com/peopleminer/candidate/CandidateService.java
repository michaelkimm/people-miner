package com.peopleminer.candidate;

import com.peopleminer.config.TechStackConfig.TargetRole;
import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.RejectionRule;
import com.peopleminer.domain.enums.CandidateStatus;
import com.peopleminer.domain.repository.CandidateRepository;
import com.peopleminer.domain.repository.CandidateSourceRepository;
import com.peopleminer.domain.repository.RejectionRuleRepository;
import com.peopleminer.filter.TechStackFilterService;
import com.peopleminer.filter.TechStackFilterService.FilterContext;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final CandidateSourceRepository candidateSourceRepository;
    private final RejectionRuleRepository rejectionRuleRepository;
    private final TechStackFilterService techStackFilterService;

    @Transactional(readOnly = true)
    public CandidateListResponse findAll(CandidateSearchCriteria criteria) {
        int page = criteria.getPage() != null ? criteria.getPage() : 1;
        int limit = criteria.getLimit() != null ? criteria.getLimit() : 20;
        String sortBy = criteria.getSortBy() != null ? criteria.getSortBy() : "totalScore";
        String order = criteria.getOrder() != null ? criteria.getOrder() : "desc";

        Sort sort = "asc".equalsIgnoreCase(order)
            ? Sort.by(sortBy).ascending()
            : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page - 1, limit, sort);

        Specification<Candidate> spec = buildSpecification(criteria);
        Page<Candidate> candidatePage = candidateRepository.findAll(spec, pageable);

        List<Candidate> candidates = candidatePage.getContent();

        // Apply auto-exclude rules
        if (Boolean.TRUE.equals(criteria.getAutoExclude())) {
            List<RejectionRule> enabledRules = rejectionRuleRepository.findByEnabledTrueOrderByConfidenceDesc();
            if (!enabledRules.isEmpty()) {
                candidates = candidates.stream()
                    .filter(c -> !matchesAnyRule(c, enabledRules))
                    .collect(Collectors.toList());
            }
        }

        // Apply role filter
        if (criteria.getRole() != null && criteria.getRole() != TargetRole.ALL) {
            candidates = candidates.stream()
                .filter(c -> techStackFilterService.matchesRoleStrict(buildFilterContext(c), criteria.getRole()))
                .collect(Collectors.toList());
        }

        return CandidateListResponse.builder()
            .data(candidates)
            .meta(CandidateListResponse.Meta.builder()
                .total(candidatePage.getTotalElements())
                .page(page)
                .limit(limit)
                .totalPages(candidatePage.getTotalPages())
                .build())
            .build();
    }

    private Specification<Candidate> buildSpecification(CandidateSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Require totalScore for sorting by score
            if ("totalScore".equals(criteria.getSortBy())) {
                predicates.add(cb.isNotNull(root.get("totalScore")));
            }

            // Search filter
            if (criteria.getSearch() != null && !criteria.getSearch().isEmpty()) {
                String search = "%" + criteria.getSearch().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("githubUsername")), search),
                    cb.like(cb.lower(root.get("name")), search),
                    cb.like(cb.lower(root.get("company")), search)
                ));
            }

            // Score range filter
            if (criteria.getMinScore() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("totalScore"), criteria.getMinScore()));
            }
            if (criteria.getMaxScore() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("totalScore"), criteria.getMaxScore()));
            }

            // Exclude rejected
            if (Boolean.TRUE.equals(criteria.getExcludeRejected())) {
                predicates.add(cb.notEqual(root.get("status"), CandidateStatus.REJECTED));
            }

            // Recent activity filter
            if (Boolean.TRUE.equals(criteria.getRecentActivityOnly())) {
                int months = criteria.getActivityMonths() != null ? criteria.getActivityMonths() : 6;
                LocalDateTime cutoff = LocalDateTime.now().minusMonths(months);
                predicates.add(cb.greaterThanOrEqualTo(root.get("lastActivityAt"), cutoff));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private boolean matchesAnyRule(Candidate candidate, List<RejectionRule> rules) {
        for (RejectionRule rule : rules) {
            if (matchesRule(candidate, rule)) {
                return true;
            }
        }
        return false;
    }

    private boolean matchesRule(Candidate candidate, RejectionRule rule) {
        List<RejectionRule.RuleCondition> conditions = rule.getConditions();
        if (conditions == null || conditions.isEmpty()) {
            return false;
        }

        for (RejectionRule.RuleCondition condition : conditions) {
            Object value = getCandidateFieldValue(candidate, condition.getField());
            if (!evaluateCondition(value, condition.getOperator(), condition.getValue())) {
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
    private boolean evaluateCondition(Object value, String operator, Object conditionValue) {
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

    private FilterContext buildFilterContext(Candidate candidate) {
        return FilterContext.builder()
            .repositories(candidate.getRepositories().stream()
                .map(r -> FilterContext.RepoInfo.builder()
                    .language(r.getLanguage())
                    .name(r.getName())
                    .description(r.getDescription())
                    .build())
                .toList())
            .bio(candidate.getBio())
            .company(candidate.getCompany())
            .build();
    }

    @Transactional(readOnly = true)
    public Optional<Candidate> findById(String id) {
        return candidateRepository.findByIdWithRelations(id);
    }

    @Transactional(readOnly = true)
    public Optional<Candidate> findByUsername(String username) {
        return candidateRepository.findByUsernameWithRelations(username);
    }

    @Transactional(readOnly = true)
    public CandidateStatsResponse getStats() {
        long total = candidateRepository.count();
        long withScore = candidateRepository.countByTotalScoreIsNotNull();
        LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
        long recentlyAdded = candidateRepository.countByCrawledAtGreaterThanEqual(yesterday);

        List<Candidate> topCandidates = candidateRepository.findTopCandidates(PageRequest.of(0, 10));

        return CandidateStatsResponse.builder()
            .total(total)
            .withScore(withScore)
            .recentlyAdded(recentlyAdded)
            .topCandidates(topCandidates.stream()
                .map(c -> CandidateStatsResponse.TopCandidate.builder()
                    .id(c.getId())
                    .githubUsername(c.getGithubUsername())
                    .name(c.getName())
                    .avatarUrl(c.getAvatarUrl())
                    .totalScore(c.getTotalScore())
                    .company(c.getCompany())
                    .build())
                .toList())
            .build();
    }

    @Transactional(readOnly = true)
    public List<SourceCountResponse> getSources() {
        return candidateSourceRepository.countBySourceName().stream()
            .map(row -> SourceCountResponse.builder()
                .name((String) row[0])
                .count((Long) row[1])
                .build())
            .toList();
    }

    @Transactional
    public int deleteOldCandidates(int monthsOld) {
        LocalDateTime cutoff = LocalDateTime.now().minusMonths(monthsOld);
        return candidateRepository.deleteByCrawledAtBefore(cutoff);
    }
}
