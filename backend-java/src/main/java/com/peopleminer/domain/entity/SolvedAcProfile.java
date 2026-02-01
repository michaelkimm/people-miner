package com.peopleminer.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "solved_ac_profiles", indexes = {
    @Index(name = "idx_solved_ac_profiles_tier", columnList = "tier DESC"),
    @Index(name = "idx_solved_ac_profiles_rating", columnList = "rating DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolvedAcProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", unique = true, nullable = false)
    private Candidate candidate;

    @Column(nullable = false)
    private String handle;

    private int tier;

    private String tierName;

    private int rating;

    private int solvedCount;

    @Builder.Default
    private int voteCount = 0;

    @Builder.Default
    private int classLevel = 0;

    private String classDecoration;

    @Builder.Default
    private int maxStreak = 0;

    private Integer rank;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Integer> tagStats;

    @CreationTimestamp
    private LocalDateTime fetchedAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
