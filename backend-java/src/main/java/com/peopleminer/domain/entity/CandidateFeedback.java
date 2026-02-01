package com.peopleminer.domain.entity;

import com.peopleminer.domain.enums.FeedbackAction;
import com.peopleminer.domain.enums.RejectionReason;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "candidate_feedbacks", indexes = {
    @Index(name = "idx_candidate_feedbacks_action", columnList = "action"),
    @Index(name = "idx_candidate_feedbacks_reason", columnList = "reason"),
    @Index(name = "idx_candidate_feedbacks_candidate_id", columnList = "candidate_id"),
    @Index(name = "idx_candidate_feedbacks_created_at", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FeedbackAction action;

    @Enumerated(EnumType.STRING)
    private RejectionReason reason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> snapshot;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
