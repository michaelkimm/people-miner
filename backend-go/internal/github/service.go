package github

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// GitHubUser represents a GitHub user
type GitHubUser struct {
	ID          int64  `json:"id"`
	Login       string `json:"login"`
	Name        string `json:"name,omitempty"`
	Email       string `json:"email,omitempty"`
	Bio         string `json:"bio,omitempty"`
	Company     string `json:"company,omitempty"`
	Location    string `json:"location,omitempty"`
	Blog        string `json:"blog,omitempty"`
	AvatarURL   string `json:"avatar_url,omitempty"`
	PublicRepos int    `json:"public_repos"`
	Followers   int    `json:"followers"`
	Following   int    `json:"following"`
}

// GitHubRepo represents a GitHub repository
type GitHubRepo struct {
	ID              int64     `json:"id"`
	Name            string    `json:"name"`
	FullName        string    `json:"full_name"`
	Description     string    `json:"description,omitempty"`
	Language        string    `json:"language,omitempty"`
	StargazersCount int       `json:"stargazers_count"`
	ForksCount      int       `json:"forks_count"`
	HTMLURL         string    `json:"html_url"`
	CreatedAt       time.Time `json:"created_at"`
	PushedAt        time.Time `json:"pushed_at"`
}

// GitHubOrgMember represents a member of a GitHub organization
type GitHubOrgMember struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

// GitHubServiceConfig holds configuration for the GitHub service
type GitHubServiceConfig struct {
	Token          string
	BaseURL        string
	Timeout        time.Duration
	RateLimitDelay time.Duration
}

// DefaultGitHubServiceConfig returns default configuration
func DefaultGitHubServiceConfig() *GitHubServiceConfig {
	return &GitHubServiceConfig{
		BaseURL:        "https://api.github.com",
		Timeout:        30 * time.Second,
		RateLimitDelay: 200 * time.Millisecond,
	}
}

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

// RateLimiter implements simple rate limiting
type RateLimiter struct {
	mu            sync.Mutex
	lastRequest   time.Time
	minInterval   time.Duration
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

// GitHubService provides GitHub API operations
type GitHubService struct {
	config     *GitHubServiceConfig
	client     *http.Client
	rateLimiter *RateLimiter
}

// NewGitHubService creates a new GitHubService
func NewGitHubService(config *GitHubServiceConfig) *GitHubService {
	if config == nil {
		config = DefaultGitHubServiceConfig()
	}
	return &GitHubService{
		config: config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
		rateLimiter: NewRateLimiter(config.RateLimitDelay),
	}
}

func (s *GitHubService) doRequest(url string) ([]byte, error) {
	s.rateLimiter.Wait()

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	if s.config.Token != "" {
		req.Header.Set("Authorization", "Bearer "+s.config.Token)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error: %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

// GetUser retrieves a GitHub user by username
func (s *GitHubService) GetUser(username string) (*GitHubUser, error) {
	url := fmt.Sprintf("%s/users/%s", s.config.BaseURL, username)
	data, err := s.doRequest(url)
	if err != nil {
		return nil, err
	}

	var user GitHubUser
	if err := json.Unmarshal(data, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserRepos retrieves repositories for a user
func (s *GitHubService) GetUserRepos(username string, limit int) ([]GitHubRepo, error) {
	url := fmt.Sprintf("%s/users/%s/repos?sort=pushed&per_page=%d", s.config.BaseURL, username, limit)
	data, err := s.doRequest(url)
	if err != nil {
		return nil, err
	}

	var repos []GitHubRepo
	if err := json.Unmarshal(data, &repos); err != nil {
		return nil, err
	}
	return repos, nil
}

// GetAllOrgMembers retrieves all members of an organization
func (s *GitHubService) GetAllOrgMembers(orgName string) ([]GitHubOrgMember, error) {
	var allMembers []GitHubOrgMember
	page := 1

	for {
		url := fmt.Sprintf("%s/orgs/%s/members?per_page=100&page=%d", s.config.BaseURL, orgName, page)
		data, err := s.doRequest(url)
		if err != nil {
			return nil, err
		}

		var members []GitHubOrgMember
		if err := json.Unmarshal(data, &members); err != nil {
			return nil, err
		}

		if len(members) == 0 {
			break
		}

		allMembers = append(allMembers, members...)
		page++
	}

	return allMembers, nil
}

// GetRepo retrieves a repository by full name
func (s *GitHubService) GetRepo(fullName string) (*GitHubRepo, error) {
	url := fmt.Sprintf("%s/repos/%s", s.config.BaseURL, fullName)
	data, err := s.doRequest(url)
	if err != nil {
		return nil, err
	}

	var repo GitHubRepo
	if err := json.Unmarshal(data, &repo); err != nil {
		return nil, err
	}
	return &repo, nil
}
