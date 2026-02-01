package com.peopleminer.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "repo_analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepoAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", unique = true, nullable = false)
    private Repository repository;

    @Builder.Default
    private boolean hasTests = false;

    private String testFramework;

    @Builder.Default
    private boolean hasCI = false;

    private String ciPlatform;

    @Builder.Default
    private boolean hasReadme = false;

    @Builder.Default
    private boolean hasContributing = false;

    @Builder.Default
    private boolean hasLicense = false;

    @Builder.Default
    private boolean hasDocs = false;

    @Builder.Default
    private boolean hasLinter = false;

    @Builder.Default
    private boolean hasTypeCheck = false;

    @Builder.Default
    private boolean hasDockerfile = false;

    private Double conventionalCommitRatio;

    private Integer avgCommitMessageLength;

    @Builder.Default
    private int totalCommits = 0;

    @CreationTimestamp
    private LocalDateTime analyzedAt;
}
