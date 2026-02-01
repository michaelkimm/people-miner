package solvedac

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSolvedAcUser_Fields(t *testing.T) {
	user := &SolvedAcUser{
		Handle:          "testuser",
		Bio:             "Developer",
		Tier:            15,
		Rating:          1500,
		SolvedCount:     200,
		VoteCount:       50,
		SolvedAcClass:   5,
		ClassDecoration: "gold",
		MaxStreak:       30,
		Rank:            intPtr(1000),
	}

	assert.Equal(t, "testuser", user.Handle)
	assert.Equal(t, 15, user.Tier)
	assert.Equal(t, 1500, user.Rating)
	assert.Equal(t, 200, user.SolvedCount)
}

func TestGetTierName(t *testing.T) {
	tests := []struct {
		tier     int
		expected string
	}{
		{0, "Unrated"},
		{1, "Bronze V"},
		{5, "Bronze I"},
		{6, "Silver V"},
		{10, "Silver I"},
		{11, "Gold V"},
		{15, "Gold I"},
		{16, "Platinum V"},
		{20, "Platinum I"},
		{21, "Diamond V"},
		{25, "Diamond I"},
		{26, "Ruby V"},
		{30, "Ruby I"},
		{31, "Master"},
		{-1, "Unknown"},
		{100, "Unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := GetTierName(tt.tier)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestExtractSolvedAcHandle(t *testing.T) {
	tests := []struct {
		name     string
		bio      string
		blog     string
		expected string
	}{
		{
			name:     "solved.ac profile URL",
			bio:      "Check my profile at solved.ac/profile/testuser",
			blog:     "",
			expected: "testuser",
		},
		{
			name:     "solved.ac @ format",
			bio:      "Find me at solved.ac/@myhandle",
			blog:     "",
			expected: "myhandle",
		},
		{
			name:     "BOJ format",
			bio:      "BOJ: myhandle123",
			blog:     "",
			expected: "myhandle123",
		},
		{
			name:     "Korean 백준 format",
			bio:      "백준: korean_handle",
			blog:     "",
			expected: "korean_handle",
		},
		{
			name:     "baekjoon format",
			bio:      "baekjoon: user456",
			blog:     "",
			expected: "user456",
		},
		{
			name:     "acmicpc.net URL",
			bio:      "",
			blog:     "https://acmicpc.net/user/webuser",
			expected: "webuser",
		},
		{
			name:     "no handle found",
			bio:      "Just a regular developer",
			blog:     "https://myblog.com",
			expected: "",
		},
		{
			name:     "empty inputs",
			bio:      "",
			blog:     "",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ExtractSolvedAcHandle(tt.bio, tt.blog)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSolvedAcServiceConfig_Defaults(t *testing.T) {
	config := DefaultSolvedAcServiceConfig()

	assert.NotEmpty(t, config.BaseURL)
	assert.Greater(t, config.Timeout.Seconds(), 0.0)
	assert.Greater(t, config.RateLimitDelay.Milliseconds(), int64(0))
}

func TestSyncResult_Fields(t *testing.T) {
	result := &SyncResult{
		Synced:  10,
		Failed:  2,
		Skipped: 5,
	}

	assert.Equal(t, 10, result.Synced)
	assert.Equal(t, 2, result.Failed)
	assert.Equal(t, 5, result.Skipped)
}

func intPtr(i int) *int {
	return &i
}
