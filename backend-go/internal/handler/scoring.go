package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/peopleminer/backend-go/internal/scoring"
	"github.com/peopleminer/backend-go/internal/service"
)

// ScoringServiceInterface defines the interface for scoring service
type ScoringServiceInterface interface {
	GetStrategies() []scoring.StrategyWithConfig
	GetEnabledStrategies() []scoring.StrategyWithConfig
	GetStrategyConfig(name string) *scoring.StrategyConfig
	UpdateStrategyConfig(name string, updates *scoring.StrategyConfigUpdate) error
	SetWeight(name string, weight float64) error
	EnableStrategy(name string)
	DisableStrategy(name string)
	GetNormalizedWeights() map[string]float64
	CalculateScore(candidate *domain.Candidate) *service.ScoreCalculationResult
}

// ScoringHandler handles scoring HTTP requests
type ScoringHandler struct {
	service ScoringServiceInterface
}

// NewScoringHandler creates a new ScoringHandler
func NewScoringHandler(svc ScoringServiceInterface) *ScoringHandler {
	return &ScoringHandler{
		service: svc,
	}
}

// StrategyResponse represents a strategy in the response
type StrategyResponse struct {
	Name          string  `json:"name"`
	Enabled       bool    `json:"enabled"`
	Weight        float64 `json:"weight"`
	DefaultWeight float64 `json:"defaultWeight"`
}

// GetStrategies handles GET /strategies
func (h *ScoringHandler) GetStrategies(c *gin.Context) {
	strategies := h.service.GetStrategies()

	response := make([]StrategyResponse, len(strategies))
	for i, swc := range strategies {
		response[i] = StrategyResponse{
			Name:          swc.Strategy.Name(),
			Enabled:       swc.Config.Enabled,
			Weight:        swc.Config.Weight,
			DefaultWeight: swc.Strategy.DefaultWeight(),
		}
	}

	c.JSON(http.StatusOK, response)
}

// UpdateStrategyRequest represents the request body for updating a strategy
type UpdateStrategyRequest struct {
	Enabled *bool    `json:"enabled,omitempty"`
	Weight  *float64 `json:"weight,omitempty"`
}

// UpdateStrategy handles PATCH /strategies/:name
func (h *ScoringHandler) UpdateStrategy(c *gin.Context) {
	name := c.Param("name")

	var req UpdateStrategyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Bad Request", Message: "Invalid request body"})
		return
	}

	updates := &scoring.StrategyConfigUpdate{
		Enabled: req.Enabled,
		Weight:  req.Weight,
	}

	if err := h.service.UpdateStrategyConfig(name, updates); err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "Not Found", Message: "Strategy not found"})
			return
		}
		if errors.Is(err, service.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Bad Request", Message: err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	config := h.service.GetStrategyConfig(name)
	c.JSON(http.StatusOK, config)
}

// CalculateScoreRequest represents the request body for calculating score
type CalculateScoreRequest struct {
	GithubUsername string `json:"githubUsername" binding:"required"`
	GithubID       int64  `json:"githubId" binding:"required"`
}

// CalculateScore handles POST /score
func (h *ScoringHandler) CalculateScore(c *gin.Context) {
	var req CalculateScoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Bad Request", Message: "Invalid request body"})
		return
	}

	candidate := domain.NewCandidate(req.GithubUsername, req.GithubID)
	result := h.service.CalculateScore(candidate)

	c.JSON(http.StatusOK, result)
}

// GetNormalizedWeights handles GET /weights
func (h *ScoringHandler) GetNormalizedWeights(c *gin.Context) {
	weights := h.service.GetNormalizedWeights()
	c.JSON(http.StatusOK, weights)
}

// RegisterRoutes registers scoring routes
func (h *ScoringHandler) RegisterRoutes(router *gin.RouterGroup) {
	scoring := router.Group("/scoring")
	{
		scoring.GET("/strategies", h.GetStrategies)
		scoring.PATCH("/strategies/:name", h.UpdateStrategy)
		scoring.GET("/weights", h.GetNormalizedWeights)
		scoring.POST("/score", h.CalculateScore)
	}
}
