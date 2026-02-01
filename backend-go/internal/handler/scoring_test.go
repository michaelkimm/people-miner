package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/peopleminer/backend-go/internal/scoring"
	"github.com/peopleminer/backend-go/internal/service"
	"github.com/stretchr/testify/assert"
)

func TestScoringHandler_GetStrategies(t *testing.T) {
	mockService := &mockScoringService{
		strategies: []scoring.StrategyWithConfig{
			{Strategy: scoring.NewActivityStrategy(), Config: &scoring.StrategyConfig{Name: "activity", Enabled: true, Weight: 0.25}},
			{Strategy: scoring.NewInfluenceStrategy(), Config: &scoring.StrategyConfig{Name: "influence", Enabled: true, Weight: 0.2}},
		},
	}
	handler := NewScoringHandler(mockService)

	router := gin.New()
	router.GET("/strategies", handler.GetStrategies)

	req := httptest.NewRequest(http.MethodGet, "/strategies", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestScoringHandler_UpdateStrategy(t *testing.T) {
	mockService := &mockScoringService{}
	handler := NewScoringHandler(mockService)

	router := gin.New()
	router.PATCH("/strategies/:name", handler.UpdateStrategy)

	body := `{"enabled": false, "weight": 0.3}`
	req := httptest.NewRequest(http.MethodPatch, "/strategies/activity", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestScoringHandler_UpdateStrategy_InvalidWeight(t *testing.T) {
	mockService := &mockScoringService{
		err: service.ErrInvalidInput,
	}
	handler := NewScoringHandler(mockService)

	router := gin.New()
	router.PATCH("/strategies/:name", handler.UpdateStrategy)

	body := `{"weight": 1.5}`
	req := httptest.NewRequest(http.MethodPatch, "/strategies/activity", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestScoringHandler_CalculateScore(t *testing.T) {
	mockService := &mockScoringService{
		scoreResult: &service.ScoreCalculationResult{
			TotalScore:     75.5,
			StrategyScores: map[string]*scoring.ScoreResult{},
		},
	}
	handler := NewScoringHandler(mockService)

	router := gin.New()
	router.POST("/score", handler.CalculateScore)

	body := `{"githubUsername": "testuser", "githubId": 12345}`
	req := httptest.NewRequest(http.MethodPost, "/score", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestScoringHandler_GetNormalizedWeights(t *testing.T) {
	mockService := &mockScoringService{
		weights: map[string]float64{
			"activity":  0.25,
			"influence": 0.25,
		},
	}
	handler := NewScoringHandler(mockService)

	router := gin.New()
	router.GET("/weights", handler.GetNormalizedWeights)

	req := httptest.NewRequest(http.MethodGet, "/weights", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]float64
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response, 2)
}

// Mock service
type mockScoringService struct {
	strategies  []scoring.StrategyWithConfig
	scoreResult *service.ScoreCalculationResult
	weights     map[string]float64
	config      *scoring.StrategyConfig
	err         error
}

func (m *mockScoringService) GetStrategies() []scoring.StrategyWithConfig {
	return m.strategies
}

func (m *mockScoringService) GetEnabledStrategies() []scoring.StrategyWithConfig {
	return m.strategies
}

func (m *mockScoringService) GetStrategyConfig(name string) *scoring.StrategyConfig {
	return m.config
}

func (m *mockScoringService) UpdateStrategyConfig(name string, updates *scoring.StrategyConfigUpdate) error {
	return m.err
}

func (m *mockScoringService) SetWeight(name string, weight float64) error {
	return m.err
}

func (m *mockScoringService) EnableStrategy(name string) {}

func (m *mockScoringService) DisableStrategy(name string) {}

func (m *mockScoringService) GetNormalizedWeights() map[string]float64 {
	return m.weights
}

func (m *mockScoringService) CalculateScore(candidate *domain.Candidate) *service.ScoreCalculationResult {
	return m.scoreResult
}
