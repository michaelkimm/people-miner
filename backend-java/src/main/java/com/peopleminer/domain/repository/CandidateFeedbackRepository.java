package com.peopleminer.domain.repository;

import com.peopleminer.domain.entity.CandidateFeedback;
import com.peopleminer.domain.enums.FeedbackAction;
import com.peopleminer.domain.enums.RejectionReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CandidateFeedbackRepository extends JpaRepository<CandidateFeedback, String> {

    List<CandidateFeedback> findByCandidateId(String candidateId);

    List<CandidateFeedback> findByAction(FeedbackAction action);

    @Query("SELECT cf.reason, COUNT(cf) FROM CandidateFeedback cf WHERE cf.action = 'REJECT' AND cf.reason IS NOT NULL GROUP BY cf.reason")
    List<Object[]> countByReason();

    long countByActionAndCreatedAtGreaterThanEqual(FeedbackAction action, LocalDateTime since);
}
