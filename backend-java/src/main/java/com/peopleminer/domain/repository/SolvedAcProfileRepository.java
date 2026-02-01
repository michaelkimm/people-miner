package com.peopleminer.domain.repository;

import com.peopleminer.domain.entity.SolvedAcProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SolvedAcProfileRepository extends JpaRepository<SolvedAcProfile, String> {

    Optional<SolvedAcProfile> findByCandidateId(String candidateId);

    Optional<SolvedAcProfile> findByHandle(String handle);

    boolean existsByCandidateId(String candidateId);
}
