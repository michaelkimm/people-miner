package com.peopleminer.config;

import com.peopleminer.domain.enums.SourceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Configuration
public class CrawlSourcesConfig {

    public enum SourceCategory {
        BOOTCAMP, UNIVERSITY, IT_CLUB, UNIV_CLUB, TECH_GIANT, UNICORN, STARTUP, OPEN_SOURCE, CONFERENCE, TECH_BLOG
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CrawlSourceConfigEntry {
        private String name;
        private String displayName;
        private SourceType type;
        private SourceCategory category;
        private String url;
        private Map<String, Object> config;
        private boolean enabled;
        private int priority;
        private String description;
        private List<String> tags;
        private Integer expectedCandidates;
    }

    public static final List<CrawlSourceConfigEntry> BOOTCAMP_SOURCES = List.of(
        CrawlSourceConfigEntry.builder()
            .name("boostcamp-web-2025")
            .displayName("부스트캠프 웹/모바일 2025")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.BOOTCAMP)
            .url("https://github.com/boostcampwm2025")
            .config(Map.of("orgName", "boostcampwm2025"))
            .enabled(true)
            .priority(10)
            .description("네이버 커넥트재단 웹/모바일 부트캠프")
            .tags(List.of("naver", "web", "mobile", "bootcamp"))
            .expectedCandidates(300)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("boostcamp-web-2024")
            .displayName("부스트캠프 웹/모바일 2024")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.BOOTCAMP)
            .url("https://github.com/boostcampwm-2024")
            .config(Map.of("orgName", "boostcampwm-2024"))
            .enabled(true)
            .priority(10)
            .tags(List.of("naver", "web", "mobile", "bootcamp"))
            .expectedCandidates(300)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("boostcamp-ai-7th")
            .displayName("부스트캠프 AI Tech 7기")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.BOOTCAMP)
            .url("https://github.com/boostcampaitech7")
            .config(Map.of("orgName", "boostcampaitech7"))
            .enabled(true)
            .priority(10)
            .description("네이버 커넥트재단 AI 부트캠프")
            .tags(List.of("naver", "ai", "ml", "bootcamp"))
            .expectedCandidates(200)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("boostcamp-ai-6th")
            .displayName("부스트캠프 AI Tech 6기")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.BOOTCAMP)
            .url("https://github.com/boostcampaitech6")
            .config(Map.of("orgName", "boostcampaitech6"))
            .enabled(true)
            .priority(10)
            .tags(List.of("naver", "ai", "ml", "bootcamp"))
            .expectedCandidates(200)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("ssafy-10th")
            .displayName("SSAFY 10기")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.BOOTCAMP)
            .url("https://github.com/SSAFY-10th")
            .config(Map.of("orgName", "SSAFY-10th"))
            .enabled(true)
            .priority(10)
            .description("삼성 청년 SW 아카데미")
            .tags(List.of("samsung", "ssafy", "bootcamp"))
            .expectedCandidates(400)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("ssafy-11th")
            .displayName("SSAFY 11기")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.BOOTCAMP)
            .url("https://github.com/SSAFY-11th")
            .config(Map.of("orgName", "SSAFY-11th"))
            .enabled(true)
            .priority(10)
            .tags(List.of("samsung", "ssafy", "bootcamp"))
            .expectedCandidates(400)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("woowacourse")
            .displayName("우아한테크코스")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.BOOTCAMP)
            .url("https://github.com/woowacourse")
            .config(Map.of("orgName", "woowacourse"))
            .enabled(true)
            .priority(5)
            .description("우아한형제들 개발자 양성 프로그램")
            .tags(List.of("woowahan", "bootcamp", "java", "spring"))
            .expectedCandidates(500)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("woowacourse-teams")
            .displayName("우아한테크코스 팀 프로젝트")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.BOOTCAMP)
            .url("https://github.com/woowacourse-teams")
            .config(Map.of("orgName", "woowacourse-teams"))
            .enabled(true)
            .priority(5)
            .tags(List.of("woowahan", "bootcamp", "team-project"))
            .expectedCandidates(300)
            .build()
    );

    public static final List<CrawlSourceConfigEntry> IT_CLUB_SOURCES = List.of(
        CrawlSourceConfigEntry.builder()
            .name("depromeet")
            .displayName("디프만 (Depromeet)")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.IT_CLUB)
            .url("https://github.com/depromeet")
            .config(Map.of("orgName", "depromeet"))
            .enabled(true)
            .priority(10)
            .description("디자이너와 프로그래머가 만났을 때")
            .tags(List.of("side-project", "design", "development"))
            .expectedCandidates(300)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("nexters")
            .displayName("Nexters")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.IT_CLUB)
            .url("https://github.com/Nexters")
            .config(Map.of("orgName", "Nexters"))
            .enabled(true)
            .priority(10)
            .description("IT 연합 동아리")
            .tags(List.of("side-project", "it-club"))
            .expectedCandidates(400)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("yapp-project")
            .displayName("YAPP")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.IT_CLUB)
            .url("https://github.com/YAPP-Github")
            .config(Map.of("orgName", "YAPP-Github"))
            .enabled(true)
            .priority(10)
            .description("Yet Another Programming Project")
            .tags(List.of("side-project", "yapp"))
            .expectedCandidates(400)
            .build()
    );

    public static final List<CrawlSourceConfigEntry> UNIVERSITY_CLUB_SOURCES = List.of(
        CrawlSourceConfigEntry.builder()
            .name("sparcs-kaist")
            .displayName("SPARCS (KAIST)")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.UNIV_CLUB)
            .url("https://github.com/sparcs-kaist")
            .config(Map.of("orgName", "sparcs-kaist"))
            .enabled(true)
            .priority(5)
            .description("KAIST 개발 동아리")
            .tags(List.of("kaist", "university", "elite"))
            .expectedCandidates(200)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("wafflestudio")
            .displayName("와플스튜디오 (서울대)")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.UNIV_CLUB)
            .url("https://github.com/wafflestudio")
            .config(Map.of("orgName", "wafflestudio"))
            .enabled(true)
            .priority(5)
            .description("서울대학교 개발 동아리")
            .tags(List.of("snu", "university", "elite"))
            .expectedCandidates(300)
            .build()
    );

    public static final List<CrawlSourceConfigEntry> TECH_GIANT_SOURCES = List.of(
        CrawlSourceConfigEntry.builder()
            .name("naver")
            .displayName("네이버")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.TECH_GIANT)
            .url("https://github.com/naver")
            .config(Map.of("orgName", "naver"))
            .enabled(true)
            .priority(20)
            .description("네이버 오픈소스")
            .tags(List.of("naver", "search", "portal"))
            .expectedCandidates(300)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("kakao")
            .displayName("카카오")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.TECH_GIANT)
            .url("https://github.com/kakao")
            .config(Map.of("orgName", "kakao"))
            .enabled(true)
            .priority(20)
            .description("카카오 오픈소스")
            .tags(List.of("kakao", "messaging", "fintech"))
            .expectedCandidates(200)
            .build()
    );

    public static final List<CrawlSourceConfigEntry> UNICORN_SOURCES = List.of(
        CrawlSourceConfigEntry.builder()
            .name("toss")
            .displayName("토스 (비바리퍼블리카)")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.UNICORN)
            .url("https://github.com/toss")
            .config(Map.of("orgName", "toss"))
            .enabled(true)
            .priority(15)
            .description("토스 오픈소스")
            .tags(List.of("toss", "fintech", "unicorn"))
            .expectedCandidates(150)
            .build(),
        CrawlSourceConfigEntry.builder()
            .name("woowabros")
            .displayName("우아한형제들")
            .type(SourceType.GITHUB_ORG)
            .category(SourceCategory.UNICORN)
            .url("https://github.com/woowabros")
            .config(Map.of("orgName", "woowabros"))
            .enabled(true)
            .priority(15)
            .description("배달의민족 운영사")
            .tags(List.of("woowahan", "delivery", "unicorn"))
            .expectedCandidates(150)
            .build()
    );

    public static List<CrawlSourceConfigEntry> getAllCrawlSources() {
        List<CrawlSourceConfigEntry> all = new ArrayList<>();
        all.addAll(BOOTCAMP_SOURCES);
        all.addAll(IT_CLUB_SOURCES);
        all.addAll(UNIVERSITY_CLUB_SOURCES);
        all.addAll(TECH_GIANT_SOURCES);
        all.addAll(UNICORN_SOURCES);
        return all;
    }

    public static List<CrawlSourceConfigEntry> getEnabledSources() {
        return getAllCrawlSources().stream()
            .filter(CrawlSourceConfigEntry::isEnabled)
            .toList();
    }
}
