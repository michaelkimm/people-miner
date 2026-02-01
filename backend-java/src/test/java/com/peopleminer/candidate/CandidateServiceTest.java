package com.peopleminer.candidate;

import com.peopleminer.config.TechStackConfig.TargetRole;
import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.CandidateSource;
import com.peopleminer.domain.entity.Repository;
import com.peopleminer.domain.enums.CandidateStatus;
import com.peopleminer.domain.enums.SourceType;
import com.peopleminer.domain.repository.CandidateRepository;
import com.peopleminer.domain.repository.CandidateSourceRepository;
import com.peopleminer.domain.repository.RejectionRuleRepository;
import com.peopleminer.filter.TechStackFilterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateServiceTest {

    @Mock
    private CandidateRepository candidateRepository;

    @Mock
    private CandidateSourceRepository candidateSourceRepository;

    @Mock
    private RejectionRuleRepository rejectionRuleRepository;

    @Mock
    private TechStackFilterService techStackFilterService;

    @InjectMocks
    private CandidateService candidateService;

    private Candidate testCandidate;

    @BeforeEach
    void setUp() {
        testCandidate = createTestCandidate("testuser");
    }

    @Nested
    @DisplayName("findAll")
    class FindAll {

        @Test
        @DisplayName("Should return paginated candidates")
        void shouldReturnPaginatedCandidates() {
            List<Candidate> candidates = List.of(testCandidate);
            Page<Candidate> page = new PageImpl<>(candidates, PageRequest.of(0, 20), 1);

            when(candidateRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(page);

            CandidateSearchCriteria criteria = CandidateSearchCriteria.builder()
                .page(1)
                .limit(20)
                .build();

            CandidateListResponse response = candidateService.findAll(criteria);

            assertThat(response.getData()).hasSize(1);
            assertThat(response.getMeta().getTotal()).isEqualTo(1);
            assertThat(response.getMeta().getPage()).isEqualTo(1);
            assertThat(response.getMeta().getLimit()).isEqualTo(20);
        }

        @Test
        @DisplayName("Should use default pagination when not specified")
        void shouldUseDefaultPaginationWhenNotSpecified() {
            Page<Candidate> page = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);

            when(candidateRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(page);

            CandidateSearchCriteria criteria = CandidateSearchCriteria.builder().build();

            CandidateListResponse response = candidateService.findAll(criteria);

            assertThat(response.getMeta().getPage()).isEqualTo(1);
            assertThat(response.getMeta().getLimit()).isEqualTo(20);
        }

        @Test
        @DisplayName("Should filter by role when specified")
        void shouldFilterByRoleWhenSpecified() {
            testCandidate.setRepositories(List.of(
                Repository.builder().language("Java").name("api").fullName("user/api").url("url").build()
            ));
            Page<Candidate> page = new PageImpl<>(List.of(testCandidate), PageRequest.of(0, 20), 1);

            when(candidateRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(page);
            when(techStackFilterService.matchesRoleStrict(any(), eq(TargetRole.BACKEND)))
                .thenReturn(true);

            CandidateSearchCriteria criteria = CandidateSearchCriteria.builder()
                .role(TargetRole.BACKEND)
                .build();

            CandidateListResponse response = candidateService.findAll(criteria);

            verify(techStackFilterService).matchesRoleStrict(any(), eq(TargetRole.BACKEND));
        }
    }

    @Nested
    @DisplayName("findById")
    class FindById {

        @Test
        @DisplayName("Should return candidate when found")
        void shouldReturnCandidateWhenFound() {
            when(candidateRepository.findByIdWithRelations("test-id"))
                .thenReturn(Optional.of(testCandidate));

            Optional<Candidate> result = candidateService.findById("test-id");

            assertThat(result).isPresent();
            assertThat(result.get().getGithubUsername()).isEqualTo("testuser");
        }

        @Test
        @DisplayName("Should return empty when not found")
        void shouldReturnEmptyWhenNotFound() {
            when(candidateRepository.findByIdWithRelations("nonexistent"))
                .thenReturn(Optional.empty());

            Optional<Candidate> result = candidateService.findById("nonexistent");

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("findByUsername")
    class FindByUsername {

        @Test
        @DisplayName("Should return candidate when found by username")
        void shouldReturnCandidateWhenFoundByUsername() {
            when(candidateRepository.findByUsernameWithRelations("testuser"))
                .thenReturn(Optional.of(testCandidate));

            Optional<Candidate> result = candidateService.findByUsername("testuser");

            assertThat(result).isPresent();
            assertThat(result.get().getGithubUsername()).isEqualTo("testuser");
        }
    }

    @Nested
    @DisplayName("getStats")
    class GetStats {

        @Test
        @DisplayName("Should return correct statistics")
        void shouldReturnCorrectStatistics() {
            when(candidateRepository.count()).thenReturn(100L);
            when(candidateRepository.countByTotalScoreIsNotNull()).thenReturn(80L);
            when(candidateRepository.countByCrawledAtGreaterThanEqual(any()))
                .thenReturn(10L);
            when(candidateRepository.findTopCandidates(any()))
                .thenReturn(List.of(testCandidate));

            CandidateStatsResponse stats = candidateService.getStats();

            assertThat(stats.getTotal()).isEqualTo(100);
            assertThat(stats.getWithScore()).isEqualTo(80);
            assertThat(stats.getRecentlyAdded()).isEqualTo(10);
            assertThat(stats.getTopCandidates()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("getSources")
    class GetSources {

        @Test
        @DisplayName("Should return source counts")
        void shouldReturnSourceCounts() {
            when(candidateSourceRepository.countBySourceName())
                .thenReturn(List.of(
                    new Object[]{"woowacourse", 50L},
                    new Object[]{"naver", 30L}
                ));

            List<SourceCountResponse> sources = candidateService.getSources();

            assertThat(sources).hasSize(2);
            assertThat(sources.get(0).getName()).isEqualTo("woowacourse");
            assertThat(sources.get(0).getCount()).isEqualTo(50);
        }
    }

    @Nested
    @DisplayName("deleteOldCandidates")
    class DeleteOldCandidates {

        @Test
        @DisplayName("Should delete candidates older than specified months")
        void shouldDeleteCandidatesOlderThanSpecifiedMonths() {
            when(candidateRepository.deleteByCrawledAtBefore(any()))
                .thenReturn(5);

            int deleted = candidateService.deleteOldCandidates(6);

            assertThat(deleted).isEqualTo(5);
            verify(candidateRepository).deleteByCrawledAtBefore(any());
        }
    }

    // Helper method
    private Candidate createTestCandidate(String username) {
        return Candidate.builder()
            .id("test-id")
            .githubUsername(username)
            .githubId(12345)
            .name("Test User")
            .email("test@example.com")
            .bio("Test bio")
            .company("Test Company")
            .location("Seoul")
            .publicRepos(10)
            .followers(100)
            .following(50)
            .totalCommits(500)
            .totalScore(75.0)
            .status(CandidateStatus.ACTIVE)
            .crawledAt(LocalDateTime.now())
            .build();
    }
}
