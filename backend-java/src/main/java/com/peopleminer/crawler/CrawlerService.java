package com.peopleminer.crawler;

import com.peopleminer.config.CrawlSourcesConfig;
import com.peopleminer.config.CrawlSourcesConfig.CrawlSourceConfigEntry;
import com.peopleminer.config.CrawlSourcesConfig.SourceCategory;
import com.peopleminer.domain.entity.CrawlJob;
import com.peopleminer.domain.entity.CrawlSource;
import com.peopleminer.domain.enums.JobStatus;
import com.peopleminer.domain.enums.SourceType;
import com.peopleminer.domain.repository.CrawlJobRepository;
import com.peopleminer.domain.repository.CrawlSourceRepository;
import com.peopleminer.events.EventsGateway;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CrawlerService {

    private final CrawlSourceRepository crawlSourceRepository;
    private final CrawlJobRepository crawlJobRepository;
    private final GithubOrgCrawler githubOrgCrawler;
    private final EventsGateway eventsGateway;

    @Transactional
    public StartCrawlResponse startCrawl(StartCrawlOptions options) {
        long dbSourceCount = crawlSourceRepository.count();
        if (dbSourceCount == 0) {
            syncSourcesFromConfig();
        }

        List<CrawlSource> sources = crawlSourceRepository.findByEnabledTrueOrderByNameAsc();

        if (options != null && options.getCategories() != null && !options.getCategories().isEmpty()) {
            Set<String> categoryNames = getSourceNamesByCategories(options.getCategories());
            sources = sources.stream()
                .filter(s -> categoryNames.contains(s.getName()))
                .collect(Collectors.toList());
        }

        if (options != null && options.getSourceNames() != null && !options.getSourceNames().isEmpty()) {
            Set<String> names = new HashSet<>(options.getSourceNames());
            sources = sources.stream()
                .filter(s -> names.contains(s.getName()))
                .collect(Collectors.toList());
        }

        if (sources.isEmpty()) {
            return StartCrawlResponse.builder()
                .jobId("")
                .message("No sources to crawl")
                .sourcesCount(0)
                .build();
        }

        CrawlJob crawlJob = CrawlJob.builder()
            .status(JobStatus.RUNNING)
            .startedAt(LocalDateTime.now())
            .totalTasks(sources.size())
            .completedTasks(0)
            .build();
        crawlJob = crawlJobRepository.save(crawlJob);

        // Start async crawling
        final String jobId = crawlJob.getId();
        processCrawlJob(jobId, sources);

        log.info("Started crawl job {} with {} sources", jobId, sources.size());

        return StartCrawlResponse.builder()
            .jobId(jobId)
            .message("Started crawling " + sources.size() + " sources")
            .sourcesCount(sources.size())
            .build();
    }

    @Async
    public void processCrawlJob(String jobId, List<CrawlSource> sources) {
        List<CrawlSource> sortedSources = sortSourcesByPriority(sources);

        for (CrawlSource source : sortedSources) {
            try {
                eventsGateway.sendProgress(EventsGateway.JobProgress.builder()
                    .jobId(jobId)
                    .source(source.getName())
                    .status("processing")
                    .message("크롤링 시작: " + source.getName())
                    .build());

                CrawlResult result;
                if (source.getType() == SourceType.GITHUB_ORG) {
                    String orgName = (String) source.getConfig().get("orgName");
                    result = githubOrgCrawler.crawl(orgName, source.getName());
                } else {
                    log.warn("Unsupported source type: {}", source.getType());
                    continue;
                }

                source.setLastCrawled(LocalDateTime.now());
                crawlSourceRepository.save(source);

                eventsGateway.sendProgress(EventsGateway.JobProgress.builder()
                    .jobId(jobId)
                    .source(source.getName())
                    .status("completed")
                    .message("완료: " + source.getName() + " (발견: " + result.getFound() + ", 신규: " + result.getNewCount() + ")")
                    .found(result.getFound())
                    .newCount(result.getNewCount())
                    .build());

            } catch (Exception e) {
                log.error("Failed to crawl {}: {}", source.getName(), e.getMessage());
                eventsGateway.sendProgress(EventsGateway.JobProgress.builder()
                    .jobId(jobId)
                    .source(source.getName())
                    .status("error")
                    .message("실패: " + source.getName())
                    .error(e.getMessage())
                    .build());
            }

            crawlJobRepository.incrementCompletedTasks(jobId);
        }

        // Finalize job
        crawlJobRepository.findById(jobId).ifPresent(job -> {
            job.setStatus(JobStatus.COMPLETED);
            job.setCompletedAt(LocalDateTime.now());
            crawlJobRepository.save(job);

            eventsGateway.sendProgress(EventsGateway.JobProgress.builder()
                .jobId(jobId)
                .status("finished")
                .message("크롤링 완료!")
                .build());
        });
    }

    @Transactional
    public SyncResult syncSourcesFromConfig() {
        int created = 0;
        int updated = 0;

        for (CrawlSourceConfigEntry entry : CrawlSourcesConfig.getAllCrawlSources()) {
            Optional<CrawlSource> existing = crawlSourceRepository.findByName(entry.getName());

            if (existing.isPresent()) {
                CrawlSource source = existing.get();
                source.setType(entry.getType());
                source.setUrl(entry.getUrl());
                source.setConfig(entry.getConfig());
                source.setEnabled(entry.isEnabled());
                crawlSourceRepository.save(source);
                updated++;
            } else {
                CrawlSource source = CrawlSource.builder()
                    .name(entry.getName())
                    .type(entry.getType())
                    .url(entry.getUrl())
                    .config(entry.getConfig())
                    .enabled(entry.isEnabled())
                    .build();
                crawlSourceRepository.save(source);
                created++;
            }
        }

        log.info("Synced sources: {} created, {} updated", created, updated);
        return SyncResult.builder().created(created).updated(updated).build();
    }

    @Transactional(readOnly = true)
    public SourcesStatsResponse getSourcesStats() {
        List<Object[]> dbStats = crawlSourceRepository.countByTypeAndEnabled();
        List<CrawlSource> recentCrawls = crawlSourceRepository.findRecentlyCrawled(PageRequest.of(0, 10));

        return SourcesStatsResponse.builder()
            .database(dbStats.stream()
                .map(row -> Map.of(
                    "type", row[0],
                    "enabled", row[1],
                    "count", row[2]
                ))
                .collect(Collectors.toList()))
            .recentCrawls(recentCrawls.stream()
                .map(s -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", s.getName());
                    map.put("lastCrawled", s.getLastCrawled());
                    return map;
                })
                .collect(Collectors.toList()))
            .build();
    }

    @Transactional
    public StartCrawlResponse crawlSource(String sourceName) {
        CrawlSource source = crawlSourceRepository.findByName(sourceName)
            .orElseThrow(() -> new IllegalArgumentException("Source not found: " + sourceName));

        CrawlJob crawlJob = CrawlJob.builder()
            .status(JobStatus.RUNNING)
            .startedAt(LocalDateTime.now())
            .totalTasks(1)
            .completedTasks(0)
            .build();
        crawlJob = crawlJobRepository.save(crawlJob);

        processCrawlJob(crawlJob.getId(), List.of(source));

        return StartCrawlResponse.builder()
            .jobId(crawlJob.getId())
            .message("Started crawling " + sourceName)
            .sourcesCount(1)
            .build();
    }

    @Transactional(readOnly = true)
    public Optional<CrawlJobStatus> getCrawlStatus(String jobId) {
        return crawlJobRepository.findById(jobId)
            .map(job -> CrawlJobStatus.builder()
                .id(job.getId())
                .status(job.getStatus())
                .totalTasks(job.getTotalTasks())
                .completedTasks(job.getCompletedTasks())
                .candidatesFound(job.getCandidatesFound())
                .candidatesNew(job.getCandidatesNew())
                .startedAt(job.getStartedAt())
                .completedAt(job.getCompletedAt())
                .build());
    }

    @Transactional(readOnly = true)
    public Optional<CrawlJob> getLatestCrawlJob() {
        return crawlJobRepository.findFirstByOrderByCreatedAtDesc();
    }

    @Transactional
    public CrawlSource toggleSource(String name, boolean enabled) {
        CrawlSource source = crawlSourceRepository.findByName(name)
            .orElseThrow(() -> new IllegalArgumentException("Source not found: " + name));
        source.setEnabled(enabled);
        return crawlSourceRepository.save(source);
    }

    @Transactional(readOnly = true)
    public List<CrawlSourceResponse> getSources() {
        return crawlSourceRepository.findAll().stream()
            .map(source -> {
                CrawlSourceConfigEntry configEntry = CrawlSourcesConfig.getAllCrawlSources().stream()
                    .filter(c -> c.getName().equals(source.getName()))
                    .findFirst()
                    .orElse(null);

                return CrawlSourceResponse.builder()
                    .id(source.getId())
                    .name(source.getName())
                    .type(source.getType())
                    .url(source.getUrl())
                    .enabled(source.isEnabled())
                    .lastCrawled(source.getLastCrawled())
                    .displayName(configEntry != null ? configEntry.getDisplayName() : source.getName())
                    .category(configEntry != null ? configEntry.getCategory().name() : "unknown")
                    .description(configEntry != null ? configEntry.getDescription() : null)
                    .tags(configEntry != null ? configEntry.getTags() : List.of())
                    .priority(configEntry != null ? configEntry.getPriority() : 99)
                    .build();
            })
            .sorted(Comparator.comparing(CrawlSourceResponse::getName))
            .collect(Collectors.toList());
    }

    private Set<String> getSourceNamesByCategories(List<SourceCategory> categories) {
        return CrawlSourcesConfig.getAllCrawlSources().stream()
            .filter(s -> categories.contains(s.getCategory()))
            .map(CrawlSourceConfigEntry::getName)
            .collect(Collectors.toSet());
    }

    private List<CrawlSource> sortSourcesByPriority(List<CrawlSource> sources) {
        Map<String, Integer> priorityMap = CrawlSourcesConfig.getAllCrawlSources().stream()
            .collect(Collectors.toMap(CrawlSourceConfigEntry::getName, CrawlSourceConfigEntry::getPriority));

        return sources.stream()
            .sorted(Comparator.comparingInt(s -> priorityMap.getOrDefault(s.getName(), 99)))
            .collect(Collectors.toList());
    }
}
