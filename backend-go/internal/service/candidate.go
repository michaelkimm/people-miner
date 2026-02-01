package service

import (
	"context"
	"errors"

	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/peopleminer/backend-go/internal/scoring"
)

// Common errors
var (
	ErrNotFound     = errors.New("resource not found")
	ErrInvalidInput = errors.New("invalid input")
)

// FindAllParams represents parameters for finding candidates
type FindAllParams struct {
	Offset  int
	Limit   int
	SortBy  string
	SortDir string
	Filters map[string]interface{}
}

// CandidateRepository defines the interface for candidate persistence
type CandidateRepository interface {
	Create(ctx context.Context, candidate *domain.Candidate) error
	Update(ctx context.Context, candidate *domain.Candidate) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (*domain.Candidate, error)
	FindByGithubUsername(ctx context.Context, username string) (*domain.Candidate, error)
	ExistsByGithubUsername(ctx context.Context, username string) (bool, error)
	FindAll(ctx context.Context, params *FindAllParams) ([]*domain.Candidate, int64, error)
	FindWithoutSolvedAcProfile(ctx context.Context, limit int) ([]*domain.Candidate, error)
}

// ListParams represents pagination and sorting parameters
type ListParams struct {
	Page    int
	Limit   int
	SortBy  string
	SortDir string
	Filters map[string]interface{}
}

// Validate validates and sets defaults for list params
func (p *ListParams) Validate() {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 {
		p.Limit = 20
	}
	if p.Limit > 100 {
		p.Limit = 100
	}
}

// Offset calculates the offset based on page and limit
func (p *ListParams) Offset() int {
	return (p.Page - 1) * p.Limit
}

// CandidateService provides business logic for candidates
type CandidateService struct {
	repo     CandidateRepository
	registry *scoring.StrategyRegistry
}

// NewCandidateService creates a new CandidateService
func NewCandidateService(repo CandidateRepository, registry *scoring.StrategyRegistry) *CandidateService {
	return &CandidateService{
		repo:     repo,
		registry: registry,
	}
}

// GetByID retrieves a candidate by ID
func (s *CandidateService) GetByID(ctx context.Context, id string) (*domain.Candidate, error) {
	return s.repo.FindByID(ctx, id)
}

// GetByGithubUsername retrieves a candidate by GitHub username
func (s *CandidateService) GetByGithubUsername(ctx context.Context, username string) (*domain.Candidate, error) {
	return s.repo.FindByGithubUsername(ctx, username)
}

// Create creates a new candidate
func (s *CandidateService) Create(ctx context.Context, candidate *domain.Candidate) error {
	return s.repo.Create(ctx, candidate)
}

// Update updates an existing candidate
func (s *CandidateService) Update(ctx context.Context, candidate *domain.Candidate) error {
	return s.repo.Update(ctx, candidate)
}

// Delete deletes a candidate by ID
func (s *CandidateService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// List retrieves candidates with pagination
func (s *CandidateService) List(ctx context.Context, params *ListParams) ([]*domain.Candidate, int64, error) {
	params.Validate()

	findParams := &FindAllParams{
		Offset:  params.Offset(),
		Limit:   params.Limit,
		SortBy:  params.SortBy,
		SortDir: params.SortDir,
		Filters: params.Filters,
	}

	return s.repo.FindAll(ctx, findParams)
}

// ExistsByUsername checks if a candidate exists by GitHub username
func (s *CandidateService) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	return s.repo.ExistsByGithubUsername(ctx, username)
}

// CalculateScores calculates scores for a candidate using all enabled strategies
func (s *CandidateService) CalculateScores(candidate *domain.Candidate) map[string]*scoring.ScoreResult {
	if s.registry == nil {
		return nil
	}

	results := make(map[string]*scoring.ScoreResult)
	weights := s.registry.GetNormalizedWeights()

	for _, swc := range s.registry.GetEnabledStrategies() {
		result := swc.Strategy.Calculate(candidate)
		result.Details["weight"] = weights[swc.Strategy.Name()]
		results[swc.Strategy.Name()] = result
	}

	return results
}

// CalculateTotalScore calculates the weighted total score for a candidate
func (s *CandidateService) CalculateTotalScore(candidate *domain.Candidate) float64 {
	if s.registry == nil {
		return 0
	}

	var totalScore float64
	weights := s.registry.GetNormalizedWeights()

	for _, swc := range s.registry.GetEnabledStrategies() {
		result := swc.Strategy.Calculate(candidate)
		weight := weights[swc.Strategy.Name()]
		totalScore += result.Score * weight
	}

	return totalScore
}

// CandidateWithScore wraps a candidate with its calculated scores
type CandidateWithScore struct {
	Candidate   *domain.Candidate             `json:"candidate"`
	TotalScore  float64                       `json:"totalScore"`
	ScoreDetail map[string]*scoring.ScoreResult `json:"scoreDetail,omitempty"`
}

// ListWithScores retrieves candidates with their scores
func (s *CandidateService) ListWithScores(ctx context.Context, params *ListParams) ([]*CandidateWithScore, int64, error) {
	candidates, total, err := s.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}

	result := make([]*CandidateWithScore, len(candidates))
	for i, candidate := range candidates {
		result[i] = &CandidateWithScore{
			Candidate:   candidate,
			TotalScore:  s.CalculateTotalScore(candidate),
			ScoreDetail: s.CalculateScores(candidate),
		}
	}

	return result, total, nil
}
