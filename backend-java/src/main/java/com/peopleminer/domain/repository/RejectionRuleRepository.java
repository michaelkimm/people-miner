package com.peopleminer.domain.repository;

import com.peopleminer.domain.entity.RejectionRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RejectionRuleRepository extends JpaRepository<RejectionRule, String> {

    List<RejectionRule> findByEnabledTrueOrderByConfidenceDesc();

    List<RejectionRule> findAllByOrderByEnabledDescConfidenceDesc();

    long countByEnabledTrue();
}
