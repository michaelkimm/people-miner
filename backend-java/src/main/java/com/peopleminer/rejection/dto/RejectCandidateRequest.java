package com.peopleminer.rejection.dto;

import com.peopleminer.domain.enums.RejectionReason;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RejectCandidateRequest {
    @NotNull
    private RejectionReason reason;

    private String notes;
}
