package scoring

import (
	"testing"

	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/stretchr/testify/assert"
)

func TestActivityStrategy_Name(t *testing.T) {
	strategy := NewActivityStrategy()
	assert.Equal(t, "activity", strategy.Name())
}

func TestActivityStrategy_DefaultWeight(t *testing.T) {
	strategy := NewActivityStrategy()
	assert.Equal(t, 0.25, strategy.DefaultWeight())
}

func TestActivityStrategy_Calculate(t *testing.T) {
	strategy := NewActivityStrategy()

	candidate := createTestCandidate()
	candidate.PublicRepos = 50
	candidate.LongestProjectMonths = 12
	candidate.HasTilRepo = true
	candidate.TilRepoCount = 2

	result := strategy.Calculate(candidate)

	assert.Greater(t, result.Score, 0.0)
	assert.LessOrEqual(t, result.Score, 100.0)
	assert.NotEmpty(t, result.Details)
}

func TestActivityStrategy_Calculate_EmptyCandidate(t *testing.T) {
	strategy := NewActivityStrategy()

	candidate := &domain.Candidate{}

	result := strategy.Calculate(candidate)

	assert.GreaterOrEqual(t, result.Score, 0.0)
}

func TestInfluenceStrategy_Name(t *testing.T) {
	strategy := NewInfluenceStrategy()
	assert.Equal(t, "influence", strategy.Name())
}

func TestInfluenceStrategy_DefaultWeight(t *testing.T) {
	strategy := NewInfluenceStrategy()
	assert.Equal(t, 0.2, strategy.DefaultWeight())
}

func TestInfluenceStrategy_Calculate(t *testing.T) {
	strategy := NewInfluenceStrategy()

	candidate := createTestCandidate()
	candidate.Followers = 500
	candidate.Repositories = []domain.Repository{
		{Name: "repo1", StarCount: 100},
		{Name: "repo2", StarCount: 50},
	}

	result := strategy.Calculate(candidate)

	assert.Greater(t, result.Score, 0.0)
	assert.LessOrEqual(t, result.Score, 100.0)
}

func TestInfluenceStrategy_Calculate_HighFollowers(t *testing.T) {
	strategy := NewInfluenceStrategy()

	candidate := createTestCandidate()
	candidate.Followers = 10000
	candidate.Repositories = []domain.Repository{
		{Name: "popular-repo", StarCount: 5000},
	}

	result := strategy.Calculate(candidate)

	assert.GreaterOrEqual(t, result.Score, 80.0)
}

func TestCodeQualityStrategy_Name(t *testing.T) {
	strategy := NewCodeQualityStrategy()
	assert.Equal(t, "code_quality", strategy.Name())
}

func TestCodeQualityStrategy_DefaultWeight(t *testing.T) {
	strategy := NewCodeQualityStrategy()
	assert.Equal(t, 0.25, strategy.DefaultWeight())
}

func TestCodeQualityStrategy_Calculate(t *testing.T) {
	strategy := NewCodeQualityStrategy()

	candidate := createTestCandidate()
	candidate.Repositories = []domain.Repository{
		{
			Name:     "well-maintained",
			Analysis: &domain.RepoAnalysis{HasTests: true, HasCI: true, HasDocumentation: true, CodeQualityScore: 85},
		},
	}

	result := strategy.Calculate(candidate)

	assert.Greater(t, result.Score, 0.0)
}

func TestCodeQualityStrategy_Calculate_NoAnalysis(t *testing.T) {
	strategy := NewCodeQualityStrategy()

	candidate := createTestCandidate()
	candidate.Repositories = []domain.Repository{
		{Name: "repo1"},
		{Name: "repo2"},
	}

	result := strategy.Calculate(candidate)

	assert.GreaterOrEqual(t, result.Score, 0.0)
}

func TestProblemSolvingStrategy_Name(t *testing.T) {
	strategy := NewProblemSolvingStrategy()
	assert.Equal(t, "problem_solving", strategy.Name())
}

func TestProblemSolvingStrategy_DefaultWeight(t *testing.T) {
	strategy := NewProblemSolvingStrategy()
	assert.Equal(t, 0.15, strategy.DefaultWeight())
}

func TestProblemSolvingStrategy_Calculate(t *testing.T) {
	strategy := NewProblemSolvingStrategy()

	candidate := createTestCandidate()
	candidate.OSSContributions = []domain.OSSContribution{
		{RepoFullName: "kubernetes/kubernetes", RepoStars: 100000, IsSignificant: true},
		{RepoFullName: "golang/go", RepoStars: 50000, IsSignificant: false},
	}

	result := strategy.Calculate(candidate)

	assert.Greater(t, result.Score, 0.0)
}

func TestProblemSolvingStrategy_Calculate_NoContributions(t *testing.T) {
	strategy := NewProblemSolvingStrategy()

	candidate := createTestCandidate()

	result := strategy.Calculate(candidate)

	assert.GreaterOrEqual(t, result.Score, 0.0)
}

func TestSolvedAcStrategy_Name(t *testing.T) {
	strategy := NewSolvedAcStrategy()
	assert.Equal(t, "solved_ac", strategy.Name())
}

func TestSolvedAcStrategy_DefaultWeight(t *testing.T) {
	strategy := NewSolvedAcStrategy()
	assert.Equal(t, 0.15, strategy.DefaultWeight())
}

func TestSolvedAcStrategy_Calculate_WithProfile(t *testing.T) {
	strategy := NewSolvedAcStrategy()

	candidate := createTestCandidate()
	candidate.SolvedAcProfile = &domain.SolvedAcProfile{
		Handle:      "testuser",
		Tier:        20, // Platinum I
		Rating:      1800,
		SolvedCount: 500,
		MaxStreak:   30,
	}

	result := strategy.Calculate(candidate)

	assert.Greater(t, result.Score, 0.0)
}

func TestSolvedAcStrategy_Calculate_NoProfile(t *testing.T) {
	strategy := NewSolvedAcStrategy()

	candidate := createTestCandidate()

	result := strategy.Calculate(candidate)

	assert.Equal(t, 0.0, result.Score)
}

func TestSolvedAcStrategy_Calculate_HighTier(t *testing.T) {
	strategy := NewSolvedAcStrategy()

	candidate := createTestCandidate()
	candidate.SolvedAcProfile = &domain.SolvedAcProfile{
		Handle:      "master",
		Tier:        31, // Master
		Rating:      3000,
		SolvedCount: 2000,
		MaxStreak:   365,
	}

	result := strategy.Calculate(candidate)

	assert.GreaterOrEqual(t, result.Score, 90.0)
}

func TestScoreResult_Validation(t *testing.T) {
	result := &ScoreResult{
		Score:   85.5,
		Details: map[string]interface{}{"test": "value"},
	}

	assert.Equal(t, 85.5, result.Score)
	assert.Equal(t, "value", result.Details["test"])
}

// Helper function
func createTestCandidate() *domain.Candidate {
	return domain.NewCandidate("testuser", 12345)
}
