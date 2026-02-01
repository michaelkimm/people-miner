package com.peopleminer.domain.repository;

import com.peopleminer.domain.entity.CrawlJob;
import com.peopleminer.domain.enums.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CrawlJobRepository extends JpaRepository<CrawlJob, String> {

    Optional<CrawlJob> findFirstByOrderByCreatedAtDesc();

    List<CrawlJob> findByStatus(JobStatus status);

    @Modifying
    @Query("UPDATE CrawlJob cj SET cj.completedTasks = cj.completedTasks + 1 WHERE cj.id = :id AND cj.status = 'RUNNING'")
    int incrementCompletedTasks(@Param("id") String id);
}
