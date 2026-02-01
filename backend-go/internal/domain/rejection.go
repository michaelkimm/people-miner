package domain

import (
	"time"

	"github.com/google/uuid"
)

// FeedbackType represents the type of feedback
type FeedbackType string

const (
	FeedbackTypePositive FeedbackType = "POSITIVE"
	FeedbackTypeNegative FeedbackType = "NEGATIVE"
)

func (f FeedbackType) String() string {
	return string(f)
}

func (f FeedbackType) IsPositive() bool {
	return f == FeedbackTypePositive
}

func (f FeedbackType) IsNegative() bool {
	return f == FeedbackTypeNegative
}

// RejectionRule represents a rule for filtering/rejecting candidates
type RejectionRule struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description,omitempty"`
	Condition   string    `json:"condition" gorm:"not null"`
	Priority    int       `json:"priority" gorm:"default:0"`
	Enabled     bool      `json:"enabled" gorm:"default:true"`
	CreatedAt   time.Time `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt   time.Time `json:"updatedAt" gorm:"autoUpdateTime"`
}

// NewRejectionRule creates a new RejectionRule
func NewRejectionRule(name, description, condition string, priority int) *RejectionRule {
	now := time.Now()
	return &RejectionRule{
		ID:          uuid.New().String(),
		Name:        name,
		Description: description,
		Condition:   condition,
		Priority:    priority,
		Enabled:     true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// Enable enables the rule
func (r *RejectionRule) Enable() {
	r.Enabled = true
	r.UpdatedAt = time.Now()
}

// Disable disables the rule
func (r *RejectionRule) Disable() {
	r.Enabled = false
	r.UpdatedAt = time.Now()
}

// UpdateCondition updates the rule condition
func (r *RejectionRule) UpdateCondition(condition string) {
	r.Condition = condition
	r.UpdatedAt = time.Now()
}

// UpdatePriority updates the rule priority
func (r *RejectionRule) UpdatePriority(priority int) {
	r.Priority = priority
	r.UpdatedAt = time.Now()
}

// NewPositiveFeedback creates a new positive feedback
func NewPositiveFeedback(candidateID, reason, category string) *CandidateFeedback {
	return &CandidateFeedback{
		ID:          uuid.New().String(),
		CandidateID: candidateID,
		Type:        string(FeedbackTypePositive),
		Reason:      reason,
		Category:    category,
		CreatedAt:   time.Now(),
	}
}

// NewNegativeFeedback creates a new negative feedback
func NewNegativeFeedback(candidateID, reason, category string) *CandidateFeedback {
	return &CandidateFeedback{
		ID:          uuid.New().String(),
		CandidateID: candidateID,
		Type:        string(FeedbackTypeNegative),
		Reason:      reason,
		Category:    category,
		CreatedAt:   time.Now(),
	}
}
