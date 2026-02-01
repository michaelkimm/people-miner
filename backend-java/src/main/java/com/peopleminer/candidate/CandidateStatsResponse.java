package com.peopleminer.candidate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateStatsResponse {
    private long total;
    private long withScore;
    private long recentlyAdded;
    private List<TopCandidate> topCandidates;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopCandidate {
        private String id;
        private String githubUsername;
        private String name;
        private String avatarUrl;
        private Double totalScore;
        private String company;
    }
}
