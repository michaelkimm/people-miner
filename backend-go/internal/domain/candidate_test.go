package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestCandidate_NewCandidate(t *testing.T) {
	candidate := NewCandidate("testuser", 12345)

	assert.NotEmpty(t, candidate.ID)
	assert.Equal(t, "testuser", candidate.GithubUsername)
	assert.Equal(t, int64(12345), candidate.GithubID)
	assert.False(t, candidate.CreatedAt.IsZero())
	assert.False(t, candidate.UpdatedAt.IsZero())
}

func TestCandidate_AddSource(t *testing.T) {
	candidate := NewCandidate("testuser", 12345)

	source := &CandidateSource{
		SourceType: SourceTypeGithubOrg,
		SourceName: "test-org",
		SourceURL:  "https://github.com/test-org",
	}

	candidate.AddSource(source)

	assert.Len(t, candidate.Sources, 1)
	assert.Equal(t, candidate.ID, candidate.Sources[0].CandidateID)
	assert.NotEmpty(t, candidate.Sources[0].ID)
}

func TestCandidate_AddRepository(t *testing.T) {
	candidate := NewCandidate("testuser", 12345)

	repo := &Repository{
		Name:        "test-repo",
		FullName:    "testuser/test-repo",
		Description: "A test repository",
		Language:    "Go",
		StarCount:   100,
		ForkCount:   10,
	}

	candidate.AddRepository(repo)

	assert.Len(t, candidate.Repositories, 1)
	assert.Equal(t, candidate.ID, candidate.Repositories[0].CandidateID)
	assert.NotEmpty(t, candidate.Repositories[0].ID)
}

func TestCandidate_SetProfileInfo(t *testing.T) {
	candidate := NewCandidate("testuser", 12345)

	candidate.SetProfileInfo("Test User", "test@example.com", "Developer", "Tech Corp", "Seoul", "https://blog.test.com", "https://avatar.url")

	assert.Equal(t, "Test User", *candidate.Name)
	assert.Equal(t, "test@example.com", *candidate.Email)
	assert.Equal(t, "Developer", *candidate.Bio)
	assert.Equal(t, "Tech Corp", *candidate.Company)
	assert.Equal(t, "Seoul", *candidate.Location)
	assert.Equal(t, "https://blog.test.com", *candidate.Blog)
	assert.Equal(t, "https://avatar.url", *candidate.AvatarURL)
}

func TestCandidate_UpdateStats(t *testing.T) {
	candidate := NewCandidate("testuser", 12345)

	now := time.Now()
	candidate.UpdateStats(50, 100, 30, &now, true, 2, 6)

	assert.Equal(t, 50, candidate.PublicRepos)
	assert.Equal(t, 100, candidate.Followers)
	assert.Equal(t, 30, candidate.Following)
	assert.Equal(t, &now, candidate.LastActivityAt)
	assert.True(t, candidate.HasTilRepo)
	assert.Equal(t, 2, candidate.TilRepoCount)
	assert.Equal(t, 6, candidate.LongestProjectMonths)
}

func TestSourceType_String(t *testing.T) {
	assert.Equal(t, "GITHUB_ORG", SourceTypeGithubOrg.String())
	assert.Equal(t, "GITHUB_STARS", SourceTypeGithubStars.String())
	assert.Equal(t, "GITHUB_SEARCH", SourceTypeGithubSearch.String())
	assert.Equal(t, "OSS_CONTRIBUTOR", SourceTypeOSSContributor.String())
	assert.Equal(t, "MANUAL", SourceTypeManual.String())
}

func TestRepository_Validation(t *testing.T) {
	repo := &Repository{
		Name:      "test-repo",
		FullName:  "user/test-repo",
		StarCount: 100,
		ForkCount: 10,
	}

	assert.Equal(t, "test-repo", repo.Name)
	assert.Equal(t, "user/test-repo", repo.FullName)
	assert.Equal(t, 100, repo.StarCount)
	assert.Equal(t, 10, repo.ForkCount)
}

func TestCandidateSource_NewCandidateSource(t *testing.T) {
	source := NewCandidateSource(SourceTypeGithubOrg, "test-org", "https://github.com/test-org")

	assert.NotEmpty(t, source.ID)
	assert.Equal(t, SourceTypeGithubOrg, source.SourceType)
	assert.Equal(t, "test-org", source.SourceName)
	assert.Equal(t, "https://github.com/test-org", source.SourceURL)
}

func TestSolvedAcProfile_Creation(t *testing.T) {
	profile := &SolvedAcProfile{
		Handle:      "testhandle",
		Tier:        15,
		TierName:    "Gold V",
		Rating:      1500,
		SolvedCount: 200,
	}

	assert.Equal(t, "testhandle", profile.Handle)
	assert.Equal(t, 15, profile.Tier)
	assert.Equal(t, "Gold V", profile.TierName)
	assert.Equal(t, 1500, profile.Rating)
	assert.Equal(t, 200, profile.SolvedCount)
}

func TestOSSContribution_Creation(t *testing.T) {
	contrib := &OSSContribution{
		RepoFullName:       "kubernetes/kubernetes",
		RepoStars:          100000,
		ContributionType:   "code",
		ContributionCount:  5,
		IsSignificant:      true,
		SignificanceReason: "core feature",
	}

	assert.Equal(t, "kubernetes/kubernetes", contrib.RepoFullName)
	assert.Equal(t, 100000, contrib.RepoStars)
	assert.True(t, contrib.IsSignificant)
}

func TestRepoAnalysis_Creation(t *testing.T) {
	analysis := &RepoAnalysis{
		Languages:        map[string]int{"Go": 80, "Python": 20},
		HasTests:         true,
		HasCI:            true,
		HasDocumentation: true,
		CodeQualityScore: 85.5,
	}

	assert.Equal(t, 80, analysis.Languages["Go"])
	assert.True(t, analysis.HasTests)
	assert.True(t, analysis.HasCI)
	assert.Equal(t, 85.5, analysis.CodeQualityScore)
}
