package com.peopleminer.candidate;

import com.peopleminer.domain.entity.Candidate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateListResponse {
    private List<Candidate> data;
    private Meta meta;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Meta {
        private long total;
        private int page;
        private int limit;
        private int totalPages;
    }
}
