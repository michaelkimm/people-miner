package com.peopleminer.domain.repository;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.enums.CandidateStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, String>, JpaSpecificationExecutor<Candidate> {

    Optional<Candidate> findByGithubUsername(String githubUsername);

    boolean existsByGithubUsername(String githubUsername);

    long countByStatus(CandidateStatus status);

    long countByTotalScoreIsNotNull();

    long countByCrawledAtGreaterThanEqual(LocalDateTime since);

    @Query("SELECT c FROM Candidate c WHERE c.totalScore IS NOT NULL ORDER BY c.totalScore DESC")
    List<Candidate> findTopCandidates(Pageable pageable);

    @Query("SELECT c FROM Candidate c WHERE c.scoredAt IS NULL OR c.scoredAt < :cutoff")
    List<Candidate> findCandidatesNeedingScoring(@Param("cutoff") LocalDateTime cutoff, Pageable pageable);

    @Query("SELECT c FROM Candidate c WHERE c.solvedAcProfile IS NULL")
    List<Candidate> findCandidatesWithoutSolvedAcProfile(Pageable pageable);

    @Query("SELECT c FROM Candidate c LEFT JOIN FETCH c.sources LEFT JOIN FETCH c.repositories WHERE c.id = :id")
    Optional<Candidate> findByIdWithRelations(@Param("id") String id);

    @Query("SELECT c FROM Candidate c LEFT JOIN FETCH c.sources LEFT JOIN FETCH c.repositories WHERE c.githubUsername = :username")
    Optional<Candidate> findByUsernameWithRelations(@Param("username") String username);

    int deleteByCrawledAtBefore(LocalDateTime cutoff);
}
