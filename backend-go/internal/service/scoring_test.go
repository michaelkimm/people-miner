package service

import (
	"testing"

	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/peopleminer/backend-go/internal/scoring"
	"github.com/stretchr/testify/assert"
)

func TestScoringService_NewScoringService(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	service := NewScoringService(registry)

	assert.NotNil(t, service)
}

func TestScoringService_CalculateScore(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	service := NewScoringService(registry)

	candidate := domain.NewCandidate("testuser", 12345)
	candidate.PublicRepos = 50
	candidate.Followers = 100

	result := service.CalculateScore(candidate)

	assert.NotNil(t, result)
	assert.GreaterOrEqual(t, result.TotalScore, 0.0)
	assert.LessOrEqual(t, result.TotalScore, 100.0)
	assert.NotEmpty(t, result.StrategyScores)
}

func TestScoringService_CalculateScore_AllStrategies(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	service := NewScoringService(registry)

	candidate := domain.NewCandidate("testuser", 12345)
	candidate.PublicRepos = 50
	candidate.Followers = 100
	candidate.Repositories = []domain.Repository{
		{Name: "repo1", StarCount: 100},
	}
	candidate.SolvedAcProfile = &domain.SolvedAcProfile{
		Handle:      "testhandle",
		Tier:        15,
		SolvedCount: 200,
	}

	result := service.CalculateScore(candidate)

	assert.Len(t, result.StrategyScores, 5)
	assert.Contains(t, result.StrategyScores, "activity")
	assert.Contains(t, result.StrategyScores, "influence")
	assert.Contains(t, result.StrategyScores, "code_quality")
	assert.Contains(t, result.StrategyScores, "problem_solving")
	assert.Contains(t, result.StrategyScores, "solved_ac")
}

func TestScoringService_CalculateScore_WeightedTotal(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	service := NewScoringService(registry)

	// Candidate with high influence only
	candidate := domain.NewCandidate("testuser", 12345)
	candidate.Followers = 10000
	candidate.Repositories = []domain.Repository{
		{Name: "popular-repo", StarCount: 5000},
	}

	result := service.CalculateScore(candidate)

	influenceScore := result.StrategyScores["influence"]
	assert.NotNil(t, influenceScore)
	assert.Greater(t, influenceScore.Score, 50.0)
}

func TestScoringService_GetStrategies(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	service := NewScoringService(registry)

	strategies := service.GetStrategies()

	assert.Len(t, strategies, 5)
}

func TestScoringService_GetEnabledStrategies(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	registry.Disable("activity")
	service := NewScoringService(registry)

	strategies := service.GetEnabledStrategies()

	assert.Len(t, strategies, 4)
}

func TestScoringService_UpdateStrategyConfig(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	service := NewScoringService(registry)

	err := service.UpdateStrategyConfig("activity", &scoring.StrategyConfigUpdate{
		Enabled: boolPtr(false),
		Weight:  float64Ptr(0.3),
	})

	assert.NoError(t, err)

	config := service.GetStrategyConfig("activity")
	assert.False(t, config.Enabled)
	assert.Equal(t, 0.3, config.Weight)
}

func TestScoringService_UpdateStrategyConfig_NotFound(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	service := NewScoringService(registry)

	err := service.UpdateStrategyConfig("nonexistent", &scoring.StrategyConfigUpdate{})

	assert.Error(t, err)
}

func TestScoringService_SetWeight(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	service := NewScoringService(registry)

	err := service.SetWeight("activity", 0.5)

	assert.NoError(t, err)

	config := service.GetStrategyConfig("activity")
	assert.Equal(t, 0.5, config.Weight)
}

func TestScoringService_SetWeight_InvalidRange(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	service := NewScoringService(registry)

	err := service.SetWeight("activity", 1.5)

	assert.Error(t, err)
}

func TestScoringService_EnableStrategy(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	registry.Disable("activity")
	service := NewScoringService(registry)

	service.EnableStrategy("activity")

	config := service.GetStrategyConfig("activity")
	assert.True(t, config.Enabled)
}

func TestScoringService_DisableStrategy(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	service := NewScoringService(registry)

	service.DisableStrategy("activity")

	config := service.GetStrategyConfig("activity")
	assert.False(t, config.Enabled)
}

func TestScoringService_GetNormalizedWeights(t *testing.T) {
	registry := scoring.NewStrategyRegistry()
	service := NewScoringService(registry)

	weights := service.GetNormalizedWeights()

	var total float64
	for _, weight := range weights {
		total += weight
	}
	assert.InDelta(t, 1.0, total, 0.0001)
}

func TestScoreCalculationResult_Fields(t *testing.T) {
	result := &ScoreCalculationResult{
		TotalScore:     85.5,
		StrategyScores: make(map[string]*scoring.ScoreResult),
		NormalizedWeights: map[string]float64{
			"activity": 0.25,
		},
	}

	assert.Equal(t, 85.5, result.TotalScore)
	assert.Equal(t, 0.25, result.NormalizedWeights["activity"])
}

// Helper functions
func boolPtr(b bool) *bool {
	return &b
}

func float64Ptr(f float64) *float64 {
	return &f
}
