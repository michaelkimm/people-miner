package com.peopleminer.solvedac;

import com.peopleminer.domain.entity.Candidate;
import com.peopleminer.domain.entity.SolvedAcProfile;
import com.peopleminer.domain.repository.CandidateRepository;
import com.peopleminer.domain.repository.SolvedAcProfileRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class SolvedAcService {

    private static final String API_BASE = "https://solved.ac/api/v3";
    private static final String[] TIER_NAMES = {
        "Unrated",
        "Bronze V", "Bronze IV", "Bronze III", "Bronze II", "Bronze I",
        "Silver V", "Silver IV", "Silver III", "Silver II", "Silver I",
        "Gold V", "Gold IV", "Gold III", "Gold II", "Gold I",
        "Platinum V", "Platinum IV", "Platinum III", "Platinum II", "Platinum I",
        "Diamond V", "Diamond IV", "Diamond III", "Diamond II", "Diamond I",
        "Ruby V", "Ruby IV", "Ruby III", "Ruby II", "Ruby I",
        "Master"
    };

    private static final List<Pattern> HANDLE_PATTERNS = List.of(
        Pattern.compile("solved\\.ac/profile/(\\w+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("solved\\.ac/@?(\\w+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("boj[\\s:]+(\\w+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("백준[\\s:]+(\\w+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("baekjoon[\\s:]+(\\w+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("solved\\.ac[\\s:]+(\\w+)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("acmicpc\\.net/user/(\\w+)", Pattern.CASE_INSENSITIVE)
    );

    private final CandidateRepository candidateRepository;
    private final SolvedAcProfileRepository solvedAcProfileRepository;
    private final WebClient webClient;

    private long lastRequestTime = 0;
    private static final long MIN_REQUEST_INTERVAL_MS = 200;

    public SolvedAcService(
            CandidateRepository candidateRepository,
            SolvedAcProfileRepository solvedAcProfileRepository
    ) {
        this.candidateRepository = candidateRepository;
        this.solvedAcProfileRepository = solvedAcProfileRepository;
        this.webClient = WebClient.builder()
            .baseUrl(API_BASE)
            .build();
    }

    private void waitForRateLimit() throws InterruptedException {
        long now = System.currentTimeMillis();
        long elapsed = now - lastRequestTime;
        if (elapsed < MIN_REQUEST_INTERVAL_MS) {
            Thread.sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
        }
        lastRequestTime = System.currentTimeMillis();
    }

    public SolvedAcUser getUserProfile(String handle) {
        try {
            waitForRateLimit();

            return webClient.get()
                .uri("/user/show?handle={handle}", handle)
                .retrieve()
                .bodyToMono(SolvedAcUser.class)
                .timeout(Duration.ofSeconds(10))
                .onErrorResume(e -> {
                    log.warn("Failed to get solved.ac profile for {}: {}", handle, e.getMessage());
                    return Mono.empty();
                })
                .block();
        } catch (Exception e) {
            log.warn("Failed to get solved.ac profile for {}: {}", handle, e.getMessage());
            return null;
        }
    }

    public String getTierName(int tier) {
        if (tier < 0 || tier >= TIER_NAMES.length) {
            return "Unknown";
        }
        return TIER_NAMES[tier];
    }

    public String extractSolvedAcHandle(String bio, String blog) {
        String textToSearch = (bio != null ? bio : "") + " " + (blog != null ? blog : "");

        for (Pattern pattern : HANDLE_PATTERNS) {
            Matcher matcher = pattern.matcher(textToSearch);
            if (matcher.find()) {
                String handle = matcher.group(1);
                return handle.replace("@", "");
            }
        }

        return null;
    }

    @Transactional
    public boolean fetchAndSaveProfile(String candidateId, String handle) {
        SolvedAcUser user = getUserProfile(handle);
        if (user == null) {
            return false;
        }

        Map<String, Integer> tagStats = new HashMap<>();
        // Tag stats would be fetched separately if needed

        Candidate candidate = candidateRepository.findById(candidateId).orElse(null);
        if (candidate == null) {
            return false;
        }

        SolvedAcProfile profile = solvedAcProfileRepository.findByCandidateId(candidateId)
            .orElse(SolvedAcProfile.builder().build());

        profile.setCandidate(candidate);
        profile.setHandle(user.getHandle());
        profile.setTier(user.getTier());
        profile.setTierName(getTierName(user.getTier()));
        profile.setRating(user.getRating());
        profile.setSolvedCount(user.getSolvedCount());
        profile.setVoteCount(user.getVoteCount());
        profile.setClassLevel(user.getSolvedAcClass());
        profile.setClassDecoration("none".equals(user.getClassDecoration()) ? null : user.getClassDecoration());
        profile.setMaxStreak(user.getMaxStreak());
        profile.setRank(user.getRank());
        profile.setTagStats(tagStats);

        solvedAcProfileRepository.save(profile);

        log.info("Saved solved.ac profile for {}: {} ({} solved)",
            handle, getTierName(user.getTier()), user.getSolvedCount());

        return true;
    }

    @Transactional
    public boolean syncCandidateSolvedAc(String candidateId) {
        Candidate candidate = candidateRepository.findById(candidateId).orElse(null);
        if (candidate == null) {
            return false;
        }

        String handle = extractSolvedAcHandle(candidate.getBio(), candidate.getBlog());

        if (handle == null) {
            SolvedAcUser user = getUserProfile(candidate.getGithubUsername());
            if (user != null) {
                handle = candidate.getGithubUsername();
            }
        }

        if (handle == null) {
            log.debug("No solved.ac handle found for candidate {}", candidateId);
            return false;
        }

        return fetchAndSaveProfile(candidateId, handle);
    }

    @Transactional
    public SyncResult syncAllCandidates(boolean force, int limit) {
        List<Candidate> candidates = force
            ? candidateRepository.findAll(PageRequest.of(0, limit)).getContent()
            : candidateRepository.findCandidatesWithoutSolvedAcProfile(PageRequest.of(0, limit));

        int synced = 0;
        int failed = 0;
        int skipped = 0;

        for (Candidate candidate : candidates) {
            try {
                boolean success = syncCandidateSolvedAc(candidate.getId());
                if (success) {
                    synced++;
                    log.info("[{}/{}] Synced: {}", synced, candidates.size(), candidate.getGithubUsername());
                } else {
                    skipped++;
                }
            } catch (Exception e) {
                failed++;
                log.error("Failed to sync {}: {}", candidate.getGithubUsername(), e.getMessage());
            }
        }

        log.info("Sync complete: {} synced, {} skipped, {} failed", synced, skipped, failed);
        return SyncResult.builder()
            .synced(synced)
            .failed(failed)
            .skipped(skipped)
            .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SolvedAcUser {
        private String handle;
        private String bio;
        private int tier;
        private int rating;
        private int solvedCount;
        private int voteCount;
        private int solvedAcClass;
        private String classDecoration;
        private int maxStreak;
        private Integer rank;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SyncResult {
        private int synced;
        private int failed;
        private int skipped;
    }
}
