package com.peopleminer.domain.entity;

import com.peopleminer.domain.enums.CandidateStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "candidates", indexes = {
    @Index(name = "idx_candidates_total_score", columnList = "totalScore DESC"),
    @Index(name = "idx_candidates_crawled_at", columnList = "crawledAt"),
    @Index(name = "idx_candidates_status", columnList = "status"),
    @Index(name = "idx_candidates_last_activity_at", columnList = "lastActivityAt DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Candidate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String githubUsername;

    private Integer githubId;

    private String name;

    private String email;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private String company;

    private String location;

    private String blog;

    private String avatarUrl;

    @Builder.Default
    private int publicRepos = 0;

    @Builder.Default
    private int followers = 0;

    @Builder.Default
    private int following = 0;

    @Builder.Default
    private int totalCommits = 0;

    private Double readabilityScore;

    private Double problemSolvingScore;

    private Double cleanCodeScore;

    private Double solvedAcScore;

    private Double totalScore;

    @Builder.Default
    private boolean hasTilRepo = false;

    @Builder.Default
    private int tilRepoCount = 0;

    @Builder.Default
    private int longestProjectMonths = 0;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CandidateStatus status = CandidateStatus.ACTIVE;

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CandidateSource> sources = new ArrayList<>();

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Repository> repositories = new ArrayList<>();

    @OneToOne(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    private SolvedAcProfile solvedAcProfile;

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OSSContribution> ossContributions = new ArrayList<>();

    @OneToMany(mappedBy = "candidate", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CandidateFeedback> feedbacks = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime crawledAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime scoredAt;

    private LocalDateTime lastActivityAt;

    public void addSource(CandidateSource source) {
        sources.add(source);
        source.setCandidate(this);
    }

    public void addRepository(Repository repository) {
        repositories.add(repository);
        repository.setCandidate(this);
    }

    public void addFeedback(CandidateFeedback feedback) {
        feedbacks.add(feedback);
        feedback.setCandidate(this);
    }
}
