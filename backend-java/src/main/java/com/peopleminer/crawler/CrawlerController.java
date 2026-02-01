package com.peopleminer.crawler;

import com.peopleminer.config.CrawlSourcesConfig.SourceCategory;
import com.peopleminer.domain.entity.CrawlJob;
import com.peopleminer.domain.entity.CrawlSource;
import com.peopleminer.domain.enums.SourceType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/crawler")
@RequiredArgsConstructor
public class CrawlerController {

    private final CrawlerService crawlerService;

    @PostMapping("/start")
    public ResponseEntity<StartCrawlResponse> startCrawl(@RequestBody(required = false) StartCrawlOptions options) {
        return ResponseEntity.ok(crawlerService.startCrawl(options));
    }

    @PostMapping("/crawl/{sourceName}")
    public ResponseEntity<StartCrawlResponse> crawlSource(@PathVariable String sourceName) {
        return ResponseEntity.ok(crawlerService.crawlSource(sourceName));
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<CrawlJobStatus> getCrawlStatus(@PathVariable String jobId) {
        return crawlerService.getCrawlStatus(jobId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/latest")
    public ResponseEntity<CrawlJob> getLatestJob() {
        return crawlerService.getLatestCrawlJob()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/sources")
    public ResponseEntity<List<CrawlSourceResponse>> getSources(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) Boolean enabled
    ) {
        List<CrawlSourceResponse> sources = crawlerService.getSources();

        if (category != null) {
            sources = sources.stream()
                .filter(s -> s.getCategory().equalsIgnoreCase(category))
                .collect(Collectors.toList());
        }

        if (enabled != null) {
            sources = sources.stream()
                .filter(s -> s.isEnabled() == enabled)
                .collect(Collectors.toList());
        }

        return ResponseEntity.ok(sources);
    }

    @GetMapping("/sources/stats")
    public ResponseEntity<SourcesStatsResponse> getSourcesStats() {
        return ResponseEntity.ok(crawlerService.getSourcesStats());
    }

    @PostMapping("/sources/sync")
    public ResponseEntity<SyncResult> syncSources() {
        return ResponseEntity.ok(crawlerService.syncSourcesFromConfig());
    }

    @PostMapping("/sources")
    public ResponseEntity<CrawlSource> addSource(@RequestBody AddSourceRequest request) {
        // For now, just sync from config - in a real implementation, add custom source
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/sources/{name}")
    public ResponseEntity<CrawlSource> toggleSource(
        @PathVariable String name,
        @RequestBody Map<String, Boolean> body
    ) {
        Boolean enabled = body.get("enabled");
        if (enabled == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(crawlerService.toggleSource(name, enabled));
    }
}
