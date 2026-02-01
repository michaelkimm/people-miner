package rejection

import (
	"context"

	"github.com/peopleminer/backend-go/internal/domain"
)

// RejectionRuleRepository defines the interface for rejection rule persistence
type RejectionRuleRepository interface {
	Create(ctx context.Context, rule *domain.RejectionRule) error
	Update(ctx context.Context, rule *domain.RejectionRule) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (*domain.RejectionRule, error)
	FindAll(ctx context.Context) ([]*domain.RejectionRule, error)
	FindEnabled(ctx context.Context) ([]*domain.RejectionRule, error)
}

// FeedbackRepository defines the interface for feedback persistence
type FeedbackRepository interface {
	Create(ctx context.Context, feedback *domain.CandidateFeedback) error
	FindByCandidateID(ctx context.Context, candidateID string) ([]*domain.CandidateFeedback, error)
	Delete(ctx context.Context, id string) error
}

// RuleUpdate holds optional update fields for a rule
type RuleUpdate struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	Condition   *string `json:"condition,omitempty"`
	Priority    *int    `json:"priority,omitempty"`
	Enabled     *bool   `json:"enabled,omitempty"`
}

// RejectionService provides rejection rule and feedback operations
type RejectionService struct {
	ruleRepo     RejectionRuleRepository
	feedbackRepo FeedbackRepository
}

// NewRejectionService creates a new RejectionService
func NewRejectionService(ruleRepo RejectionRuleRepository, feedbackRepo FeedbackRepository) *RejectionService {
	return &RejectionService{
		ruleRepo:     ruleRepo,
		feedbackRepo: feedbackRepo,
	}
}

// GetRules retrieves all rejection rules
func (s *RejectionService) GetRules(ctx context.Context) ([]*domain.RejectionRule, error) {
	return s.ruleRepo.FindAll(ctx)
}

// GetEnabledRules retrieves enabled rejection rules
func (s *RejectionService) GetEnabledRules(ctx context.Context) ([]*domain.RejectionRule, error) {
	return s.ruleRepo.FindEnabled(ctx)
}

// CreateRule creates a new rejection rule
func (s *RejectionService) CreateRule(ctx context.Context, name, description, condition string, priority int) (*domain.RejectionRule, error) {
	rule := domain.NewRejectionRule(name, description, condition, priority)

	if err := s.ruleRepo.Create(ctx, rule); err != nil {
		return nil, err
	}

	return rule, nil
}

// UpdateRule updates an existing rejection rule
func (s *RejectionService) UpdateRule(ctx context.Context, id string, updates *RuleUpdate) (*domain.RejectionRule, error) {
	rule, err := s.ruleRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if updates.Name != nil {
		rule.Name = *updates.Name
	}
	if updates.Description != nil {
		rule.Description = *updates.Description
	}
	if updates.Condition != nil {
		rule.UpdateCondition(*updates.Condition)
	}
	if updates.Priority != nil {
		rule.UpdatePriority(*updates.Priority)
	}
	if updates.Enabled != nil {
		if *updates.Enabled {
			rule.Enable()
		} else {
			rule.Disable()
		}
	}

	if err := s.ruleRepo.Update(ctx, rule); err != nil {
		return nil, err
	}

	return rule, nil
}

// DeleteRule deletes a rejection rule
func (s *RejectionService) DeleteRule(ctx context.Context, id string) error {
	return s.ruleRepo.Delete(ctx, id)
}

// AddPositiveFeedback adds positive feedback for a candidate
func (s *RejectionService) AddPositiveFeedback(ctx context.Context, candidateID, reason, category string) (*domain.CandidateFeedback, error) {
	feedback := domain.NewPositiveFeedback(candidateID, reason, category)

	if err := s.feedbackRepo.Create(ctx, feedback); err != nil {
		return nil, err
	}

	return feedback, nil
}

// AddNegativeFeedback adds negative feedback for a candidate
func (s *RejectionService) AddNegativeFeedback(ctx context.Context, candidateID, reason, category string) (*domain.CandidateFeedback, error) {
	feedback := domain.NewNegativeFeedback(candidateID, reason, category)

	if err := s.feedbackRepo.Create(ctx, feedback); err != nil {
		return nil, err
	}

	return feedback, nil
}

// GetFeedbackForCandidate retrieves all feedback for a candidate
func (s *RejectionService) GetFeedbackForCandidate(ctx context.Context, candidateID string) ([]*domain.CandidateFeedback, error) {
	return s.feedbackRepo.FindByCandidateID(ctx, candidateID)
}

// DeleteFeedback deletes a feedback entry
func (s *RejectionService) DeleteFeedback(ctx context.Context, id string) error {
	return s.feedbackRepo.Delete(ctx, id)
}
