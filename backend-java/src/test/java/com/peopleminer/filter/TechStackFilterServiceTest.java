package com.peopleminer.filter;

import com.peopleminer.config.TechStackConfig.TargetRole;
import com.peopleminer.filter.TechStackFilterService.FilterContext;
import com.peopleminer.filter.TechStackFilterService.FilterContext.RepoInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TechStackFilterServiceTest {

    private TechStackFilterService filterService;

    @BeforeEach
    void setUp() {
        filterService = new TechStackFilterService("all");
    }

    @Nested
    @DisplayName("Role Matching")
    class RoleMatching {

        @Test
        @DisplayName("ALL role should always match")
        void allRoleAlwaysMatches() {
            FilterContext context = createContext(List.of("Java"), "Developer", null);
            assertThat(filterService.matchesRole(context, TargetRole.ALL)).isTrue();
        }

        @Test
        @DisplayName("Backend role should match Java developer")
        void backendRoleMatchesJavaDeveloper() {
            FilterContext context = createContext(List.of("Java"), "Backend developer at Company", null);
            assertThat(filterService.matchesRole(context, TargetRole.BACKEND)).isTrue();
        }

        @Test
        @DisplayName("Backend role should match Go developer")
        void backendRoleMatchesGoDeveloper() {
            FilterContext context = createContext(List.of("Go"), "Server engineer", null);
            assertThat(filterService.matchesRole(context, TargetRole.BACKEND)).isTrue();
        }

        @Test
        @DisplayName("Backend role should match Python developer")
        void backendRoleMatchesPythonDeveloper() {
            FilterContext context = createContext(List.of("Python"), "Django backend developer", null);
            assertThat(filterService.matchesRole(context, TargetRole.BACKEND)).isTrue();
        }

        @Test
        @DisplayName("Frontend role should match TypeScript React developer")
        void frontendRoleMatchesReactDeveloper() {
            FilterContext context = createContext(List.of("TypeScript"), "React frontend engineer", null);
            assertThat(filterService.matchesRole(context, TargetRole.FRONTEND)).isTrue();
        }

        @Test
        @DisplayName("Frontend role should match Vue developer")
        void frontendRoleMatchesVueDeveloper() {
            FilterContext context = createContext(List.of("JavaScript"), "Vue.js web developer", null);
            assertThat(filterService.matchesRole(context, TargetRole.FRONTEND)).isTrue();
        }

        @Test
        @DisplayName("Mobile role should match Swift iOS developer")
        void mobileRoleMatchesSwiftDeveloper() {
            FilterContext context = createContext(List.of("Swift"), "iOS app developer", null);
            assertThat(filterService.matchesRole(context, TargetRole.MOBILE)).isTrue();
        }

        @Test
        @DisplayName("Mobile role should match Kotlin Android developer")
        void mobileRoleMatchesKotlinAndroidDeveloper() {
            FilterContext context = createContext(List.of("Kotlin"), "Android mobile developer", null);
            assertThat(filterService.matchesRole(context, TargetRole.MOBILE)).isTrue();
        }

        @Test
        @DisplayName("Mobile role should match Flutter developer")
        void mobileRoleMatchesFlutterDeveloper() {
            FilterContext context = createContext(List.of("Dart"), "Flutter mobile app developer", null);
            assertThat(filterService.matchesRole(context, TargetRole.MOBILE)).isTrue();
        }
    }

    @Nested
    @DisplayName("Exclusion Rules")
    class ExclusionRules {

        @Test
        @DisplayName("Backend role should not match iOS developer")
        void backendRoleShouldNotMatchIOSDeveloper() {
            FilterContext context = createContext(List.of("Swift"), "iOS developer at Company", null);
            assertThat(filterService.matchesRole(context, TargetRole.BACKEND)).isFalse();
        }

        @Test
        @DisplayName("Backend role should not match frontend developer keyword")
        void backendRoleShouldNotMatchFrontendKeyword() {
            FilterContext context = createContext(List.of("JavaScript"), "Frontend developer specializing in React", null);
            assertThat(filterService.matchesRole(context, TargetRole.BACKEND)).isFalse();
        }

        @Test
        @DisplayName("Frontend role should not match mobile developer")
        void frontendRoleShouldNotMatchMobileDeveloper() {
            FilterContext context = createContext(List.of("TypeScript"), "React Native mobile developer", null);
            assertThat(filterService.matchesRole(context, TargetRole.FRONTEND)).isFalse();
        }
    }

    @Nested
    @DisplayName("Ambiguous Languages")
    class AmbiguousLanguages {

        @Test
        @DisplayName("TypeScript should match backend with backend keywords")
        void typeScriptMatchesBackendWithKeywords() {
            FilterContext context = createContext(
                List.of("TypeScript"),
                "NestJS backend developer building APIs",
                null
            );
            assertThat(filterService.matchesRole(context, TargetRole.BACKEND)).isTrue();
        }

        @Test
        @DisplayName("TypeScript should match frontend with frontend keywords")
        void typeScriptMatchesFrontendWithKeywords() {
            FilterContext context = createContext(
                List.of("TypeScript"),
                "React frontend developer building UIs",
                null
            );
            assertThat(filterService.matchesRole(context, TargetRole.FRONTEND)).isTrue();
        }

        @Test
        @DisplayName("TypeScript should always match fullstack")
        void typeScriptMatchesFullstack() {
            FilterContext context = createContext(List.of("TypeScript"), "Developer", null);
            assertThat(filterService.matchesRole(context, TargetRole.FULLSTACK)).isTrue();
        }

        @Test
        @DisplayName("Kotlin with backend keywords should match backend")
        void kotlinWithBackendKeywordsMatchesBackend() {
            FilterContext context = createContext(
                List.of("Kotlin"),
                "Kotlin backend developer using Spring Boot",
                null
            );
            assertThat(filterService.matchesRole(context, TargetRole.BACKEND)).isTrue();
        }

        @Test
        @DisplayName("Kotlin with Android keywords should match mobile")
        void kotlinWithAndroidKeywordsMatchesMobile() {
            FilterContext context = createContext(
                List.of("Kotlin"),
                "Android developer using Jetpack Compose",
                null
            );
            assertThat(filterService.matchesRole(context, TargetRole.MOBILE)).isTrue();
        }

        @Test
        @DisplayName("Kotlin with Android keywords should not match backend")
        void kotlinWithAndroidKeywordsShouldNotMatchBackend() {
            FilterContext context = createContext(
                List.of("Kotlin"),
                "Android mobile app developer",
                null
            );
            assertThat(filterService.matchesRole(context, TargetRole.BACKEND)).isFalse();
        }
    }

    @Nested
    @DisplayName("Strict Backend Matching")
    class StrictBackendMatching {

        @Test
        @DisplayName("Should pass with majority backend languages")
        void shouldPassWithMajorityBackendLanguages() {
            FilterContext context = createContextWithRepos(List.of(
                RepoInfo.builder().language("Java").name("backend-service").description("Spring boot API").build(),
                RepoInfo.builder().language("Go").name("microservice").description("Go microservice").build(),
                RepoInfo.builder().language("Python").name("data-pipeline").description("Data processing").build(),
                RepoInfo.builder().language("TypeScript").name("utils").description("Utility scripts").build()
            ), "Backend engineer", null);

            assertThat(filterService.matchesRoleStrict(context, TargetRole.BACKEND)).isTrue();
        }

        @Test
        @DisplayName("Should fail with majority frontend languages")
        void shouldFailWithMajorityFrontendLanguages() {
            FilterContext context = createContextWithRepos(List.of(
                RepoInfo.builder().language("JavaScript").name("react-app").description("React frontend").build(),
                RepoInfo.builder().language("TypeScript").name("vue-app").description("Vue frontend").build(),
                RepoInfo.builder().language("CSS").name("styles").description("CSS library").build(),
                RepoInfo.builder().language("Java").name("backend").description("Spring backend").build()
            ), "Developer", null);

            assertThat(filterService.matchesRoleStrict(context, TargetRole.BACKEND)).isFalse();
        }
    }

    @Nested
    @DisplayName("Backend Ratio Analysis")
    class BackendRatioAnalysis {

        @Test
        @DisplayName("Should calculate correct backend ratio")
        void shouldCalculateCorrectBackendRatio() {
            FilterContext context = createContextWithRepos(List.of(
                RepoInfo.builder().language("Java").name("api").description("REST API").build(),
                RepoInfo.builder().language("Go").name("server").description("Go server").build(),
                RepoInfo.builder().language("JavaScript").name("react").description("React frontend app").build()
            ), null, null);

            var analysis = filterService.analyzeBackendRatio(context);

            assertThat(analysis.getBackendCount()).isEqualTo(2);
            assertThat(analysis.getFrontendCount()).isEqualTo(1);
            assertThat(analysis.getBackendRatio()).isGreaterThan(0.5);
            assertThat(analysis.isPassesFilter()).isTrue();
        }

        @Test
        @DisplayName("Should handle empty repositories")
        void shouldHandleEmptyRepositories() {
            FilterContext context = createContext(List.of(), "Developer", null);

            var analysis = filterService.analyzeBackendRatio(context);

            assertThat(analysis.getBackendCount()).isEqualTo(0);
            assertThat(analysis.getFrontendCount()).isEqualTo(0);
            assertThat(analysis.getBackendRatio()).isEqualTo(0);
            assertThat(analysis.isPassesFilter()).isFalse();
        }
    }

    @Test
    @DisplayName("getTargetRole should return configured role")
    void getTargetRoleShouldReturnConfiguredRole() {
        TechStackFilterService backendService = new TechStackFilterService("backend");
        assertThat(backendService.getTargetRole()).isEqualTo(TargetRole.BACKEND);
    }

    @Test
    @DisplayName("Invalid role should default to ALL")
    void invalidRoleShouldDefaultToAll() {
        TechStackFilterService invalidService = new TechStackFilterService("invalid");
        assertThat(invalidService.getTargetRole()).isEqualTo(TargetRole.ALL);
    }

    // Helper methods
    private FilterContext createContext(List<String> languages, String bio, String company) {
        List<RepoInfo> repos = languages.stream()
            .map(lang -> RepoInfo.builder().language(lang).name("repo").description("Description").build())
            .toList();

        return FilterContext.builder()
            .repositories(repos)
            .bio(bio)
            .company(company)
            .build();
    }

    private FilterContext createContextWithRepos(List<RepoInfo> repos, String bio, String company) {
        return FilterContext.builder()
            .repositories(repos)
            .bio(bio)
            .company(company)
            .build();
    }
}
