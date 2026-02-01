package handler

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/peopleminer/backend-go/internal/service"
)

// Common errors
var (
	ErrNotFound = errors.New("resource not found")
)

// ListResponse represents a paginated list response
type ListResponse struct {
	Data  interface{} `json:"data"`
	Total int64       `json:"total"`
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// CandidateServiceInterface defines the interface for candidate service
type CandidateServiceInterface interface {
	GetByID(ctx context.Context, id string) (*domain.Candidate, error)
	GetByGithubUsername(ctx context.Context, username string) (*domain.Candidate, error)
	Create(ctx context.Context, candidate *domain.Candidate) error
	Update(ctx context.Context, candidate *domain.Candidate) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, params *service.ListParams) ([]*domain.Candidate, int64, error)
	ExistsByUsername(ctx context.Context, username string) (bool, error)
}

// CandidateHandler handles candidate HTTP requests
type CandidateHandler struct {
	service CandidateServiceInterface
}

// NewCandidateHandler creates a new CandidateHandler
func NewCandidateHandler(svc CandidateServiceInterface) *CandidateHandler {
	return &CandidateHandler{
		service: svc,
	}
}

// GetByID handles GET /candidates/:id
func (h *CandidateHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	candidate, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) || errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "Not Found", Message: "Candidate not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, candidate)
}

// GetByUsername handles GET /candidates/username/:username
func (h *CandidateHandler) GetByUsername(c *gin.Context) {
	username := c.Param("username")

	candidate, err := h.service.GetByGithubUsername(c.Request.Context(), username)
	if err != nil {
		if errors.Is(err, ErrNotFound) || errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "Not Found", Message: "Candidate not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, candidate)
}

// List handles GET /candidates
func (h *CandidateHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	sortBy := c.DefaultQuery("sortBy", "createdAt")
	sortDir := c.DefaultQuery("sortDir", "desc")

	params := &service.ListParams{
		Page:    page,
		Limit:   limit,
		SortBy:  sortBy,
		SortDir: sortDir,
	}
	params.Validate()

	candidates, total, err := h.service.List(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, ListResponse{
		Data:  candidates,
		Total: total,
		Page:  params.Page,
		Limit: params.Limit,
	})
}

// Delete handles DELETE /candidates/:id
func (h *CandidateHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, ErrNotFound) || errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "Not Found", Message: "Candidate not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	c.Status(http.StatusNoContent)
}

// RegisterRoutes registers candidate routes
func (h *CandidateHandler) RegisterRoutes(router *gin.RouterGroup) {
	candidates := router.Group("/candidates")
	{
		candidates.GET("", h.List)
		candidates.GET("/:id", h.GetByID)
		candidates.GET("/username/:username", h.GetByUsername)
		candidates.DELETE("/:id", h.Delete)
	}
}

// Mock service for testing
type mockCandidateService struct {
	candidate  *domain.Candidate
	candidates []*domain.Candidate
	total      int64
	err        error
}

func (m *mockCandidateService) GetByID(ctx context.Context, id string) (*domain.Candidate, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.candidate, nil
}

func (m *mockCandidateService) GetByGithubUsername(ctx context.Context, username string) (*domain.Candidate, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.candidate, nil
}

func (m *mockCandidateService) Create(ctx context.Context, candidate *domain.Candidate) error {
	return m.err
}

func (m *mockCandidateService) Update(ctx context.Context, candidate *domain.Candidate) error {
	return m.err
}

func (m *mockCandidateService) Delete(ctx context.Context, id string) error {
	return m.err
}

func (m *mockCandidateService) List(ctx context.Context, params *service.ListParams) ([]*domain.Candidate, int64, error) {
	if m.err != nil {
		return nil, 0, m.err
	}
	return m.candidates, m.total, nil
}

func (m *mockCandidateService) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	return m.candidate != nil, m.err
}
