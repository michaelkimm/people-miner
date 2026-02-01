package handler

import (
	"context"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/peopleminer/backend-go/internal/service"
)

// CrawlerServiceInterface defines the interface for crawler service
type CrawlerServiceInterface interface {
	GetSources(ctx context.Context) ([]*domain.CrawlSource, error)
	GetEnabledSources(ctx context.Context) ([]*domain.CrawlSource, error)
	ToggleSource(ctx context.Context, name string, enabled bool) (*domain.CrawlSource, error)
	GetCrawlStatus(ctx context.Context, jobID string) (*domain.CrawlJob, error)
	GetLatestCrawlJob(ctx context.Context) (*domain.CrawlJob, error)
	StartCrawl(ctx context.Context, options *service.StartCrawlOptions) (*service.StartCrawlResponse, error)
	CrawlSource(ctx context.Context, sourceName string) (*service.StartCrawlResponse, error)
}

// CrawlerHandler handles crawler HTTP requests
type CrawlerHandler struct {
	service CrawlerServiceInterface
}

// NewCrawlerHandler creates a new CrawlerHandler
func NewCrawlerHandler(svc CrawlerServiceInterface) *CrawlerHandler {
	return &CrawlerHandler{
		service: svc,
	}
}

// GetSources handles GET /sources
func (h *CrawlerHandler) GetSources(c *gin.Context) {
	sources, err := h.service.GetSources(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, sources)
}

// ToggleSourceRequest represents the request body for toggling a source
type ToggleSourceRequest struct {
	Enabled bool `json:"enabled"`
}

// ToggleSource handles PATCH /sources/:name/toggle
func (h *CrawlerHandler) ToggleSource(c *gin.Context) {
	name := c.Param("name")

	var req ToggleSourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Bad Request", Message: "Invalid request body"})
		return
	}

	source, err := h.service.ToggleSource(c.Request.Context(), name, req.Enabled)
	if err != nil {
		if errors.Is(err, ErrNotFound) || errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "Not Found", Message: "Source not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, source)
}

// StartCrawlRequest represents the request body for starting a crawl
type StartCrawlRequest struct {
	SourceNames []string `json:"sourceNames,omitempty"`
	Categories  []string `json:"categories,omitempty"`
}

// StartCrawl handles POST /crawl
func (h *CrawlerHandler) StartCrawl(c *gin.Context) {
	var req StartCrawlRequest
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Bad Request", Message: "Invalid request body"})
		return
	}

	options := &service.StartCrawlOptions{
		SourceNames: req.SourceNames,
		Categories:  req.Categories,
	}

	response, err := h.service.StartCrawl(c.Request.Context(), options)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetCrawlStatus handles GET /crawl/:jobId
func (h *CrawlerHandler) GetCrawlStatus(c *gin.Context) {
	jobID := c.Param("jobId")

	job, err := h.service.GetCrawlStatus(c.Request.Context(), jobID)
	if err != nil {
		if errors.Is(err, ErrNotFound) || errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "Not Found", Message: "Crawl job not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, job)
}

// GetLatestCrawlJob handles GET /crawl/latest
func (h *CrawlerHandler) GetLatestCrawlJob(c *gin.Context) {
	job, err := h.service.GetLatestCrawlJob(c.Request.Context())
	if err != nil {
		if errors.Is(err, ErrNotFound) || errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "Not Found", Message: "No crawl jobs found"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, job)
}

// CrawlSource handles POST /sources/:name/crawl
func (h *CrawlerHandler) CrawlSource(c *gin.Context) {
	name := c.Param("name")

	response, err := h.service.CrawlSource(c.Request.Context(), name)
	if err != nil {
		if errors.Is(err, ErrNotFound) || errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse{Error: "Not Found", Message: "Source not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal Server Error"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// RegisterRoutes registers crawler routes
func (h *CrawlerHandler) RegisterRoutes(router *gin.RouterGroup) {
	// Sources
	sources := router.Group("/sources")
	{
		sources.GET("", h.GetSources)
		sources.PATCH("/:name/toggle", h.ToggleSource)
		sources.POST("/:name/crawl", h.CrawlSource)
	}

	// Crawl jobs
	crawl := router.Group("/crawl")
	{
		crawl.POST("", h.StartCrawl)
		crawl.GET("/latest", h.GetLatestCrawlJob)
		crawl.GET("/:jobId", h.GetCrawlStatus)
	}
}
