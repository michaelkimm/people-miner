package github

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestGitHubUser_Fields(t *testing.T) {
	user := &GitHubUser{
		ID:          12345,
		Login:       "testuser",
		Name:        "Test User",
		Email:       "test@example.com",
		Bio:         "Developer",
		Company:     "Tech Corp",
		Location:    "Seoul",
		Blog:        "https://blog.test.com",
		AvatarURL:   "https://avatar.url",
		PublicRepos: 50,
		Followers:   100,
		Following:   50,
	}

	assert.Equal(t, int64(12345), user.ID)
	assert.Equal(t, "testuser", user.Login)
	assert.Equal(t, "Test User", user.Name)
}

func TestGitHubRepo_Fields(t *testing.T) {
	now := time.Now()
	repo := &GitHubRepo{
		ID:              1,
		Name:            "test-repo",
		FullName:        "user/test-repo",
		Description:     "A test repository",
		Language:        "Go",
		StargazersCount: 100,
		ForksCount:      10,
		HTMLURL:         "https://github.com/user/test-repo",
		CreatedAt:       now,
		PushedAt:        now,
	}

	assert.Equal(t, "test-repo", repo.Name)
	assert.Equal(t, "Go", repo.Language)
	assert.Equal(t, 100, repo.StargazersCount)
}

func TestGitHubOrgMember_Fields(t *testing.T) {
	member := &GitHubOrgMember{
		ID:        12345,
		Login:     "testuser",
		AvatarURL: "https://avatar.url",
	}

	assert.Equal(t, int64(12345), member.ID)
	assert.Equal(t, "testuser", member.Login)
}

func TestGitHubServiceConfig_Defaults(t *testing.T) {
	config := DefaultGitHubServiceConfig()

	assert.NotEmpty(t, config.BaseURL)
	assert.Greater(t, config.Timeout, time.Duration(0))
	assert.Greater(t, config.RateLimitDelay, time.Duration(0))
}

func TestGitHubServiceConfig_Custom(t *testing.T) {
	config := &GitHubServiceConfig{
		Token:          "test-token",
		BaseURL:        "https://api.github.com",
		Timeout:        30 * time.Second,
		RateLimitDelay: 100 * time.Millisecond,
	}

	assert.Equal(t, "test-token", config.Token)
	assert.Equal(t, 30*time.Second, config.Timeout)
}

func TestTierNames(t *testing.T) {
	assert.Equal(t, "Unrated", TierNames[0])
	assert.Equal(t, "Bronze V", TierNames[1])
	assert.Equal(t, "Silver I", TierNames[10])
	assert.Equal(t, "Gold I", TierNames[15])
	assert.Equal(t, "Platinum I", TierNames[20])
	assert.Equal(t, "Diamond I", TierNames[25])
	assert.Equal(t, "Ruby I", TierNames[30])
	assert.Equal(t, "Master", TierNames[31])
}

func TestGetTierName(t *testing.T) {
	tests := []struct {
		tier     int
		expected string
	}{
		{0, "Unrated"},
		{1, "Bronze V"},
		{15, "Gold I"},
		{31, "Master"},
		{-1, "Unknown"},
		{100, "Unknown"},
	}

	for _, tt := range tests {
		result := GetTierName(tt.tier)
		assert.Equal(t, tt.expected, result)
	}
}

func TestRateLimiter_Wait(t *testing.T) {
	limiter := NewRateLimiter(50 * time.Millisecond)

	start := time.Now()
	limiter.Wait()
	elapsed := time.Since(start)

	assert.Less(t, elapsed, 10*time.Millisecond) // First call should be immediate

	start = time.Now()
	limiter.Wait()
	elapsed = time.Since(start)

	assert.GreaterOrEqual(t, elapsed, 40*time.Millisecond) // Second call should wait
}
