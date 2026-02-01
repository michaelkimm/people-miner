package com.peopleminer.domain.repository;

import com.peopleminer.domain.entity.Repository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@org.springframework.stereotype.Repository
public interface RepositoryRepository extends JpaRepository<Repository, String> {

    Optional<Repository> findByCandidateIdAndFullName(String candidateId, String fullName);

    List<Repository> findByCandidateIdOrderByStarCountDesc(String candidateId);

    @Query("SELECT r FROM Repository r WHERE r.candidate.id = :candidateId ORDER BY r.starCount DESC")
    List<Repository> findTopByCandidateId(@Param("candidateId") String candidateId, Pageable pageable);

    List<Repository> findByCandidateId(String candidateId);
}
