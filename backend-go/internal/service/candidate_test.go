package service

import (
	"context"
	"testing"

	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockCandidateRepository is a mock implementation of CandidateRepository
type MockCandidateRepository struct {
	mock.Mock
}

func (m *MockCandidateRepository) Create(ctx context.Context, candidate *domain.Candidate) error {
	args := m.Called(ctx, candidate)
	return args.Error(0)
}

func (m *MockCandidateRepository) Update(ctx context.Context, candidate *domain.Candidate) error {
	args := m.Called(ctx, candidate)
	return args.Error(0)
}

func (m *MockCandidateRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockCandidateRepository) FindByID(ctx context.Context, id string) (*domain.Candidate, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Candidate), args.Error(1)
}

func (m *MockCandidateRepository) FindByGithubUsername(ctx context.Context, username string) (*domain.Candidate, error) {
	args := m.Called(ctx, username)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Candidate), args.Error(1)
}

func (m *MockCandidateRepository) ExistsByGithubUsername(ctx context.Context, username string) (bool, error) {
	args := m.Called(ctx, username)
	return args.Bool(0), args.Error(1)
}

func (m *MockCandidateRepository) FindAll(ctx context.Context, params *FindAllParams) ([]*domain.Candidate, int64, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]*domain.Candidate), args.Get(1).(int64), args.Error(2)
}

func (m *MockCandidateRepository) FindWithoutSolvedAcProfile(ctx context.Context, limit int) ([]*domain.Candidate, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]*domain.Candidate), args.Error(1)
}

func TestCandidateService_GetByID(t *testing.T) {
	mockRepo := new(MockCandidateRepository)
	service := NewCandidateService(mockRepo, nil)

	expected := domain.NewCandidate("testuser", 12345)
	mockRepo.On("FindByID", mock.Anything, expected.ID).Return(expected, nil)

	result, err := service.GetByID(context.Background(), expected.ID)

	assert.NoError(t, err)
	assert.Equal(t, expected.GithubUsername, result.GithubUsername)
	mockRepo.AssertExpectations(t)
}

func TestCandidateService_GetByID_NotFound(t *testing.T) {
	mockRepo := new(MockCandidateRepository)
	service := NewCandidateService(mockRepo, nil)

	mockRepo.On("FindByID", mock.Anything, "nonexistent").Return(nil, ErrNotFound)

	result, err := service.GetByID(context.Background(), "nonexistent")

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, ErrNotFound, err)
	mockRepo.AssertExpectations(t)
}

func TestCandidateService_GetByGithubUsername(t *testing.T) {
	mockRepo := new(MockCandidateRepository)
	service := NewCandidateService(mockRepo, nil)

	expected := domain.NewCandidate("testuser", 12345)
	mockRepo.On("FindByGithubUsername", mock.Anything, "testuser").Return(expected, nil)

	result, err := service.GetByGithubUsername(context.Background(), "testuser")

	assert.NoError(t, err)
	assert.Equal(t, expected.GithubUsername, result.GithubUsername)
	mockRepo.AssertExpectations(t)
}

func TestCandidateService_Create(t *testing.T) {
	mockRepo := new(MockCandidateRepository)
	service := NewCandidateService(mockRepo, nil)

	candidate := domain.NewCandidate("newuser", 54321)
	mockRepo.On("Create", mock.Anything, candidate).Return(nil)

	err := service.Create(context.Background(), candidate)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestCandidateService_Update(t *testing.T) {
	mockRepo := new(MockCandidateRepository)
	service := NewCandidateService(mockRepo, nil)

	candidate := domain.NewCandidate("testuser", 12345)
	mockRepo.On("Update", mock.Anything, candidate).Return(nil)

	err := service.Update(context.Background(), candidate)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestCandidateService_Delete(t *testing.T) {
	mockRepo := new(MockCandidateRepository)
	service := NewCandidateService(mockRepo, nil)

	mockRepo.On("Delete", mock.Anything, "test-id").Return(nil)

	err := service.Delete(context.Background(), "test-id")

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestCandidateService_List(t *testing.T) {
	mockRepo := new(MockCandidateRepository)
	service := NewCandidateService(mockRepo, nil)

	candidates := []*domain.Candidate{
		domain.NewCandidate("user1", 1),
		domain.NewCandidate("user2", 2),
	}
	mockRepo.On("FindAll", mock.Anything, mock.Anything).Return(candidates, int64(2), nil)

	result, total, err := service.List(context.Background(), &ListParams{Page: 1, Limit: 10})

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, int64(2), total)
	mockRepo.AssertExpectations(t)
}

func TestCandidateService_ExistsByUsername(t *testing.T) {
	mockRepo := new(MockCandidateRepository)
	service := NewCandidateService(mockRepo, nil)

	mockRepo.On("ExistsByGithubUsername", mock.Anything, "testuser").Return(true, nil)

	exists, err := service.ExistsByUsername(context.Background(), "testuser")

	assert.NoError(t, err)
	assert.True(t, exists)
	mockRepo.AssertExpectations(t)
}

func TestListParams_Validate(t *testing.T) {
	params := &ListParams{Page: 0, Limit: 0}
	params.Validate()

	assert.Equal(t, 1, params.Page)
	assert.Equal(t, 20, params.Limit)
}

func TestListParams_Validate_MaxLimit(t *testing.T) {
	params := &ListParams{Page: 1, Limit: 200}
	params.Validate()

	assert.Equal(t, 100, params.Limit)
}

func TestListParams_Offset(t *testing.T) {
	params := &ListParams{Page: 3, Limit: 20}

	assert.Equal(t, 40, params.Offset())
}
