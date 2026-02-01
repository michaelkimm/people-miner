package com.peopleminer.config;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Configuration
public class TechStackConfig {

    public enum TargetRole {
        BACKEND, FRONTEND, MOBILE, FULLSTACK, ALL
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RoleConfig {
        private List<String> languages;
        private List<String> excludeLanguages;
        private List<String> keywords;
        private List<String> excludeKeywords;
    }

    public static final Map<TargetRole, RoleConfig> TECH_STACK_CONFIG = Map.of(
        TargetRole.BACKEND, RoleConfig.builder()
            .languages(List.of(
                "Java", "Go", "Python", "Rust", "C#", "Ruby", "PHP", "Scala",
                "Elixir", "C", "C++", "Clojure", "Haskell", "Erlang"
            ))
            .excludeLanguages(List.of(
                "Swift", "Objective-C", "Dart", "CSS", "SCSS", "Sass", "Less", "HTML"
            ))
            .keywords(List.of(
                "backend", "server", "api", "devops", "database", "microservice",
                "infrastructure", "cloud", "aws", "gcp", "azure", "kubernetes",
                "docker", "spring", "django", "flask", "fastapi", "nestjs",
                "express", "grpc", "graphql server", "sql", "nosql", "redis",
                "kafka", "rabbitmq", "data engineer", "sre", "platform"
            ))
            .excludeKeywords(List.of(
                "ios developer", "ios engineer", "android developer", "android engineer",
                "mobile developer", "mobile engineer", "flutter developer",
                "react native developer", "swiftui", "uikit", "jetpack compose",
                "frontend developer", "frontend engineer", "front-end developer",
                "front-end engineer", "ui developer", "ui engineer", "react developer",
                "vue developer", "angular developer", "web designer", "css specialist"
            ))
            .build(),

        TargetRole.FRONTEND, RoleConfig.builder()
            .languages(List.of("TypeScript", "JavaScript", "HTML", "CSS", "SCSS", "Sass"))
            .excludeLanguages(List.of("Swift", "Objective-C", "Dart"))
            .keywords(List.of(
                "frontend", "front-end", "web developer", "react", "vue", "angular",
                "svelte", "next.js", "nuxt", "ui engineer", "ux engineer", "web",
                "css", "tailwind", "webpack", "vite"
            ))
            .excludeKeywords(List.of(
                "ios", "android", "mobile", "flutter", "react native", "swift", "kotlin"
            ))
            .build(),

        TargetRole.MOBILE, RoleConfig.builder()
            .languages(List.of("Swift", "Kotlin", "Dart", "Objective-C", "Java"))
            .excludeLanguages(List.of())
            .keywords(List.of(
                "ios", "android", "mobile", "flutter", "react native", "swiftui",
                "uikit", "jetpack compose", "kotlin multiplatform", "kmp", "app developer"
            ))
            .excludeKeywords(List.of())
            .build(),

        TargetRole.FULLSTACK, RoleConfig.builder()
            .languages(List.of(
                "Java", "Go", "Python", "Rust", "C#", "Ruby", "PHP", "Scala",
                "Elixir", "C", "C++", "TypeScript", "JavaScript"
            ))
            .excludeLanguages(List.of("Swift", "Objective-C", "Dart"))
            .keywords(List.of(
                "fullstack", "full-stack", "full stack", "backend", "frontend", "web developer"
            ))
            .excludeKeywords(List.of(
                "ios developer", "android developer", "mobile developer", "flutter"
            ))
            .build(),

        TargetRole.ALL, RoleConfig.builder()
            .languages(List.of())
            .excludeLanguages(List.of())
            .keywords(List.of())
            .excludeKeywords(List.of())
            .build()
    );

    public static final Set<String> AMBIGUOUS_LANGUAGES = Set.of("TypeScript", "JavaScript");

    public static final List<String> KOTLIN_ANDROID_KEYWORDS = List.of(
        "android", "jetpack", "compose", "mobile", "app"
    );

    public static final List<String> KOTLIN_BACKEND_KEYWORDS = List.of(
        "ktor", "spring", "backend", "server", "api"
    );

    public static final double MIN_BACKEND_LANGUAGE_RATIO = 0.5;
}
