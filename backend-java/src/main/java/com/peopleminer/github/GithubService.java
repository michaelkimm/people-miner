package com.peopleminer.github;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.kohsuke.github.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
@Slf4j
public class GithubService {

    private final GitHub github;
    private final RateLimiterService rateLimiter;

    public GithubService(
            @Value("${github.token:}") String token,
            RateLimiterService rateLimiter
    ) throws IOException {
        this.rateLimiter = rateLimiter;
        if (token != null && !token.isEmpty()) {
            this.github = new GitHubBuilder().withOAuthToken(token).build();
            log.info("GitHub service initialized with authentication");
        } else {
            this.github = GitHub.connectAnonymously();
            log.warn("GitHub service initialized anonymously - rate limits will be very low");
        }
    }

    private void waitForRateLimit() throws InterruptedException {
        RateLimiterService.RateLimitCheck check = rateLimiter.canMakeRequest();
        if (!check.isAllowed() && check.getWaitMs() != null) {
            log.warn("Rate limited. Waiting {}ms", check.getWaitMs());
            Thread.sleep(check.getWaitMs());
        }
    }

    public GitHubUser getUser(String username) {
        try {
            waitForRateLimit();
            rateLimiter.decrementRemaining();

            GHUser user = github.getUser(username);
            return GitHubUser.builder()
                .login(user.getLogin())
                .id((int) user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .bio(user.getBio())
                .company(user.getCompany())
                .location(user.getLocation())
                .blog(user.getBlog())
                .avatarUrl(user.getAvatarUrl())
                .publicRepos(user.getPublicRepoCount())
                .followers(user.getFollowersCount())
                .following(user.getFollowingCount())
                .build();
        } catch (GHFileNotFoundException e) {
            return null;
        } catch (Exception e) {
            log.error("Failed to fetch user {}: {}", username, e.getMessage());
            throw new RuntimeException("Failed to fetch user: " + username, e);
        }
    }

    public List<GitHubRepo> getUserRepos(String username, int limit) {
        try {
            waitForRateLimit();
            rateLimiter.decrementRemaining();

            GHUser user = github.getUser(username);
            List<GitHubRepo> repos = new ArrayList<>();

            for (GHRepository repo : user.listRepositories().withPageSize(limit)) {
                if (repos.size() >= limit) break;

                repos.add(GitHubRepo.builder()
                    .name(repo.getName())
                    .fullName(repo.getFullName())
                    .description(repo.getDescription())
                    .language(repo.getLanguage())
                    .stargazersCount(repo.getStargazersCount())
                    .forksCount(repo.getForksCount())
                    .htmlUrl(repo.getHtmlUrl().toString())
                    .pushedAt(toLocalDateTime(repo.getPushedAt()))
                    .createdAt(toLocalDateTime(repo.getCreatedAt()))
                    .build());
            }

            return repos;
        } catch (Exception e) {
            log.error("Failed to fetch repos for {}: {}", username, e.getMessage());
            throw new RuntimeException("Failed to fetch repos for: " + username, e);
        }
    }

    public List<GitHubOrgMember> getAllOrgMembers(String orgName) {
        try {
            List<GitHubOrgMember> allMembers = new ArrayList<>();
            GHOrganization org = github.getOrganization(orgName);

            for (GHUser member : org.listPublicMembers()) {
                waitForRateLimit();
                rateLimiter.decrementRemaining();

                allMembers.add(GitHubOrgMember.builder()
                    .login(member.getLogin())
                    .id((int) member.getId())
                    .avatarUrl(member.getAvatarUrl())
                    .build());
            }

            log.info("Found {} members in org {}", allMembers.size(), orgName);
            return allMembers;
        } catch (Exception e) {
            log.error("Failed to fetch members for org {}: {}", orgName, e.getMessage());
            throw new RuntimeException("Failed to fetch org members: " + orgName, e);
        }
    }

    public RateLimitStatus getRateLimitStatus() {
        try {
            GHRateLimit rateLimit = github.getRateLimit();
            GHRateLimit.Record core = rateLimit.getCore();

            return RateLimitStatus.builder()
                .remaining(core.getRemaining())
                .limit(core.getLimit())
                .resetAt(toLocalDateTime(core.getResetDate()))
                .build();
        } catch (Exception e) {
            log.error("Failed to get rate limit status: {}", e.getMessage());
            throw new RuntimeException("Failed to get rate limit status", e);
        }
    }

    private LocalDateTime toLocalDateTime(Date date) {
        if (date == null) return null;
        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GitHubUser {
        private String login;
        private int id;
        private String name;
        private String email;
        private String bio;
        private String company;
        private String location;
        private String blog;
        private String avatarUrl;
        private int publicRepos;
        private int followers;
        private int following;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GitHubRepo {
        private String name;
        private String fullName;
        private String description;
        private String language;
        private int stargazersCount;
        private int forksCount;
        private String htmlUrl;
        private LocalDateTime pushedAt;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GitHubOrgMember {
        private String login;
        private int id;
        private String avatarUrl;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RateLimitStatus {
        private int remaining;
        private int limit;
        private LocalDateTime resetAt;
    }
}
