package com.peopleminer.candidate;

import com.peopleminer.config.TechStackConfig.TargetRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateSearchCriteria {
    private Integer page;
    private Integer limit;
    private String sortBy;
    private String order;
    private String search;
    private String source;
    private Double minScore;
    private Double maxScore;
    private Boolean excludeRejected;
    private Boolean autoExclude;
    private TargetRole role;
    private Boolean recentActivityOnly;
    private Integer activityMonths;
}
