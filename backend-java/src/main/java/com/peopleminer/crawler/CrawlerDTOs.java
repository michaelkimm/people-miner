package com.peopleminer.crawler;

import com.peopleminer.config.CrawlSourcesConfig.SourceCategory;
import com.peopleminer.domain.enums.JobStatus;
import com.peopleminer.domain.enums.SourceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
class StartCrawlOptions {
    private List<SourceCategory> categories;
    private List<String> sourceNames;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
class StartCrawlResponse {
    private String jobId;
    private String message;
    private int sourcesCount;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
class SyncResult {
    private int created;
    private int updated;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
class CrawlJobStatus {
    private String id;
    private JobStatus status;
    private int totalTasks;
    private int completedTasks;
    private int candidatesFound;
    private int candidatesNew;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private int pendingTasks;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
class CrawlSourceResponse {
    private String id;
    private String name;
    private SourceType type;
    private String url;
    private boolean enabled;
    private LocalDateTime lastCrawled;
    private String displayName;
    private String category;
    private String description;
    private List<String> tags;
    private int priority;
    private Integer expectedCandidates;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
class SourcesStatsResponse {
    private List<Map<String, Object>> database;
    private List<Map<String, Object>> recentCrawls;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
class CrawlResult {
    private int found;
    private int newCount;
}

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
class AddSourceRequest {
    private String name;
    private String displayName;
    private SourceType type;
    private String url;
    private Map<String, Object> config;
}
