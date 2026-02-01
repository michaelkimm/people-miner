package com.peopleminer.domain.entity;

import com.peopleminer.domain.enums.JobStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "crawl_jobs", indexes = {
    @Index(name = "idx_crawl_jobs_status", columnList = "status"),
    @Index(name = "idx_crawl_jobs_created_at", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrawlJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String sourceId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private JobStatus status = JobStatus.PENDING;

    @Builder.Default
    private int totalTasks = 0;

    @Builder.Default
    private int completedTasks = 0;

    @Builder.Default
    private int candidatesFound = 0;

    @Builder.Default
    private int candidatesNew = 0;

    @Column(columnDefinition = "TEXT")
    private String error;

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
