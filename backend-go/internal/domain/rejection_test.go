package domain

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRejectionRule_NewRejectionRule(t *testing.T) {
	rule := NewRejectionRule("Low Activity", "Exclude candidates with low activity", "activity_score < 20", 1)

	assert.NotEmpty(t, rule.ID)
	assert.Equal(t, "Low Activity", rule.Name)
	assert.Equal(t, "Exclude candidates with low activity", rule.Description)
	assert.Equal(t, "activity_score < 20", rule.Condition)
	assert.Equal(t, 1, rule.Priority)
	assert.True(t, rule.Enabled)
}

func TestRejectionRule_Enable(t *testing.T) {
	rule := NewRejectionRule("Test Rule", "Test", "condition", 1)
	rule.Enabled = false

	rule.Enable()

	assert.True(t, rule.Enabled)
}

func TestRejectionRule_Disable(t *testing.T) {
	rule := NewRejectionRule("Test Rule", "Test", "condition", 1)

	rule.Disable()

	assert.False(t, rule.Enabled)
}

func TestRejectionRule_UpdateCondition(t *testing.T) {
	rule := NewRejectionRule("Test Rule", "Test", "old_condition", 1)

	rule.UpdateCondition("new_condition")

	assert.Equal(t, "new_condition", rule.Condition)
}

func TestRejectionRule_UpdatePriority(t *testing.T) {
	rule := NewRejectionRule("Test Rule", "Test", "condition", 1)

	rule.UpdatePriority(5)

	assert.Equal(t, 5, rule.Priority)
}

func TestCandidateFeedback_NewPositiveFeedback(t *testing.T) {
	feedback := NewPositiveFeedback("candidate-123", "Great communication skills", "soft_skills")

	assert.NotEmpty(t, feedback.ID)
	assert.Equal(t, "candidate-123", feedback.CandidateID)
	assert.Equal(t, string(FeedbackTypePositive), feedback.Type)
	assert.Equal(t, "Great communication skills", feedback.Reason)
	assert.Equal(t, "soft_skills", feedback.Category)
}

func TestCandidateFeedback_NewNegativeFeedback(t *testing.T) {
	feedback := NewNegativeFeedback("candidate-123", "No recent activity", "activity")

	assert.NotEmpty(t, feedback.ID)
	assert.Equal(t, "candidate-123", feedback.CandidateID)
	assert.Equal(t, string(FeedbackTypeNegative), feedback.Type)
	assert.Equal(t, "No recent activity", feedback.Reason)
	assert.Equal(t, "activity", feedback.Category)
}

func TestFeedbackType_String(t *testing.T) {
	assert.Equal(t, "POSITIVE", FeedbackTypePositive.String())
	assert.Equal(t, "NEGATIVE", FeedbackTypeNegative.String())
}

func TestFeedbackType_IsPositive(t *testing.T) {
	assert.True(t, FeedbackTypePositive.IsPositive())
	assert.False(t, FeedbackTypeNegative.IsPositive())
}

func TestFeedbackType_IsNegative(t *testing.T) {
	assert.False(t, FeedbackTypePositive.IsNegative())
	assert.True(t, FeedbackTypeNegative.IsNegative())
}
