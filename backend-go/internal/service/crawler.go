package service

import (
	"context"

	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/peopleminer/backend-go/internal/filter"
	"github.com/peopleminer/backend-go/internal/github"
)

// CrawlSourceRepository defines the interface for crawl source persistence
type CrawlSourceRepository interface {
	Create(ctx context.Context, source *domain.CrawlSource) error
	Update(ctx context.Context, source *domain.CrawlSource) error
	FindByName(ctx context.Context, name string) (*domain.CrawlSource, error)
	FindAll(ctx context.Context) ([]*domain.CrawlSource, error)
	FindEnabled(ctx context.Context) ([]*domain.CrawlSource, error)
	Count(ctx context.Context) (int64, error)
}

// CrawlJobRepository defines the interface for crawl job persistence
type CrawlJobRepository interface {
	Create(ctx context.Context, job *domain.CrawlJob) error
	Update(ctx context.Context, job *domain.CrawlJob) error
	FindByID(ctx context.Context, id string) (*domain.CrawlJob, error)
	FindLatest(ctx context.Context) (*domain.CrawlJob, error)
	IncrementCompletedTasks(ctx context.Context, id string) error
}

// CrawlResult holds the result of a crawl operation
type CrawlResult struct {
	Found    int `json:"found"`
	NewCount int `json:"newCount"`
}

// StartCrawlOptions holds options for starting a crawl
type StartCrawlOptions struct {
	SourceNames []string `json:"sourceNames,omitempty"`
	Categories  []string `json:"categories,omitempty"`
}

// StartCrawlResponse holds the response for starting a crawl
type StartCrawlResponse struct {
	JobID        string `json:"jobId"`
	Message      string `json:"message"`
	SourcesCount int    `json:"sourcesCount"`
}

// CrawlerService provides crawling operations
type CrawlerService struct {
	sourceRepo    CrawlSourceRepository
	jobRepo       CrawlJobRepository
	candidateRepo CandidateRepository
	githubService *github.GitHubService
	filterService *filter.TechStackFilterService
}

// NewCrawlerService creates a new CrawlerService
func NewCrawlerService(
	sourceRepo CrawlSourceRepository,
	jobRepo CrawlJobRepository,
	candidateRepo CandidateRepository,
	githubService *github.GitHubService,
	filterService *filter.TechStackFilterService,
) *CrawlerService {
	return &CrawlerService{
		sourceRepo:    sourceRepo,
		jobRepo:       jobRepo,
		candidateRepo: candidateRepo,
		githubService: githubService,
		filterService: filterService,
	}
}

// GetSources retrieves all crawl sources
func (s *CrawlerService) GetSources(ctx context.Context) ([]*domain.CrawlSource, error) {
	return s.sourceRepo.FindAll(ctx)
}

// GetEnabledSources retrieves enabled crawl sources
func (s *CrawlerService) GetEnabledSources(ctx context.Context) ([]*domain.CrawlSource, error) {
	return s.sourceRepo.FindEnabled(ctx)
}

// ToggleSource enables or disables a crawl source
func (s *CrawlerService) ToggleSource(ctx context.Context, name string, enabled bool) (*domain.CrawlSource, error) {
	source, err := s.sourceRepo.FindByName(ctx, name)
	if err != nil {
		return nil, err
	}

	if enabled {
		source.Enable()
	} else {
		source.Disable()
	}

	if err := s.sourceRepo.Update(ctx, source); err != nil {
		return nil, err
	}

	return source, nil
}

// GetCrawlStatus retrieves the status of a crawl job
func (s *CrawlerService) GetCrawlStatus(ctx context.Context, jobID string) (*domain.CrawlJob, error) {
	return s.jobRepo.FindByID(ctx, jobID)
}

// GetLatestCrawlJob retrieves the latest crawl job
func (s *CrawlerService) GetLatestCrawlJob(ctx context.Context) (*domain.CrawlJob, error) {
	return s.jobRepo.FindLatest(ctx)
}

// StartCrawl starts a new crawl job
func (s *CrawlerService) StartCrawl(ctx context.Context, options *StartCrawlOptions) (*StartCrawlResponse, error) {
	sources, err := s.sourceRepo.FindEnabled(ctx)
	if err != nil {
		return nil, err
	}

	// Filter by source names if specified
	if options != nil && len(options.SourceNames) > 0 {
		nameSet := make(map[string]bool)
		for _, name := range options.SourceNames {
			nameSet[name] = true
		}

		var filtered []*domain.CrawlSource
		for _, source := range sources {
			if nameSet[source.Name] {
				filtered = append(filtered, source)
			}
		}
		sources = filtered
	}

	if len(sources) == 0 {
		return &StartCrawlResponse{
			JobID:        "",
			Message:      "No sources to crawl",
			SourcesCount: 0,
		}, nil
	}

	// Create crawl job
	job := domain.NewCrawlJob(len(sources))
	if err := s.jobRepo.Create(ctx, job); err != nil {
		return nil, err
	}

	// Start async crawling (in production, this would be a goroutine or job queue)
	go s.processCrawlJob(context.Background(), job.ID, sources)

	return &StartCrawlResponse{
		JobID:        job.ID,
		Message:      "Started crawling",
		SourcesCount: len(sources),
	}, nil
}

