package com.peopleminer.domain.repository;

import com.peopleminer.domain.entity.CandidateSource;
import com.peopleminer.domain.enums.SourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateSourceRepository extends JpaRepository<CandidateSource, String> {

    Optional<CandidateSource> findByCandidateIdAndSourceTypeAndSourceName(
            String candidateId, SourceType sourceType, String sourceName);

    boolean existsByCandidateIdAndSourceTypeAndSourceName(
            String candidateId, SourceType sourceType, String sourceName);

    @Query("SELECT cs.sourceName, COUNT(cs) FROM CandidateSource cs GROUP BY cs.sourceName ORDER BY COUNT(cs) DESC")
    List<Object[]> countBySourceName();

    List<CandidateSource> findByCandidateId(String candidateId);
}
