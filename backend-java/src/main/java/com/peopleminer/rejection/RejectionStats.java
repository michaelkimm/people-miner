package com.peopleminer.rejection;

import com.peopleminer.domain.enums.RejectionReason;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RejectionStats {
    private long totalRejected;
    private long totalShortlisted;
    private long activeRules;
    private List<ReasonCount> reasonDistribution;
    private long recentRejections;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReasonCount {
        private RejectionReason reason;
        private long count;
        private int percentage;
    }
}
