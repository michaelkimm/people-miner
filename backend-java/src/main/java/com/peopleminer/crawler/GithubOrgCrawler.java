package com.peopleminer.crawler;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.CandidateSource;
import com.peopleminer.domain.entity.Repository;
import com.peopleminer.domain.enums.SourceType;
import com.peopleminer.domain.repository.CandidateRepository;
import com.peopleminer.domain.repository.CandidateSourceRepository;
import com.peopleminer.filter.TechStackFilterService;
import com.peopleminer.filter.TechStackFilterService.FilterContext;
import com.peopleminer.github.GithubService;
import com.peopleminer.github.GithubService.GitHubOrgMember;
import com.peopleminer.github.GithubService.GitHubRepo;
import com.peopleminer.github.GithubService.GitHubUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class GithubOrgCrawler {

    private final CandidateRepository candidateRepository;
    private final CandidateSourceRepository candidateSourceRepository;
    private final GithubService githubService;
    private final TechStackFilterService techStackFilterService;

    private static final List<Pattern> TIL_REPO_PATTERNS = List.of(
        Pattern.compile("^til$", Pattern.CASE_INSENSITIVE),
        Pattern.compile("^today-i-learned$", Pattern.CASE_INSENSITIVE),
        Pattern.compile("^TIL_.*", Pattern.CASE_INSENSITIVE),
        Pattern.compile(".*_TIL$", Pattern.CASE_INSENSITIVE),
        Pattern.compile("^learning.*", Pattern.CASE_INSENSITIVE)
    );

    private static final List<Pattern> TIL_FALSE_POSITIVE_PATTERNS = List.of(
        Pattern.compile(".*util.*", Pattern.CASE_INSENSITIVE),
        Pattern.compile(".*until.*", Pattern.CASE_INSENSITIVE)
    );

    @Transactional
    public CrawlResult crawl(String orgName, String sourceName) {
        log.info("Crawling GitHub org: {}", orgName);

        List<GitHubOrgMember> members = githubService.getAllOrgMembers(orgName);
        log.info("Found {} members in {}", members.size(), orgName);

        int newCount = 0;

        for (GitHubOrgMember member : members) {
            if (candidateRepository.existsByGithubUsername(member.getLogin())) {
                Candidate existing = candidateRepository.findByGithubUsername(member.getLogin()).orElse(null);
                if (existing != null) {
                    ensureSourceExists(existing.getId(), sourceName, orgName);
                }
                continue;
            }

            GitHubUser userDetails = githubService.getUser(member.getLogin());
            if (userDetails == null) {
                continue;
            }

            List<GitHubRepo> repos = githubService.getUserRepos(member.getLogin(), 10);

            FilterContext filterContext = buildFilterContext(repos, userDetails);
            if (!techStackFilterService.matchesTargetRole(filterContext)) {
                log.debug("Skipped {}: does not match target role \"{}\"",
                    member.getLogin(), techStackFilterService.getTargetRole());
                continue;
            }

            LocalDateTime lastActivityAt = repos.stream()
                .filter(r -> r.getPushedAt() != null)
                .map(GitHubRepo::getPushedAt)
                .max(Comparator.naturalOrder())
                .orElse(null);

            TilInfo tilInfo = detectTilRepos(repos);
            int longestProjectMonths = calculateLongestProjectMonths(repos);

            Candidate candidate = Candidate.builder()
                .githubUsername(userDetails.getLogin())
                .githubId(userDetails.getId())
                .name(userDetails.getName())
                .email(userDetails.getEmail())
                .bio(userDetails.getBio())
                .company(userDetails.getCompany())
                .location(userDetails.getLocation())
                .blog(userDetails.getBlog())
                .avatarUrl(userDetails.getAvatarUrl())
                .publicRepos(userDetails.getPublicRepos())
                .followers(userDetails.getFollowers())
                .following(userDetails.getFollowing())
                .lastActivityAt(lastActivityAt)
                .hasTilRepo(tilInfo.hasTil)
                .tilRepoCount(tilInfo.count)
                .longestProjectMonths(longestProjectMonths)
                .build();

            // Add source
            CandidateSource source = CandidateSource.builder()
                .sourceType(SourceType.GITHUB_ORG)
                .sourceName(sourceName)
                .sourceUrl("https://github.com/" + orgName)
                .build();
            candidate.addSource(source);

            // Add repositories
            for (GitHubRepo repo : repos) {
                Repository repository = Repository.builder()
                    .name(repo.getName())
                    .fullName(repo.getFullName())
                    .description(repo.getDescription())
                    .language(repo.getLanguage())
                    .starCount(repo.getStargazersCount())
                    .forkCount(repo.getForksCount())
                    .url(repo.getHtmlUrl())
                    .pushedAt(repo.getPushedAt())
                    .build();
                candidate.addRepository(repository);
            }

            candidateRepository.save(candidate);
            log.debug("Created candidate: {}", candidate.getGithubUsername());
            newCount++;
        }

        log.info("Completed crawling {}: {} found, {} new", orgName, members.size(), newCount);
        return CrawlResult.builder()
            .found(members.size())
            .newCount(newCount)
            .build();
    }

    private FilterContext buildFilterContext(List<GitHubRepo> repos, GitHubUser user) {
        return FilterContext.builder()
            .repositories(repos.stream()
                .map(r -> FilterContext.RepoInfo.builder()
                    .language(r.getLanguage())
                    .name(r.getName())
                    .description(r.getDescription())
                    .build())
                .toList())
            .bio(user.getBio())
            .company(user.getCompany())
            .build();
    }

    private TilInfo detectTilRepos(List<GitHubRepo> repos) {
        int count = (int) repos.stream()
            .filter(repo -> {
                String name = repo.getName();
                if (TIL_FALSE_POSITIVE_PATTERNS.stream().anyMatch(p -> p.matcher(name).matches())) {
                    return false;
                }
                return TIL_REPO_PATTERNS.stream().anyMatch(p -> p.matcher(name).matches());
            })
            .count();

        return new TilInfo(count > 0, count);
    }

    private int calculateLongestProjectMonths(List<GitHubRepo> repos) {
        int longest = 0;

        for (GitHubRepo repo : repos) {
            if (repo.getCreatedAt() == null || repo.getPushedAt() == null) continue;

            long days = java.time.Duration.between(
                repo.getCreatedAt(),
                repo.getPushedAt()
            ).toDays();

            int months = (int) (days / 30);
            if (months > longest) longest = months;
        }

        return longest;
    }

    private void ensureSourceExists(String candidateId, String sourceName, String orgName) {
        if (!candidateSourceRepository.existsByCandidateIdAndSourceTypeAndSourceName(
                candidateId, SourceType.GITHUB_ORG, sourceName)) {
            Candidate candidate = candidateRepository.findById(candidateId).orElse(null);
            if (candidate != null) {
                CandidateSource source = CandidateSource.builder()
                    .sourceType(SourceType.GITHUB_ORG)
                    .sourceName(sourceName)
                    .sourceUrl("https://github.com/" + orgName)
                    .build();
                candidate.addSource(source);
                candidateRepository.save(candidate);
            }
        }
    }

    private record TilInfo(boolean hasTil, int count) {}
}
