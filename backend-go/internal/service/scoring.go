package service

import (
	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/peopleminer/backend-go/internal/scoring"
)

// ScoreCalculationResult holds the result of score calculation
type ScoreCalculationResult struct {
	TotalScore        float64                           `json:"totalScore"`
	StrategyScores    map[string]*scoring.ScoreResult   `json:"strategyScores"`
	NormalizedWeights map[string]float64                `json:"normalizedWeights"`
}

// ScoringService provides scoring operations
type ScoringService struct {
	registry *scoring.StrategyRegistry
}

// NewScoringService creates a new ScoringService
func NewScoringService(registry *scoring.StrategyRegistry) *ScoringService {
	return &ScoringService{
		registry: registry,
	}
}

// CalculateScore calculates scores for a candidate
func (s *ScoringService) CalculateScore(candidate *domain.Candidate) *ScoreCalculationResult {
	weights := s.registry.GetNormalizedWeights()
	strategyScores := make(map[string]*scoring.ScoreResult)
	var totalScore float64

	for _, swc := range s.registry.GetEnabledStrategies() {
		result := swc.Strategy.Calculate(candidate)
		strategyScores[swc.Strategy.Name()] = result

		weight := weights[swc.Strategy.Name()]
		totalScore += result.Score * weight
	}

	return &ScoreCalculationResult{
		TotalScore:        totalScore,
		StrategyScores:    strategyScores,
		NormalizedWeights: weights,
	}
}

// GetStrategies returns all strategies
func (s *ScoringService) GetStrategies() []scoring.StrategyWithConfig {
	return s.registry.GetAllStrategies()
}

// GetEnabledStrategies returns enabled strategies
func (s *ScoringService) GetEnabledStrategies() []scoring.StrategyWithConfig {
	return s.registry.GetEnabledStrategies()
}

// GetStrategyConfig returns configuration for a strategy
func (s *ScoringService) GetStrategyConfig(name string) *scoring.StrategyConfig {
	return s.registry.GetConfig(name)
}

// UpdateStrategyConfig updates strategy configuration
func (s *ScoringService) UpdateStrategyConfig(name string, updates *scoring.StrategyConfigUpdate) error {
	return s.registry.UpdateConfig(name, updates)
}

// SetWeight sets the weight for a strategy
func (s *ScoringService) SetWeight(name string, weight float64) error {
	return s.registry.SetWeight(name, weight)
}

// EnableStrategy enables a strategy
func (s *ScoringService) EnableStrategy(name string) {
	s.registry.Enable(name)
}

// DisableStrategy disables a strategy
func (s *ScoringService) DisableStrategy(name string) {
	s.registry.Disable(name)
}

// GetNormalizedWeights returns normalized weights
func (s *ScoringService) GetNormalizedWeights() map[string]float64 {
	return s.registry.GetNormalizedWeights()
}
