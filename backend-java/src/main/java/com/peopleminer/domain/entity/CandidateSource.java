package com.peopleminer.domain.entity;

import com.peopleminer.domain.enums.SourceType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "candidate_sources", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"candidate_id", "sourceType", "sourceName"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateSource {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SourceType sourceType;

    @Column(nullable = false)
    private String sourceName;

    private String sourceUrl;

    @CreationTimestamp
    private LocalDateTime discoveredAt;
}