func (s *CrawlerService) processCrawlJob(ctx context.Context, jobID string, sources []*domain.CrawlSource) {
	for _, source := range sources {
		var result *CrawlResult
		var err error

		switch source.Type {
		case domain.SourceTypeGithubOrg:
			orgName, ok := source.Config["orgName"].(string)
			if ok && orgName != "" {
				result, err = s.crawlGitHubOrg(ctx, orgName, source.Name)
			}
		}

		if err == nil && result != nil {
			source.MarkCrawled()
			_ = s.sourceRepo.Update(ctx, source)
		}

		_ = s.jobRepo.IncrementCompletedTasks(ctx, jobID)
	}

	// Complete the job
	job, err := s.jobRepo.FindByID(ctx, jobID)
	if err == nil {
		job.Complete()
		_ = s.jobRepo.Update(ctx, job)
	}
}

func (s *CrawlerService) crawlGitHubOrg(ctx context.Context, orgName, sourceName string) (*CrawlResult, error) {
	if s.githubService == nil {
		return &CrawlResult{}, nil
	}

	members, err := s.githubService.GetAllOrgMembers(orgName)
	if err != nil {
		return nil, err
	}

	var newCount int
	for _, member := range members {
		exists, err := s.candidateRepo.ExistsByGithubUsername(ctx, member.Login)
		if err != nil || exists {
			continue
		}

		user, err := s.githubService.GetUser(member.Login)
		if err != nil || user == nil {
			continue
		}

		repos, err := s.githubService.GetUserRepos(member.Login, 10)
		if err != nil {
			continue
		}

		// Apply filter
		if s.filterService != nil {
			filterContext := s.buildFilterContext(repos, user)
			if !s.filterService.MatchesTargetRole(filterContext) {
				continue
			}
		}

		// Create candidate
		candidate := domain.NewCandidate(user.Login, user.ID)
		candidate.SetProfileInfo(user.Name, user.Email, user.Bio, user.Company, user.Location, user.Blog, user.AvatarURL)
		candidate.UpdateStats(user.PublicRepos, user.Followers, user.Following, nil, false, 0, 0)

		// Add source
		source := domain.NewCandidateSource(domain.SourceTypeGithubOrg, sourceName, "https://github.com/"+orgName)
		candidate.AddSource(source)

		// Add repositories
		for _, repo := range repos {
			r := &domain.Repository{
				Name:        repo.Name,
				FullName:    repo.FullName,
				Description: repo.Description,
				Language:    repo.Language,
				StarCount:   repo.StargazersCount,
				ForkCount:   repo.ForksCount,
				URL:         repo.HTMLURL,
			}
			candidate.AddRepository(r)
		}

		if err := s.candidateRepo.Create(ctx, candidate); err == nil {
			newCount++
		}
	}

	return &CrawlResult{
		Found:    len(members),
		NewCount: newCount,
	}, nil
}

func (s *CrawlerService) buildFilterContext(repos []github.GitHubRepo, user *github.GitHubUser) *filter.FilterContext {
	repoInfos := make([]filter.RepoInfo, len(repos))
	for i, r := range repos {
		repoInfos[i] = filter.RepoInfo{
			Language:    r.Language,
			Name:        r.Name,
			Description: r.Description,
		}
	}

	return &filter.FilterContext{
		Repositories: repoInfos,
		Bio:          user.Bio,
		Company:      user.Company,
	}
}

// CrawlSource crawls a single source
func (s *CrawlerService) CrawlSource(ctx context.Context, sourceName string) (*StartCrawlResponse, error) {
	source, err := s.sourceRepo.FindByName(ctx, sourceName)
	if err != nil {
		return nil, err
	}

	job := domain.NewCrawlJob(1)
	if err := s.jobRepo.Create(ctx, job); err != nil {
		return nil, err
	}

	go s.processCrawlJob(context.Background(), job.ID, []*domain.CrawlSource{source})

	return &StartCrawlResponse{
		JobID:        job.ID,
		Message:      "Started crawling " + sourceName,
		SourcesCount: 1,
	}, nil
}
