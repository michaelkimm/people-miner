package solvedac

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
)

// TierNames maps tier numbers to their names
var TierNames = []string{
	"Unrated",
	"Bronze V", "Bronze IV", "Bronze III", "Bronze II", "Bronze I",
	"Silver V", "Silver IV", "Silver III", "Silver II", "Silver I",
	"Gold V", "Gold IV", "Gold III", "Gold II", "Gold I",
	"Platinum V", "Platinum IV", "Platinum III", "Platinum II", "Platinum I",
	"Diamond V", "Diamond IV", "Diamond III", "Diamond II", "Diamond I",
	"Ruby V", "Ruby IV", "Ruby III", "Ruby II", "Ruby I",
	"Master",
}

// GetTierName returns the tier name for a given tier number
func GetTierName(tier int) string {
	if tier < 0 || tier >= len(TierNames) {
		return "Unknown"
	}
	return TierNames[tier]
}

// HandlePatterns for extracting solved.ac handles
var HandlePatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)solved\.ac/profile/(\w+)`),
	regexp.MustCompile(`(?i)solved\.ac/@?(\w+)`),
	regexp.MustCompile(`(?i)boj[\s:]+(\w+)`),
	regexp.MustCompile(`(?i)백준[\s:]+(\w+)`),
	regexp.MustCompile(`(?i)baekjoon[\s:]+(\w+)`),
	regexp.MustCompile(`(?i)solved\.ac[\s:]+(\w+)`),
	regexp.MustCompile(`(?i)acmicpc\.net/user/(\w+)`),
}

// ExtractSolvedAcHandle extracts a solved.ac handle from bio and blog
func ExtractSolvedAcHandle(bio, blog string) string {
	textToSearch := bio + " " + blog

	for _, pattern := range HandlePatterns {
		matches := pattern.FindStringSubmatch(textToSearch)
		if len(matches) > 1 {
			handle := strings.Replace(matches[1], "@", "", -1)
			return handle
		}
	}

	return ""
}

// SolvedAcUser represents a solved.ac user profile
type SolvedAcUser struct {
	Handle          string `json:"handle"`
	Bio             string `json:"bio,omitempty"`
	Tier            int    `json:"tier"`
	Rating          int    `json:"rating"`
	SolvedCount     int    `json:"solvedCount"`
	VoteCount       int    `json:"voteCount"`
	SolvedAcClass   int    `json:"class"`
	ClassDecoration string `json:"classDecoration,omitempty"`
	MaxStreak       int    `json:"maxStreak"`
	Rank            *int   `json:"rank,omitempty"`
}

// SolvedAcServiceConfig holds configuration for the service
type SolvedAcServiceConfig struct {
	BaseURL        string
	Timeout        time.Duration
	RateLimitDelay time.Duration
}

// DefaultSolvedAcServiceConfig returns default configuration
func DefaultSolvedAcServiceConfig() *SolvedAcServiceConfig {
	return &SolvedAcServiceConfig{
		BaseURL:        "https://solved.ac/api/v3",
		Timeout:        10 * time.Second,
		RateLimitDelay: 200 * time.Millisecond,
	}
}

// SyncResult holds the result of a sync operation
type SyncResult struct {
	Synced  int `json:"synced"`
	Failed  int `json:"failed"`
	Skipped int `json:"skipped"`
}

// RateLimiter implements simple rate limiting
type RateLimiter struct {
	mu          sync.Mutex
	lastRequest time.Time
	minInterval time.Duration
}

// NewRateLimiter creates a new RateLimiter
func NewRateLimiter(minInterval time.Duration) *RateLimiter {
	return &RateLimiter{
		minInterval: minInterval,
	}
}

// Wait waits for the rate limit
func (r *RateLimiter) Wait() {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(r.lastRequest)
	if elapsed < r.minInterval {
		time.Sleep(r.minInterval - elapsed)
	}
	r.lastRequest = time.Now()
}

// SolvedAcService provides solved.ac API operations
type SolvedAcService struct {
	config      *SolvedAcServiceConfig
	client      *http.Client
	rateLimiter *RateLimiter
}

// NewSolvedAcService creates a new SolvedAcService
func NewSolvedAcService(config *SolvedAcServiceConfig) *SolvedAcService {
	if config == nil {
		config = DefaultSolvedAcServiceConfig()
	}
	return &SolvedAcService{
		config: config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
		rateLimiter: NewRateLimiter(config.RateLimitDelay),
	}
}

// GetUserProfile retrieves a user profile from solved.ac
func (s *SolvedAcService) GetUserProfile(handle string) (*SolvedAcUser, error) {
	s.rateLimiter.Wait()

	url := fmt.Sprintf("%s/user/show?handle=%s", s.config.BaseURL, handle)

	resp, err := s.client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("solved.ac API error: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var user SolvedAcUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, err
	}

	return &user, nil
}
