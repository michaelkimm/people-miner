package com.peopleminer.crawler;

import com.peopleminer.domain.entity.CrawlJob;
import com.peopleminer.domain.entity.CrawlSource;
import com.peopleminer.domain.enums.JobStatus;
import com.peopleminer.domain.enums.SourceType;
import com.peopleminer.domain.repository.CrawlJobRepository;
import com.peopleminer.domain.repository.CrawlSourceRepository;
import com.peopleminer.events.EventsGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CrawlerServiceTest {

    @Mock
    private CrawlSourceRepository crawlSourceRepository;

    @Mock
    private CrawlJobRepository crawlJobRepository;

    @Mock
    private GithubOrgCrawler githubOrgCrawler;

    @Mock
    private EventsGateway eventsGateway;

    private CrawlerService crawlerService;

    @BeforeEach
    void setUp() {
        crawlerService = new CrawlerService(
            crawlSourceRepository,
            crawlJobRepository,
            githubOrgCrawler,
            eventsGateway
        );
    }

    @Nested
    @DisplayName("startCrawl")
    class StartCrawl {

        @Test
        @DisplayName("Should return empty response when no sources available")
        void shouldReturnEmptyResponseWhenNoSourcesAvailable() {
            when(crawlSourceRepository.count()).thenReturn(1L);
            when(crawlSourceRepository.findByEnabledTrueOrderByNameAsc()).thenReturn(List.of());

            StartCrawlResponse response = crawlerService.startCrawl(null);

            assertThat(response.getJobId()).isEmpty();
            assertThat(response.getMessage()).isEqualTo("No sources to crawl");
            assertThat(response.getSourcesCount()).isEqualTo(0);
        }

        @Test
        @DisplayName("Should start crawl job with enabled sources")
        void shouldStartCrawlJobWithEnabledSources() {
            CrawlSource source = createTestSource("test-source");
            CrawlJob savedJob = CrawlJob.builder()
                .id("job-123")
                .status(JobStatus.RUNNING)
                .build();

            when(crawlSourceRepository.count()).thenReturn(1L);
            when(crawlSourceRepository.findByEnabledTrueOrderByNameAsc()).thenReturn(List.of(source));
            when(crawlJobRepository.save(any(CrawlJob.class))).thenReturn(savedJob);

            StartCrawlResponse response = crawlerService.startCrawl(null);

            assertThat(response.getJobId()).isEqualTo("job-123");
            assertThat(response.getSourcesCount()).isEqualTo(1);

            ArgumentCaptor<CrawlJob> jobCaptor = ArgumentCaptor.forClass(CrawlJob.class);
            verify(crawlJobRepository).save(jobCaptor.capture());
            assertThat(jobCaptor.getValue().getStatus()).isEqualTo(JobStatus.RUNNING);
        }

        @Test
        @DisplayName("Should filter sources by names when specified")
        void shouldFilterSourcesByNamesWhenSpecified() {
            CrawlSource source1 = createTestSource("source1");
            CrawlSource source2 = createTestSource("source2");
            CrawlJob savedJob = CrawlJob.builder()
                .id("job-123")
                .status(JobStatus.RUNNING)
                .build();

            when(crawlSourceRepository.count()).thenReturn(2L);
            when(crawlSourceRepository.findByEnabledTrueOrderByNameAsc())
                .thenReturn(List.of(source1, source2));
            when(crawlJobRepository.save(any(CrawlJob.class))).thenReturn(savedJob);

            StartCrawlOptions options = StartCrawlOptions.builder()
                .sourceNames(List.of("source1"))
                .build();

            StartCrawlResponse response = crawlerService.startCrawl(options);

            assertThat(response.getSourcesCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("Should sync sources from config when db is empty")
        void shouldSyncSourcesFromConfigWhenDbIsEmpty() {
            when(crawlSourceRepository.count()).thenReturn(0L);
            when(crawlSourceRepository.findByName(anyString())).thenReturn(Optional.empty());
            when(crawlSourceRepository.save(any(CrawlSource.class))).thenAnswer(inv -> inv.getArgument(0));
            when(crawlSourceRepository.findByEnabledTrueOrderByNameAsc()).thenReturn(List.of());

            crawlerService.startCrawl(null);

            verify(crawlSourceRepository, atLeastOnce()).save(any(CrawlSource.class));
        }
    }

    @Nested
    @DisplayName("syncSourcesFromConfig")
    class SyncSourcesFromConfig {

        @Test
        @DisplayName("Should create new sources")
        void shouldCreateNewSources() {
            when(crawlSourceRepository.findByName(anyString())).thenReturn(Optional.empty());
            when(crawlSourceRepository.save(any(CrawlSource.class))).thenAnswer(inv -> inv.getArgument(0));

            SyncResult result = crawlerService.syncSourcesFromConfig();

            assertThat(result.getCreated()).isGreaterThan(0);
            verify(crawlSourceRepository, atLeastOnce()).save(any(CrawlSource.class));
        }

        @Test
        @DisplayName("Should update existing sources")
        void shouldUpdateExistingSources() {
            CrawlSource existingSource = createTestSource("woowacourse");

            when(crawlSourceRepository.findByName("woowacourse")).thenReturn(Optional.of(existingSource));
            when(crawlSourceRepository.findByName(argThat(name -> !"woowacourse".equals(name))))
                .thenReturn(Optional.empty());
            when(crawlSourceRepository.save(any(CrawlSource.class))).thenAnswer(inv -> inv.getArgument(0));

            SyncResult result = crawlerService.syncSourcesFromConfig();

            assertThat(result.getUpdated()).isGreaterThanOrEqualTo(1);
        }
    }

    @Nested
    @DisplayName("crawlSource")
    class CrawlSourceTest {

        @Test
        @DisplayName("Should start crawl for specific source")
        void shouldStartCrawlForSpecificSource() {
            com.peopleminer.domain.entity.CrawlSource source = createTestSource("test-source");
            CrawlJob savedJob = CrawlJob.builder()
                .id("job-123")
                .status(JobStatus.RUNNING)
                .build();

            when(crawlSourceRepository.findByName("test-source")).thenReturn(Optional.of(source));
            when(crawlJobRepository.save(any(CrawlJob.class))).thenReturn(savedJob);

            StartCrawlResponse response = crawlerService.crawlSource("test-source");

            assertThat(response.getJobId()).isEqualTo("job-123");
            assertThat(response.getSourcesCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("Should throw when source not found")
        void shouldThrowWhenSourceNotFound() {
            when(crawlSourceRepository.findByName("nonexistent")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> crawlerService.crawlSource("nonexistent"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not found");
        }
    }

    @Nested
    @DisplayName("getCrawlStatus")
    class GetCrawlStatus {

        @Test
        @DisplayName("Should return crawl job status")
        void shouldReturnCrawlJobStatus() {
            CrawlJob job = CrawlJob.builder()
                .id("job-123")
                .status(JobStatus.RUNNING)
                .totalTasks(5)
                .completedTasks(2)
                .candidatesFound(10)
                .candidatesNew(3)
                .startedAt(LocalDateTime.now())
                .build();

            when(crawlJobRepository.findById("job-123")).thenReturn(Optional.of(job));

            Optional<CrawlJobStatus> status = crawlerService.getCrawlStatus("job-123");

            assertThat(status).isPresent();
            assertThat(status.get().getId()).isEqualTo("job-123");
            assertThat(status.get().getStatus()).isEqualTo(JobStatus.RUNNING);
            assertThat(status.get().getTotalTasks()).isEqualTo(5);
            assertThat(status.get().getCompletedTasks()).isEqualTo(2);
        }

        @Test
        @DisplayName("Should return empty when job not found")
        void shouldReturnEmptyWhenJobNotFound() {
            when(crawlJobRepository.findById("nonexistent")).thenReturn(Optional.empty());

            Optional<CrawlJobStatus> status = crawlerService.getCrawlStatus("nonexistent");

            assertThat(status).isEmpty();
        }
    }

    @Nested
    @DisplayName("toggleSource")
    class ToggleSource {

        @Test
        @DisplayName("Should enable source")
        void shouldEnableSource() {
            CrawlSource source = createTestSource("test-source");
            source.setEnabled(false);

            when(crawlSourceRepository.findByName("test-source")).thenReturn(Optional.of(source));
            when(crawlSourceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            CrawlSource result = crawlerService.toggleSource("test-source", true);

            assertThat(result.isEnabled()).isTrue();
        }

        @Test
        @DisplayName("Should disable source")
        void shouldDisableSource() {
            CrawlSource source = createTestSource("test-source");
            source.setEnabled(true);

            when(crawlSourceRepository.findByName("test-source")).thenReturn(Optional.of(source));
            when(crawlSourceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            CrawlSource result = crawlerService.toggleSource("test-source", false);

            assertThat(result.isEnabled()).isFalse();
        }

        @Test
        @DisplayName("Should throw when source not found")
        void shouldThrowWhenSourceNotFound() {
            when(crawlSourceRepository.findByName("nonexistent")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> crawlerService.toggleSource("nonexistent", true))
                .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("getSources")
    class GetSources {

        @Test
        @DisplayName("Should return all sources")
        void shouldReturnAllSources() {
            CrawlSource source1 = createTestSource("source1");
            CrawlSource source2 = createTestSource("source2");

            when(crawlSourceRepository.findAll()).thenReturn(List.of(source1, source2));

            List<CrawlSourceResponse> sources = crawlerService.getSources();

            assertThat(sources).hasSize(2);
        }

        @Test
        @DisplayName("Should return sources sorted by name")
        void shouldReturnSourcesSortedByName() {
            CrawlSource sourceB = createTestSource("b-source");
            CrawlSource sourceA = createTestSource("a-source");

            when(crawlSourceRepository.findAll()).thenReturn(List.of(sourceB, sourceA));

            List<CrawlSourceResponse> sources = crawlerService.getSources();

            assertThat(sources.get(0).getName()).isEqualTo("a-source");
            assertThat(sources.get(1).getName()).isEqualTo("b-source");
        }
    }

    @Nested
    @DisplayName("getLatestCrawlJob")
    class GetLatestCrawlJob {

        @Test
        @DisplayName("Should return latest crawl job")
        void shouldReturnLatestCrawlJob() {
            CrawlJob job = CrawlJob.builder()
                .id("latest-job")
                .status(JobStatus.COMPLETED)
                .build();

            when(crawlJobRepository.findFirstByOrderByCreatedAtDesc()).thenReturn(Optional.of(job));

            Optional<CrawlJob> result = crawlerService.getLatestCrawlJob();

            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo("latest-job");
        }

        @Test
        @DisplayName("Should return empty when no jobs exist")
        void shouldReturnEmptyWhenNoJobsExist() {
            when(crawlJobRepository.findFirstByOrderByCreatedAtDesc()).thenReturn(Optional.empty());

            Optional<CrawlJob> result = crawlerService.getLatestCrawlJob();

            assertThat(result).isEmpty();
        }
    }

    // Helper methods
    private CrawlSource createTestSource(String name) {
        return CrawlSource.builder()
            .id("source-id-" + name)
            .name(name)
            .type(SourceType.GITHUB_ORG)
            .url("https://github.com/" + name)
            .config(Map.of("orgName", name))
            .enabled(true)
            .build();
    }
}
