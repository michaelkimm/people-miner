package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/peopleminer/backend-go/internal/service"
	"github.com/stretchr/testify/assert"
)

func TestCrawlerHandler_GetSources(t *testing.T) {
	mockService := &mockCrawlerService{
		sources: []*domain.CrawlSource{
			domain.NewCrawlSource("source1", domain.SourceTypeGithubOrg, "https://github.com/org1", nil),
			domain.NewCrawlSource("source2", domain.SourceTypeGithubOrg, "https://github.com/org2", nil),
		},
	}
	handler := NewCrawlerHandler(mockService)

	router := gin.New()
	router.GET("/sources", handler.GetSources)

	req := httptest.NewRequest(http.MethodGet, "/sources", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []*domain.CrawlSource
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response, 2)
}

func TestCrawlerHandler_ToggleSource(t *testing.T) {
	source := domain.NewCrawlSource("source1", domain.SourceTypeGithubOrg, "https://github.com/org1", nil)
	source.Enabled = false
	mockService := &mockCrawlerService{
		source: source,
	}
	handler := NewCrawlerHandler(mockService)

	router := gin.New()
	router.PATCH("/sources/:name/toggle", handler.ToggleSource)

	body := `{"enabled": false}`
	req := httptest.NewRequest(http.MethodPatch, "/sources/source1/toggle", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestCrawlerHandler_StartCrawl(t *testing.T) {
	mockService := &mockCrawlerService{
		startResponse: &service.StartCrawlResponse{
			JobID:        "job-123",
			Message:      "Started crawling",
			SourcesCount: 5,
		},
	}
	handler := NewCrawlerHandler(mockService)

	router := gin.New()
	router.POST("/crawl", handler.StartCrawl)

	req := httptest.NewRequest(http.MethodPost, "/crawl", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response service.StartCrawlResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "job-123", response.JobID)
}

func TestCrawlerHandler_GetCrawlStatus(t *testing.T) {
	job := domain.NewCrawlJob(5)
	mockService := &mockCrawlerService{
		job: job,
	}
	handler := NewCrawlerHandler(mockService)

	router := gin.New()
	router.GET("/crawl/:jobId", handler.GetCrawlStatus)

	req := httptest.NewRequest(http.MethodGet, "/crawl/"+job.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestCrawlerHandler_GetCrawlStatus_NotFound(t *testing.T) {
	mockService := &mockCrawlerService{
		err: ErrNotFound,
	}
	handler := NewCrawlerHandler(mockService)

	router := gin.New()
	router.GET("/crawl/:jobId", handler.GetCrawlStatus)

	req := httptest.NewRequest(http.MethodGet, "/crawl/nonexistent", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestCrawlerHandler_CrawlSource(t *testing.T) {
	mockService := &mockCrawlerService{
		startResponse: &service.StartCrawlResponse{
			JobID:        "job-456",
			Message:      "Started crawling source1",
			SourcesCount: 1,
		},
	}
	handler := NewCrawlerHandler(mockService)

	router := gin.New()
	router.POST("/sources/:name/crawl", handler.CrawlSource)

	req := httptest.NewRequest(http.MethodPost, "/sources/source1/crawl", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

// Mock service
type mockCrawlerService struct {
	sources       []*domain.CrawlSource
	source        *domain.CrawlSource
	job           *domain.CrawlJob
	startResponse *service.StartCrawlResponse
	err           error
}

func (m *mockCrawlerService) GetSources(ctx context.Context) ([]*domain.CrawlSource, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.sources, nil
}

func (m *mockCrawlerService) GetEnabledSources(ctx context.Context) ([]*domain.CrawlSource, error) {
	return m.sources, m.err
}

func (m *mockCrawlerService) ToggleSource(ctx context.Context, name string, enabled bool) (*domain.CrawlSource, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.source, nil
}

func (m *mockCrawlerService) GetCrawlStatus(ctx context.Context, jobID string) (*domain.CrawlJob, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.job, nil
}

func (m *mockCrawlerService) GetLatestCrawlJob(ctx context.Context) (*domain.CrawlJob, error) {
	return m.job, m.err
}

func (m *mockCrawlerService) StartCrawl(ctx context.Context, options *service.StartCrawlOptions) (*service.StartCrawlResponse, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.startResponse, nil
}

func (m *mockCrawlerService) CrawlSource(ctx context.Context, sourceName string) (*service.StartCrawlResponse, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.startResponse, nil
}
