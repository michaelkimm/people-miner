package service

import (
	"context"
	"testing"

	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockCrawlSourceRepository is a mock implementation
type MockCrawlSourceRepository struct {
	mock.Mock
}

func (m *MockCrawlSourceRepository) Create(ctx context.Context, source *domain.CrawlSource) error {
	args := m.Called(ctx, source)
	return args.Error(0)
}

func (m *MockCrawlSourceRepository) Update(ctx context.Context, source *domain.CrawlSource) error {
	args := m.Called(ctx, source)
	return args.Error(0)
}

func (m *MockCrawlSourceRepository) FindByName(ctx context.Context, name string) (*domain.CrawlSource, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CrawlSource), args.Error(1)
}

func (m *MockCrawlSourceRepository) FindAll(ctx context.Context) ([]*domain.CrawlSource, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.CrawlSource), args.Error(1)
}

func (m *MockCrawlSourceRepository) FindEnabled(ctx context.Context) ([]*domain.CrawlSource, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.CrawlSource), args.Error(1)
}

func (m *MockCrawlSourceRepository) Count(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

// MockCrawlJobRepository is a mock implementation
type MockCrawlJobRepository struct {
	mock.Mock
}

func (m *MockCrawlJobRepository) Create(ctx context.Context, job *domain.CrawlJob) error {
	args := m.Called(ctx, job)
	return args.Error(0)
}

func (m *MockCrawlJobRepository) Update(ctx context.Context, job *domain.CrawlJob) error {
	args := m.Called(ctx, job)
	return args.Error(0)
}

func (m *MockCrawlJobRepository) FindByID(ctx context.Context, id string) (*domain.CrawlJob, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CrawlJob), args.Error(1)
}

func (m *MockCrawlJobRepository) FindLatest(ctx context.Context) (*domain.CrawlJob, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.CrawlJob), args.Error(1)
}

func (m *MockCrawlJobRepository) IncrementCompletedTasks(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func TestCrawlerService_GetSources(t *testing.T) {
	mockSourceRepo := new(MockCrawlSourceRepository)
	mockJobRepo := new(MockCrawlJobRepository)
	service := NewCrawlerService(mockSourceRepo, mockJobRepo, nil, nil, nil)

	sources := []*domain.CrawlSource{
		domain.NewCrawlSource("source1", domain.SourceTypeGithubOrg, "https://github.com/org1", nil),
		domain.NewCrawlSource("source2", domain.SourceTypeGithubOrg, "https://github.com/org2", nil),
	}
	mockSourceRepo.On("FindAll", mock.Anything).Return(sources, nil)

	result, err := service.GetSources(context.Background())

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockSourceRepo.AssertExpectations(t)
}

func TestCrawlerService_GetEnabledSources(t *testing.T) {
	mockSourceRepo := new(MockCrawlSourceRepository)
	mockJobRepo := new(MockCrawlJobRepository)
	service := NewCrawlerService(mockSourceRepo, mockJobRepo, nil, nil, nil)

	sources := []*domain.CrawlSource{
		domain.NewCrawlSource("source1", domain.SourceTypeGithubOrg, "https://github.com/org1", nil),
	}
	mockSourceRepo.On("FindEnabled", mock.Anything).Return(sources, nil)

	result, err := service.GetEnabledSources(context.Background())

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	mockSourceRepo.AssertExpectations(t)
}

func TestCrawlerService_ToggleSource(t *testing.T) {
	mockSourceRepo := new(MockCrawlSourceRepository)
	mockJobRepo := new(MockCrawlJobRepository)
	service := NewCrawlerService(mockSourceRepo, mockJobRepo, nil, nil, nil)

	source := domain.NewCrawlSource("source1", domain.SourceTypeGithubOrg, "https://github.com/org1", nil)
	source.Enabled = true
	mockSourceRepo.On("FindByName", mock.Anything, "source1").Return(source, nil)
	mockSourceRepo.On("Update", mock.Anything, mock.Anything).Return(nil)

	result, err := service.ToggleSource(context.Background(), "source1", false)

	assert.NoError(t, err)
	assert.False(t, result.Enabled)
	mockSourceRepo.AssertExpectations(t)
}

func TestCrawlerService_ToggleSource_NotFound(t *testing.T) {
	mockSourceRepo := new(MockCrawlSourceRepository)
	mockJobRepo := new(MockCrawlJobRepository)
	service := NewCrawlerService(mockSourceRepo, mockJobRepo, nil, nil, nil)

	mockSourceRepo.On("FindByName", mock.Anything, "nonexistent").Return(nil, ErrNotFound)

	result, err := service.ToggleSource(context.Background(), "nonexistent", false)

	assert.Error(t, err)
	assert.Nil(t, result)
	mockSourceRepo.AssertExpectations(t)
}

func TestCrawlerService_GetCrawlStatus(t *testing.T) {
	mockSourceRepo := new(MockCrawlSourceRepository)
	mockJobRepo := new(MockCrawlJobRepository)
	service := NewCrawlerService(mockSourceRepo, mockJobRepo, nil, nil, nil)

	job := domain.NewCrawlJob(5)
	mockJobRepo.On("FindByID", mock.Anything, job.ID).Return(job, nil)

	result, err := service.GetCrawlStatus(context.Background(), job.ID)

	assert.NoError(t, err)
	assert.Equal(t, domain.JobStatusRunning, result.Status)
	mockJobRepo.AssertExpectations(t)
}

func TestCrawlerService_GetLatestCrawlJob(t *testing.T) {
	mockSourceRepo := new(MockCrawlSourceRepository)
	mockJobRepo := new(MockCrawlJobRepository)
	service := NewCrawlerService(mockSourceRepo, mockJobRepo, nil, nil, nil)

	job := domain.NewCrawlJob(10)
	mockJobRepo.On("FindLatest", mock.Anything).Return(job, nil)

	result, err := service.GetLatestCrawlJob(context.Background())

	assert.NoError(t, err)
	assert.Equal(t, 10, result.TotalTasks)
	mockJobRepo.AssertExpectations(t)
}

func TestCrawlResult_Fields(t *testing.T) {
	result := &CrawlResult{
		Found:    100,
		NewCount: 50,
	}

	assert.Equal(t, 100, result.Found)
	assert.Equal(t, 50, result.NewCount)
}

func TestStartCrawlOptions_Fields(t *testing.T) {
	options := &StartCrawlOptions{
		SourceNames: []string{"source1", "source2"},
		Categories:  []string{"company"},
	}

	assert.Len(t, options.SourceNames, 2)
	assert.Len(t, options.Categories, 1)
}

func TestStartCrawlResponse_Fields(t *testing.T) {
	response := &StartCrawlResponse{
		JobID:        "job-123",
		Message:      "Started crawling",
		SourcesCount: 5,
	}

	assert.Equal(t, "job-123", response.JobID)
	assert.Equal(t, 5, response.SourcesCount)
}
