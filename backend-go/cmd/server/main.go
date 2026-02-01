package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/peopleminer/backend-go/internal/config"
	"github.com/peopleminer/backend-go/internal/filter"
	"github.com/peopleminer/backend-go/internal/github"
	"github.com/peopleminer/backend-go/internal/handler"
	"github.com/peopleminer/backend-go/internal/scoring"
	"github.com/peopleminer/backend-go/internal/service"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize dependencies
	registry := scoring.NewStrategyRegistry()
	filterService := filter.NewTechStackFilterService(filter.ParseTargetRole(cfg.App.TargetRole))

	// Initialize GitHub service
	var githubService *github.GitHubService
	if cfg.GitHub.Token != "" {
		githubService = github.NewGitHubService(&github.GitHubServiceConfig{
			Token:   cfg.GitHub.Token,
			BaseURL: "https://api.github.com",
		})
	}

	// Initialize services (using nil repos for now - would need actual DB implementation)
	candidateService := service.NewCandidateService(nil, registry)
	crawlerService := service.NewCrawlerService(nil, nil, nil, githubService, filterService)
	scoringService := service.NewScoringService(registry)

	// Initialize handlers
	candidateHandler := handler.NewCandidateHandler(&candidateServiceWrapper{candidateService})
	crawlerHandler := handler.NewCrawlerHandler(&crawlerServiceWrapper{crawlerService})
	scoringHandler := handler.NewScoringHandler(&scoringServiceWrapper{scoringService})

	// Setup router
	router := gin.Default()

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API routes
	api := router.Group("/api")
	{
		candidateHandler.RegisterRoutes(api)
		crawlerHandler.RegisterRoutes(api)
		scoringHandler.RegisterRoutes(api)
	}

	// Start server
	addr := cfg.Server.Host + ":" + cfg.Server.Port
	log.Printf("Starting server on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// Wrapper types to implement handler interfaces
// In a real application, these would be in separate files or the service would implement the interfaces directly

type candidateServiceWrapper struct {
	*service.CandidateService
}

type crawlerServiceWrapper struct {
	*service.CrawlerService
}

type scoringServiceWrapper struct {
	*service.ScoringService
}
