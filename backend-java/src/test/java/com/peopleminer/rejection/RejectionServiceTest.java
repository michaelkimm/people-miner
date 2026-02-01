package com.peopleminer.rejection;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.CandidateFeedback;
import com.peopleminer.domain.entity.CandidateSource;
import com.peopleminer.domain.entity.RejectionRule;
import com.peopleminer.domain.entity.Repository;
import com.peopleminer.domain.enums.CandidateStatus;
import com.peopleminer.domain.enums.FeedbackAction;
import com.peopleminer.domain.enums.RejectionReason;
import com.peopleminer.domain.repository.CandidateFeedbackRepository;
import com.peopleminer.domain.repository.CandidateRepository;
import com.peopleminer.domain.repository.RejectionRuleRepository;
import com.peopleminer.rejection.dto.CreateRuleRequest;
import com.peopleminer.rejection.dto.UpdateRuleRequest;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RejectionServiceTest {

    @Mock
    private CandidateRepository candidateRepository;

    @Mock
    private CandidateFeedbackRepository feedbackRepository;

    @Mock
    private RejectionRuleRepository ruleRepository;

    @InjectMocks
    private RejectionService rejectionService;

    private Candidate testCandidate;

    @BeforeEach
    void setUp() {
        testCandidate = createTestCandidate("test-id", "testuser");
    }

    @Nested
    @DisplayName("rejectCandidate")
    class RejectCandidate {

        @Test
        @DisplayName("Should reject candidate and create feedback")
        void shouldRejectCandidateAndCreateFeedback() {
            when(candidateRepository.findByIdWithRelations("test-id"))
                .thenReturn(Optional.of(testCandidate));
            when(candidateRepository.save(any())).thenReturn(testCandidate);
            when(feedbackRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Map<String, Object> result = rejectionService.rejectCandidate(
                "test-id",
                RejectionReason.LOW_ACTIVITY,
                "Test notes"
            );

            assertThat(result.get("success")).isEqualTo(true);
            assertThat(result.get("status")).isEqualTo("REJECTED");

            verify(candidateRepository).save(testCandidate);
            assertThat(testCandidate.getStatus()).isEqualTo(CandidateStatus.REJECTED);

            ArgumentCaptor<CandidateFeedback> feedbackCaptor = ArgumentCaptor.forClass(CandidateFeedback.class);
            verify(feedbackRepository).save(feedbackCaptor.capture());

            CandidateFeedback savedFeedback = feedbackCaptor.getValue();
            assertThat(savedFeedback.getAction()).isEqualTo(FeedbackAction.REJECT);
            assertThat(savedFeedback.getReason()).isEqualTo(RejectionReason.LOW_ACTIVITY);
            assertThat(savedFeedback.getNotes()).isEqualTo("Test notes");
        }

        @Test
        @DisplayName("Should throw when candidate not found")
        void shouldThrowWhenCandidateNotFound() {
            when(candidateRepository.findByIdWithRelations("nonexistent"))
                .thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                rejectionService.rejectCandidate("nonexistent", RejectionReason.LOW_ACTIVITY, null))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("nonexistent");
        }

        @Test
        @DisplayName("Should create snapshot with candidate data")
        void shouldCreateSnapshotWithCandidateData() {
            when(candidateRepository.findByIdWithRelations("test-id"))
                .thenReturn(Optional.of(testCandidate));
            when(candidateRepository.save(any())).thenReturn(testCandidate);
            when(feedbackRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            rejectionService.rejectCandidate("test-id", RejectionReason.WRONG_TECH_STACK, null);

            ArgumentCaptor<CandidateFeedback> feedbackCaptor = ArgumentCaptor.forClass(CandidateFeedback.class);
            verify(feedbackRepository).save(feedbackCaptor.capture());

            Map<String, Object> snapshot = feedbackCaptor.getValue().getSnapshot();
            assertThat(snapshot.get("totalScore")).isEqualTo(75.0);
            assertThat(snapshot.get("followers")).isEqualTo(100);
            assertThat(snapshot.get("publicRepos")).isEqualTo(10);
        }
    }

    @Nested
    @DisplayName("shortlistCandidate")
    class ShortlistCandidate {

        @Test
        @DisplayName("Should shortlist candidate")
        void shouldShortlistCandidate() {
            when(candidateRepository.findById("test-id"))
                .thenReturn(Optional.of(testCandidate));
            when(candidateRepository.save(any())).thenReturn(testCandidate);
            when(feedbackRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Map<String, Object> result = rejectionService.shortlistCandidate("test-id");

            assertThat(result.get("success")).isEqualTo(true);
            assertThat(result.get("status")).isEqualTo("SHORTLISTED");
            assertThat(testCandidate.getStatus()).isEqualTo(CandidateStatus.SHORTLISTED);

            ArgumentCaptor<CandidateFeedback> feedbackCaptor = ArgumentCaptor.forClass(CandidateFeedback.class);
            verify(feedbackRepository).save(feedbackCaptor.capture());
            assertThat(feedbackCaptor.getValue().getAction()).isEqualTo(FeedbackAction.SHORTLIST);
        }

        @Test
        @DisplayName("Should throw when candidate not found")
        void shouldThrowWhenCandidateNotFound() {
            when(candidateRepository.findById("nonexistent"))
                .thenReturn(Optional.empty());

            assertThatThrownBy(() -> rejectionService.shortlistCandidate("nonexistent"))
                .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("undoFeedback")
    class UndoFeedback {

        @Test
        @DisplayName("Should undo feedback and restore active status")
        void shouldUndoFeedbackAndRestoreActiveStatus() {
            testCandidate.setStatus(CandidateStatus.REJECTED);
            when(candidateRepository.findById("test-id"))
                .thenReturn(Optional.of(testCandidate));
            when(candidateRepository.save(any())).thenReturn(testCandidate);
            when(feedbackRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Map<String, Object> result = rejectionService.undoFeedback("test-id");

            assertThat(result.get("success")).isEqualTo(true);
            assertThat(result.get("status")).isEqualTo("ACTIVE");
            assertThat(testCandidate.getStatus()).isEqualTo(CandidateStatus.ACTIVE);

            ArgumentCaptor<CandidateFeedback> feedbackCaptor = ArgumentCaptor.forClass(CandidateFeedback.class);
            verify(feedbackRepository).save(feedbackCaptor.capture());
            assertThat(feedbackCaptor.getValue().getAction()).isEqualTo(FeedbackAction.UNDO);
        }
    }

    @Nested
    @DisplayName("getStats")
    class GetStats {

        @Test
        @DisplayName("Should return correct statistics")
        void shouldReturnCorrectStatistics() {
            when(candidateRepository.countByStatus(CandidateStatus.REJECTED)).thenReturn(50L);
            when(candidateRepository.countByStatus(CandidateStatus.SHORTLISTED)).thenReturn(20L);
            when(ruleRepository.countByEnabledTrue()).thenReturn(5L);
            when(feedbackRepository.countByReason()).thenReturn(List.of(
                new Object[]{RejectionReason.LOW_ACTIVITY, 30L},
                new Object[]{RejectionReason.WRONG_TECH_STACK, 20L}
            ));
            when(feedbackRepository.countByActionAndCreatedAtGreaterThanEqual(eq(FeedbackAction.REJECT), any()))
                .thenReturn(10L);

            RejectionStats stats = rejectionService.getStats();

            assertThat(stats.getTotalRejected()).isEqualTo(50);
            assertThat(stats.getTotalShortlisted()).isEqualTo(20);
            assertThat(stats.getActiveRules()).isEqualTo(5);
            assertThat(stats.getRecentRejections()).isEqualTo(10);
            assertThat(stats.getReasonDistribution()).hasSize(2);
        }

        @Test
        @DisplayName("Should calculate reason percentages correctly")
        void shouldCalculateReasonPercentagesCorrectly() {
            when(candidateRepository.countByStatus(any())).thenReturn(0L);
            when(ruleRepository.countByEnabledTrue()).thenReturn(0L);
            when(feedbackRepository.countByReason()).thenReturn(List.of(
                new Object[]{RejectionReason.LOW_ACTIVITY, 60L},
                new Object[]{RejectionReason.WRONG_TECH_STACK, 40L}
            ));
            when(feedbackRepository.countByActionAndCreatedAtGreaterThanEqual(any(), any()))
                .thenReturn(0L);

            RejectionStats stats = rejectionService.getStats();

            assertThat(stats.getReasonDistribution().get(0).getPercentage()).isEqualTo(60);
            assertThat(stats.getReasonDistribution().get(1).getPercentage()).isEqualTo(40);
        }
    }

    @Nested
    @DisplayName("Rule Management")
    class RuleManagement {

        @Test
        @DisplayName("Should get all rules")
        void shouldGetAllRules() {
            List<RejectionRule> rules = List.of(
                RejectionRule.builder().name("Rule 1").build(),
                RejectionRule.builder().name("Rule 2").build()
            );
            when(ruleRepository.findAllByOrderByEnabledDescConfidenceDesc())
                .thenReturn(rules);

            List<RejectionRule> result = rejectionService.getRules();

            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("Should create rule")
        void shouldCreateRule() {
            CreateRuleRequest request = new CreateRuleRequest();
            request.setName("Test Rule");
            request.setDescription("Test Description");
            request.setConditions(List.of(
                RejectionRule.RuleCondition.builder()
                    .field("totalScore")
                    .operator("<")
                    .value(50)
                    .build()
            ));

            when(ruleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            RejectionRule result = rejectionService.createRule(request);

            assertThat(result.getName()).isEqualTo("Test Rule");
            assertThat(result.getDescription()).isEqualTo("Test Description");
            assertThat(result.isAutoGenerated()).isFalse();
        }

        @Test
        @DisplayName("Should update rule")
        void shouldUpdateRule() {
            RejectionRule existingRule = RejectionRule.builder()
                .id("rule-id")
                .name("Old Name")
                .build();

            when(ruleRepository.findById("rule-id")).thenReturn(Optional.of(existingRule));
            when(ruleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            UpdateRuleRequest request = new UpdateRuleRequest();
            request.setName("New Name");
            request.setEnabled(false);

            RejectionRule result = rejectionService.updateRule("rule-id", request);

            assertThat(result.getName()).isEqualTo("New Name");
            assertThat(result.isEnabled()).isFalse();
        }

        @Test
        @DisplayName("Should throw when updating non-existent rule")
        void shouldThrowWhenUpdatingNonExistentRule() {
            when(ruleRepository.findById("nonexistent")).thenReturn(Optional.empty());

            UpdateRuleRequest request = new UpdateRuleRequest();
            request.setName("New Name");

            assertThatThrownBy(() -> rejectionService.updateRule("nonexistent", request))
                .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        @DisplayName("Should delete rule")
        void shouldDeleteRule() {
            RejectionRule rule = RejectionRule.builder().id("rule-id").build();
            when(ruleRepository.findById("rule-id")).thenReturn(Optional.of(rule));

            Map<String, Object> result = rejectionService.deleteRule("rule-id");

            assertThat(result.get("success")).isEqualTo(true);
            verify(ruleRepository).delete(rule);
        }

        @Test
        @DisplayName("Should throw when deleting non-existent rule")
        void shouldThrowWhenDeletingNonExistentRule() {
            when(ruleRepository.findById("nonexistent")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> rejectionService.deleteRule("nonexistent"))
                .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("checkAutoExclude")
    class CheckAutoExclude {

        @Test
        @DisplayName("Should return shouldExclude false when candidate not found")
        void shouldReturnFalseWhenCandidateNotFound() {
            when(candidateRepository.findByIdWithRelations("nonexistent"))
                .thenReturn(Optional.empty());

            Map<String, Object> result = rejectionService.checkAutoExclude("nonexistent");

            assertThat(result.get("shouldExclude")).isEqualTo(false);
            assertThat((List<?>) result.get("matchedRules")).isEmpty();
        }

        @Test
        @DisplayName("Should return shouldExclude false when no rules match")
        void shouldReturnFalseWhenNoRulesMatch() {
            when(candidateRepository.findByIdWithRelations("test-id"))
                .thenReturn(Optional.of(testCandidate));
            when(ruleRepository.findByEnabledTrueOrderByConfidenceDesc())
                .thenReturn(List.of(
                    RejectionRule.builder()
                        .name("Score < 30")
                        .conditions(List.of(
                            RejectionRule.RuleCondition.builder()
                                .field("totalScore")
                                .operator("<")
                                .value(30)
                                .build()
                        ))
                        .build()
                ));

            Map<String, Object> result = rejectionService.checkAutoExclude("test-id");

            assertThat(result.get("shouldExclude")).isEqualTo(false);
        }

        @Test
        @DisplayName("Should return shouldExclude true when rules match")
        void shouldReturnTrueWhenRulesMatch() {
            when(candidateRepository.findByIdWithRelations("test-id"))
                .thenReturn(Optional.of(testCandidate));
            when(ruleRepository.findByEnabledTrueOrderByConfidenceDesc())
                .thenReturn(List.of(
                    RejectionRule.builder()
                        .name("Score < 80")
                        .conditions(List.of(
                            RejectionRule.RuleCondition.builder()
                                .field("totalScore")
                                .operator("<")
                                .value(80)
                                .build()
                        ))
                        .build()
                ));

            Map<String, Object> result = rejectionService.checkAutoExclude("test-id");

            assertThat(result.get("shouldExclude")).isEqualTo(true);
            assertThat((List<String>) result.get("matchedRules")).contains("Score < 80");
        }

        @Test
        @DisplayName("Should evaluate multiple conditions with AND logic")
        void shouldEvaluateMultipleConditionsWithAndLogic() {
            when(candidateRepository.findByIdWithRelations("test-id"))
                .thenReturn(Optional.of(testCandidate));
            when(ruleRepository.findByEnabledTrueOrderByConfidenceDesc())
                .thenReturn(List.of(
                    RejectionRule.builder()
                        .name("Complex Rule")
                        .conditions(List.of(
                            RejectionRule.RuleCondition.builder()
                                .field("totalScore")
                                .operator("<")
                                .value(80)
                                .build(),
                            RejectionRule.RuleCondition.builder()
                                .field("followers")
                                .operator(">=")
                                .value(50)
                                .build()
                        ))
                        .build()
                ));

            Map<String, Object> result = rejectionService.checkAutoExclude("test-id");

            // totalScore=75 < 80 and followers=100 >= 50, so both conditions match
            assertThat(result.get("shouldExclude")).isEqualTo(true);
        }

        @Test
        @DisplayName("Should return false when one condition fails in AND logic")
        void shouldReturnFalseWhenOneConditionFailsInAndLogic() {
            when(candidateRepository.findByIdWithRelations("test-id"))
                .thenReturn(Optional.of(testCandidate));
            when(ruleRepository.findByEnabledTrueOrderByConfidenceDesc())
                .thenReturn(List.of(
                    RejectionRule.builder()
                        .name("Complex Rule")
                        .conditions(List.of(
                            RejectionRule.RuleCondition.builder()
                                .field("totalScore")
                                .operator("<")
                                .value(80)
                                .build(),
                            RejectionRule.RuleCondition.builder()
                                .field("followers")
                                .operator("<")
                                .value(50)
                                .build()
                        ))
                        .build()
                ));

            Map<String, Object> result = rejectionService.checkAutoExclude("test-id");

            // totalScore=75 < 80 but followers=100 >= 50, second condition fails
            assertThat(result.get("shouldExclude")).isEqualTo(false);
        }
    }

    // Helper method
    private Candidate createTestCandidate(String id, String username) {
        Repository repo = Repository.builder()
            .name("test-repo")
            .fullName(username + "/test-repo")
            .language("Java")
            .url("https://github.com/" + username + "/test-repo")
            .build();

        CandidateSource source = CandidateSource.builder()
            .sourceName("woowacourse")
            .build();

        Candidate candidate = Candidate.builder()
            .id(id)
            .githubUsername(username)
            .githubId(12345)
            .name("Test User")
            .totalScore(75.0)
            .followers(100)
            .following(50)
            .publicRepos(10)
            .totalCommits(500)
            .company("Test Company")
            .location("Seoul")
            .status(CandidateStatus.ACTIVE)
            .repositories(new ArrayList<>(List.of(repo)))
            .sources(new ArrayList<>(List.of(source)))
            .feedbacks(new ArrayList<>())
            .crawledAt(LocalDateTime.now())
            .build();

        return candidate;
    }
}
