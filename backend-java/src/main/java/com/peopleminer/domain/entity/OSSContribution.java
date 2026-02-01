package com.peopleminer.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "oss_contributions", indexes = {
    @Index(name = "idx_oss_contributions_candidate_id", columnList = "candidate_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OSSContribution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Column(nullable = false)
    private String externalRepo;

    @Column(nullable = false)
    private String prTitle;

    @Column(unique = true, nullable = false)
    private String prUrl;

    private int prNumber;

    private LocalDateTime mergedAt;

    private String state;

    @Builder.Default
    private int additions = 0;

    @Builder.Default
    private int deletions = 0;

    @Builder.Default
    private boolean isSignificant = false;

    @CreationTimestamp
    private LocalDateTime discoveredAt;
}
