package com.peopleminer.domain.repository;

import com.peopleminer.domain.entity.CrawlSource;
import com.peopleminer.domain.enums.SourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CrawlSourceRepository extends JpaRepository<CrawlSource, String> {

    Optional<CrawlSource> findByName(String name);

    boolean existsByName(String name);

    List<CrawlSource> findByEnabledTrue();

    List<CrawlSource> findByEnabledTrueOrderByNameAsc();

    List<CrawlSource> findByType(SourceType type);

    @Query("SELECT cs FROM CrawlSource cs WHERE cs.lastCrawled IS NOT NULL ORDER BY cs.lastCrawled DESC")
    List<CrawlSource> findRecentlyCrawled(org.springframework.data.domain.Pageable pageable);

    @Query("SELECT cs.type, cs.enabled, COUNT(cs) FROM CrawlSource cs GROUP BY cs.type, cs.enabled")
    List<Object[]> countByTypeAndEnabled();
}
