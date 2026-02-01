package com.peopleminer.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class EventsGateway {

    private final SimpMessagingTemplate messagingTemplate;

    public EventsGateway(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void sendProgress(JobProgress progress) {
        messagingTemplate.convertAndSend("/topic/crawl-progress", progress);
    }

    public void sendCandidateUpdate(CandidateUpdate update) {
        messagingTemplate.convertAndSend("/topic/candidate-update", update);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class JobProgress {
        private String jobId;
        private String source;
        private String status; // "processing", "completed", "error", "finished", "scored", "scoring"
        private String message;
        private Integer found;
        private Integer newCount;
        private String error;
        private String candidateId;
        private Double score;
        private Integer scored;
        private Integer failed;
        private Double progress;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CandidateUpdate {
        private String id;
        private String githubUsername;
    }
}
