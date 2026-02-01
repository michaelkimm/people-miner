package rejection

import (
	"context"
	"testing"

	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRejectionRuleRepository is a mock implementation
type MockRejectionRuleRepository struct {
	mock.Mock
}

func (m *MockRejectionRuleRepository) Create(ctx context.Context, rule *domain.RejectionRule) error {
	args := m.Called(ctx, rule)
	return args.Error(0)
}

func (m *MockRejectionRuleRepository) Update(ctx context.Context, rule *domain.RejectionRule) error {
	args := m.Called(ctx, rule)
	return args.Error(0)
}

func (m *MockRejectionRuleRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockRejectionRuleRepository) FindByID(ctx context.Context, id string) (*domain.RejectionRule, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.RejectionRule), args.Error(1)
}

func (m *MockRejectionRuleRepository) FindAll(ctx context.Context) ([]*domain.RejectionRule, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.RejectionRule), args.Error(1)
}

func (m *MockRejectionRuleRepository) FindEnabled(ctx context.Context) ([]*domain.RejectionRule, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.RejectionRule), args.Error(1)
}

// MockFeedbackRepository is a mock implementation
type MockFeedbackRepository struct {
	mock.Mock
}

func (m *MockFeedbackRepository) Create(ctx context.Context, feedback *domain.CandidateFeedback) error {
	args := m.Called(ctx, feedback)
	return args.Error(0)
}

func (m *MockFeedbackRepository) FindByCandidateID(ctx context.Context, candidateID string) ([]*domain.CandidateFeedback, error) {
	args := m.Called(ctx, candidateID)
	return args.Get(0).([]*domain.CandidateFeedback), args.Error(1)
}

func (m *MockFeedbackRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func TestRejectionService_GetRules(t *testing.T) {
	mockRepo := new(MockRejectionRuleRepository)
	service := NewRejectionService(mockRepo, nil)

	rules := []*domain.RejectionRule{
		domain.NewRejectionRule("Rule 1", "Desc 1", "condition1", 1),
		domain.NewRejectionRule("Rule 2", "Desc 2", "condition2", 2),
	}
	mockRepo.On("FindAll", mock.Anything).Return(rules, nil)

	result, err := service.GetRules(context.Background())

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}

func TestRejectionService_GetEnabledRules(t *testing.T) {
	mockRepo := new(MockRejectionRuleRepository)
	service := NewRejectionService(mockRepo, nil)

	rules := []*domain.RejectionRule{
		domain.NewRejectionRule("Rule 1", "Desc 1", "condition1", 1),
	}
	mockRepo.On("FindEnabled", mock.Anything).Return(rules, nil)

	result, err := service.GetEnabledRules(context.Background())

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	mockRepo.AssertExpectations(t)
}

func TestRejectionService_CreateRule(t *testing.T) {
	mockRepo := new(MockRejectionRuleRepository)
	service := NewRejectionService(mockRepo, nil)

	mockRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	rule, err := service.CreateRule(context.Background(), "Test Rule", "Description", "condition", 1)

	assert.NoError(t, err)
	assert.NotNil(t, rule)
	assert.Equal(t, "Test Rule", rule.Name)
	mockRepo.AssertExpectations(t)
}

func TestRejectionService_UpdateRule(t *testing.T) {
	mockRepo := new(MockRejectionRuleRepository)
	service := NewRejectionService(mockRepo, nil)

	rule := domain.NewRejectionRule("Rule", "Desc", "condition", 1)
	mockRepo.On("FindByID", mock.Anything, rule.ID).Return(rule, nil)
	mockRepo.On("Update", mock.Anything, mock.Anything).Return(nil)

	updated, err := service.UpdateRule(context.Background(), rule.ID, &RuleUpdate{
		Enabled:   boolPtr(false),
		Condition: stringPtr("new_condition"),
	})

	assert.NoError(t, err)
	assert.False(t, updated.Enabled)
	assert.Equal(t, "new_condition", updated.Condition)
	mockRepo.AssertExpectations(t)
}

func TestRejectionService_DeleteRule(t *testing.T) {
	mockRepo := new(MockRejectionRuleRepository)
	service := NewRejectionService(mockRepo, nil)

	mockRepo.On("Delete", mock.Anything, "rule-id").Return(nil)

	err := service.DeleteRule(context.Background(), "rule-id")

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestRejectionService_AddPositiveFeedback(t *testing.T) {
	mockFeedbackRepo := new(MockFeedbackRepository)
	service := NewRejectionService(nil, mockFeedbackRepo)

	mockFeedbackRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	feedback, err := service.AddPositiveFeedback(context.Background(), "candidate-123", "Good candidate", "quality")

	assert.NoError(t, err)
	assert.NotNil(t, feedback)
	assert.Equal(t, "candidate-123", feedback.CandidateID)
	assert.Equal(t, string(domain.FeedbackTypePositive), feedback.Type)
	mockFeedbackRepo.AssertExpectations(t)
}

func TestRejectionService_AddNegativeFeedback(t *testing.T) {
	mockFeedbackRepo := new(MockFeedbackRepository)
	service := NewRejectionService(nil, mockFeedbackRepo)

	mockFeedbackRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	feedback, err := service.AddNegativeFeedback(context.Background(), "candidate-123", "Not suitable", "skill")

	assert.NoError(t, err)
	assert.NotNil(t, feedback)
	assert.Equal(t, "candidate-123", feedback.CandidateID)
	assert.Equal(t, string(domain.FeedbackTypeNegative), feedback.Type)
	mockFeedbackRepo.AssertExpectations(t)
}

func TestRejectionService_GetFeedbackForCandidate(t *testing.T) {
	mockFeedbackRepo := new(MockFeedbackRepository)
	service := NewRejectionService(nil, mockFeedbackRepo)

	feedbacks := []*domain.CandidateFeedback{
		domain.NewPositiveFeedback("candidate-123", "Good", "quality"),
	}
	mockFeedbackRepo.On("FindByCandidateID", mock.Anything, "candidate-123").Return(feedbacks, nil)

	result, err := service.GetFeedbackForCandidate(context.Background(), "candidate-123")

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	mockFeedbackRepo.AssertExpectations(t)
}

func TestRuleUpdate_Fields(t *testing.T) {
	update := &RuleUpdate{
		Name:        stringPtr("New Name"),
		Description: stringPtr("New Description"),
		Condition:   stringPtr("new_condition"),
		Priority:    intPtr(5),
		Enabled:     boolPtr(false),
	}

	assert.Equal(t, "New Name", *update.Name)
	assert.Equal(t, "New Description", *update.Description)
	assert.Equal(t, "new_condition", *update.Condition)
	assert.Equal(t, 5, *update.Priority)
	assert.False(t, *update.Enabled)
}

// Helper functions
func boolPtr(b bool) *bool {
	return &b
}

func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}
