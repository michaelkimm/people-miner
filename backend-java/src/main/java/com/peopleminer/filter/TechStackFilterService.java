package com.peopleminer.filter;

import com.peopleminer.config.TechStackConfig;
import com.peopleminer.config.TechStackConfig.RoleConfig;
import com.peopleminer.config.TechStackConfig.TargetRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TechStackFilterService {

    private final TargetRole targetRole;

    public TechStackFilterService(@Value("${app.target-role:all}") String role) {
        this.targetRole = validateRole(role);
        log.info("Tech stack filter initialized with target role: {}", this.targetRole);
    }

    private TargetRole validateRole(String role) {
        try {
            return TargetRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid TARGET_ROLE \"{}\", defaulting to \"ALL\"", role);
            return TargetRole.ALL;
        }
    }

    public TargetRole getTargetRole() {
        return targetRole;
    }

    public boolean matchesTargetRole(FilterContext context) {
        return matchesRole(context, targetRole);
    }

    public boolean matchesRole(FilterContext context, TargetRole role) {
        if (role == TargetRole.ALL) {
            return true;
        }

        RoleConfig config = TechStackConfig.TECH_STACK_CONFIG.get(role);
        List<String> languages = extractLanguages(context.getRepositories());
        String textContext = buildTextContext(context);

        if (hasExcludedKeywords(textContext, config.getExcludeKeywords())) {
            return false;
        }

        if (hasExcludedLanguagesOnly(languages, config.getExcludeLanguages(), config.getLanguages())) {
            return false;
        }

        if (hasTargetLanguages(languages, config.getLanguages(), textContext, role)) {
            return true;
        }

        return hasTargetKeywords(textContext, config.getKeywords());
    }

    private List<String> extractLanguages(List<FilterContext.RepoInfo> repositories) {
        if (repositories == null) return List.of();

        return repositories.stream()
            .map(FilterContext.RepoInfo::getLanguage)
            .filter(lang -> lang != null && !lang.isEmpty())
            .distinct()
            .collect(Collectors.toList());
    }

    private String buildTextContext(FilterContext context) {
        StringBuilder sb = new StringBuilder();

        if (context.getBio() != null) {
            sb.append(context.getBio()).append(" ");
        }
        if (context.getCompany() != null) {
            sb.append(context.getCompany()).append(" ");
        }
        if (context.getRepositories() != null) {
            for (FilterContext.RepoInfo repo : context.getRepositories()) {
                if (repo.getName() != null) sb.append(repo.getName()).append(" ");
                if (repo.getDescription() != null) sb.append(repo.getDescription()).append(" ");
            }
        }

        return sb.toString().toLowerCase();
    }

    private boolean hasExcludedKeywords(String textContext, List<String> excludeKeywords) {
        if (excludeKeywords == null) return false;
        return excludeKeywords.stream()
            .anyMatch(keyword -> textContext.contains(keyword.toLowerCase()));
    }

    private boolean hasExcludedLanguagesOnly(
            List<String> languages,
            List<String> excludeLanguages,
            List<String> targetLanguages
    ) {
        if (languages.isEmpty() || excludeLanguages == null) {
            return false;
        }

        Set<String> normalizedLanguages = languages.stream()
            .map(String::toLowerCase)
            .collect(Collectors.toSet());
        Set<String> normalizedExclude = excludeLanguages.stream()
            .map(String::toLowerCase)
            .collect(Collectors.toSet());
        Set<String> normalizedTarget = targetLanguages.stream()
            .map(String::toLowerCase)
            .collect(Collectors.toSet());

        return normalizedLanguages.stream()
            .allMatch(lang -> normalizedExclude.contains(lang) && !normalizedTarget.contains(lang));
    }

    private boolean hasTargetLanguages(
            List<String> languages,
            List<String> targetLanguages,
            String textContext,
            TargetRole role
    ) {
        Set<String> normalizedLanguages = languages.stream()
            .map(String::toLowerCase)
            .collect(Collectors.toSet());
        Set<String> normalizedTarget = targetLanguages.stream()
            .map(String::toLowerCase)
            .collect(Collectors.toSet());

        for (String lang : normalizedLanguages) {
            // Handle ambiguous languages
            if (TechStackConfig.AMBIGUOUS_LANGUAGES.stream()
                    .anyMatch(al -> al.equalsIgnoreCase(lang))) {
                if (role == TargetRole.BACKEND) {
                    boolean hasBackendContext = TechStackConfig.TECH_STACK_CONFIG.get(TargetRole.BACKEND)
                        .getKeywords().stream()
                        .anyMatch(kw -> textContext.contains(kw.toLowerCase()));
                    if (hasBackendContext) return true;
                } else if (role == TargetRole.FRONTEND) {
                    boolean hasFrontendContext = TechStackConfig.TECH_STACK_CONFIG.get(TargetRole.FRONTEND)
                        .getKeywords().stream()
                        .anyMatch(kw -> textContext.contains(kw.toLowerCase()));
                    if (hasFrontendContext) return true;
                } else if (role == TargetRole.FULLSTACK) {
                    return true;
                }
                continue;
            }

            // Handle Kotlin ambiguity
            if ("kotlin".equals(lang)) {
                boolean isAndroid = TechStackConfig.KOTLIN_ANDROID_KEYWORDS.stream()
                    .anyMatch(kw -> textContext.contains(kw.toLowerCase()));
                boolean isBackend = TechStackConfig.KOTLIN_BACKEND_KEYWORDS.stream()
                    .anyMatch(kw -> textContext.contains(kw.toLowerCase()));

                if (role == TargetRole.BACKEND && isBackend && !isAndroid) return true;
                if (role == TargetRole.MOBILE && isAndroid) return true;
                if (role == TargetRole.FULLSTACK && isBackend) return true;
                continue;
            }

            if (normalizedTarget.contains(lang)) {
                return true;
            }
        }

        return false;
    }

    private boolean hasTargetKeywords(String textContext, List<String> keywords) {
        if (keywords == null) return false;
        return keywords.stream()
            .anyMatch(keyword -> textContext.contains(keyword.toLowerCase()));
    }

    public boolean matchesRoleStrict(FilterContext context, TargetRole role) {
        if (role != TargetRole.BACKEND) {
            return matchesRole(context, role);
        }

        if (!matchesRole(context, role)) {
            return false;
        }

        BackendRatioAnalysis analysis = analyzeBackendRatio(context);
        if (!analysis.isPassesFilter()) {
            log.debug("Failed backend ratio filter: {} < {}",
                analysis.getBackendRatio(), TechStackConfig.MIN_BACKEND_LANGUAGE_RATIO);
            return false;
        }

        return true;
    }

    public BackendRatioAnalysis analyzeBackendRatio(FilterContext context) {
        RoleConfig backendConfig = TechStackConfig.TECH_STACK_CONFIG.get(TargetRole.BACKEND);
        RoleConfig frontendConfig = TechStackConfig.TECH_STACK_CONFIG.get(TargetRole.FRONTEND);

        int backendCount = 0;
        int frontendCount = 0;

        Set<String> backendLangs = backendConfig.getLanguages().stream()
            .map(String::toLowerCase)
            .collect(Collectors.toSet());
        Set<String> frontendLangs = frontendConfig.getLanguages().stream()
            .map(String::toLowerCase)
            .collect(Collectors.toSet());
        Set<String> ambiguous = TechStackConfig.AMBIGUOUS_LANGUAGES.stream()
            .map(String::toLowerCase)
            .collect(Collectors.toSet());

        for (FilterContext.RepoInfo repo : context.getRepositories()) {
            if (repo.getLanguage() == null) continue;
            String lang = repo.getLanguage().toLowerCase();

            if (ambiguous.contains(lang)) {
                String repoContext = ((repo.getName() != null ? repo.getName() : "") + " " +
                    (repo.getDescription() != null ? repo.getDescription() : "")).toLowerCase();

                boolean hasBackendContext = backendConfig.getKeywords().stream()
                    .anyMatch(kw -> repoContext.contains(kw.toLowerCase()));
                boolean hasFrontendContext = frontendConfig.getKeywords().stream()
                    .anyMatch(kw -> repoContext.contains(kw.toLowerCase()));

                if (hasBackendContext && !hasFrontendContext) backendCount++;
                else if (hasFrontendContext && !hasBackendContext) frontendCount++;
                continue;
            }

            if ("kotlin".equals(lang)) {
                String repoContext = ((repo.getName() != null ? repo.getName() : "") + " " +
                    (repo.getDescription() != null ? repo.getDescription() : "")).toLowerCase();

                boolean isAndroid = TechStackConfig.KOTLIN_ANDROID_KEYWORDS.stream()
                    .anyMatch(kw -> repoContext.contains(kw.toLowerCase()));
                boolean isBackend = TechStackConfig.KOTLIN_BACKEND_KEYWORDS.stream()
                    .anyMatch(kw -> repoContext.contains(kw.toLowerCase()));

                if (isBackend && !isAndroid) backendCount++;
                continue;
            }

            if (backendLangs.contains(lang)) backendCount++;
            else if (frontendLangs.contains(lang)) frontendCount++;
        }

        int total = backendCount + frontendCount;
        double backendRatio = total > 0 ? (double) backendCount / total : 0;

        return BackendRatioAnalysis.builder()
            .backendCount(backendCount)
            .frontendCount(frontendCount)
            .backendRatio(backendRatio)
            .passesFilter(backendRatio >= TechStackConfig.MIN_BACKEND_LANGUAGE_RATIO)
            .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FilterContext {
        private List<RepoInfo> repositories;
        private String bio;
        private String company;

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        @Builder
        public static class RepoInfo {
            private String language;
            private String name;
            private String description;
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BackendRatioAnalysis {
        private int backendCount;
        private int frontendCount;
        private double backendRatio;
        private boolean passesFilter;
    }
}
