package com.peopleminer.github;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class RateLimiterService {

    private static final String RATE_LIMIT_KEY = "github:rate_limit";
    private static final int BUFFER_SECONDS = 2;
    private static final int MIN_REMAINING_THRESHOLD = 100;

    private final RedisTemplate<String, Object> redisTemplate;

    public RateLimiterService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public RateLimitState getState() {
        Map<Object, Object> data = redisTemplate.opsForHash().entries(RATE_LIMIT_KEY);

        if (data == null || data.isEmpty()) {
            return RateLimitState.builder()
                .remaining(5000)
                .limit(5000)
                .resetAt(System.currentTimeMillis() / 1000 + 3600)
                .build();
        }

        return RateLimitState.builder()
            .remaining(parseIntSafe(data.get("remaining"), 5000))
            .limit(parseIntSafe(data.get("limit"), 5000))
            .resetAt(parseLongSafe(data.get("resetAt"), System.currentTimeMillis() / 1000 + 3600))
            .build();
    }

    private int parseIntSafe(Object value, int defaultValue) {
        if (value == null) return defaultValue;
        try {
            if (value instanceof Number) return ((Number) value).intValue();
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private long parseLongSafe(Object value, long defaultValue) {
        if (value == null) return defaultValue;
        try {
            if (value instanceof Number) return ((Number) value).longValue();
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public void updateFromHeaders(Map<String, String> headers) {
        String remaining = headers.get("x-ratelimit-remaining");
        String limit = headers.get("x-ratelimit-limit");
        String resetAt = headers.get("x-ratelimit-reset");

        if (remaining != null) {
            redisTemplate.opsForHash().put(RATE_LIMIT_KEY, "remaining", remaining);
            int rem = Integer.parseInt(remaining);
            if (rem <= MIN_REMAINING_THRESHOLD && rem > 0) {
                log.warn("Rate limit low: {} remaining", rem);
            } else if (rem == 0) {
                log.warn("Rate limit exhausted. Resets at {}", resetAt);
            }
        }
        if (limit != null) {
            redisTemplate.opsForHash().put(RATE_LIMIT_KEY, "limit", limit);
        }
        if (resetAt != null) {
            redisTemplate.opsForHash().put(RATE_LIMIT_KEY, "resetAt", resetAt);
        }
    }

    public RateLimitCheck canMakeRequest() {
        RateLimitState state = getState();
        long now = System.currentTimeMillis() / 1000;

        if (now >= state.getResetAt()) {
            redisTemplate.opsForHash().put(RATE_LIMIT_KEY, "remaining", String.valueOf(state.getLimit()));
            redisTemplate.opsForHash().put(RATE_LIMIT_KEY, "resetAt", String.valueOf(now + 3600));
            return RateLimitCheck.builder().allowed(true).build();
        }

        if (state.getRemaining() <= 0) {
            long waitMs = (state.getResetAt() - now + BUFFER_SECONDS) * 1000;
            return RateLimitCheck.builder().allowed(false).waitMs(waitMs).build();
        }

        return RateLimitCheck.builder().allowed(true).build();
    }

    public void decrementRemaining() {
        redisTemplate.opsForHash().increment(RATE_LIMIT_KEY, "remaining", -1);
    }

    public int getRemainingRequests() {
        return getState().getRemaining();
    }

    public RateLimitStatusResponse getStatus() {
        RateLimitState state = getState();
        long now = System.currentTimeMillis() / 1000;

        return RateLimitStatusResponse.builder()
            .remaining(state.getRemaining())
            .limit(state.getLimit())
            .resetAt(LocalDateTime.ofEpochSecond(state.getResetAt(), 0, ZoneOffset.UTC))
            .secondsUntilReset(Math.max(0, state.getResetAt() - now))
            .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RateLimitState {
        private int remaining;
        private int limit;
        private long resetAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RateLimitCheck {
        private boolean allowed;
        private Long waitMs;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RateLimitStatusResponse {
        private int remaining;
        private int limit;
        private LocalDateTime resetAt;
        private long secondsUntilReset;
    }
}
