package com.peopleminer.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "repositories", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"candidate_id", "fullName"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Repository {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String fullName;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String language;

    @Builder.Default
    private int starCount = 0;

    @Builder.Default
    private int forkCount = 0;

    @Column(nullable = false)
    private String url;

    private LocalDateTime pushedAt;

    private LocalDateTime analyzedAt;

    @OneToOne(mappedBy = "repository", cascade = CascadeType.ALL, orphanRemoval = true)
    private RepoAnalysis analysis;

    public void setAnalysis(RepoAnalysis analysis) {
        this.analysis = analysis;
        if (analysis != null) {
            analysis.setRepository(this);
        }
    }
}
