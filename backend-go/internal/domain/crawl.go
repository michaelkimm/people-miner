package domain

import (
	"time"

	"github.com/google/uuid"
)

// JobStatus represents the status of a crawl job
type JobStatus string

const (
	JobStatusPending   JobStatus = "PENDING"
	JobStatusRunning   JobStatus = "RUNNING"
	JobStatusCompleted JobStatus = "COMPLETED"
	JobStatusFailed    JobStatus = "FAILED"
)

func (s JobStatus) String() string {
	return string(s)
}

// CrawlSource represents a source for crawling candidates
type CrawlSource struct {
	ID          string                 `json:"id" gorm:"primaryKey"`
	Name        string                 `json:"name" gorm:"uniqueIndex;not null"`
	Type        SourceType             `json:"type" gorm:"not null"`
	URL         string                 `json:"url,omitempty"`
	Config      map[string]interface{} `json:"config,omitempty" gorm:"serializer:json"`
	Enabled     bool                   `json:"enabled" gorm:"default:true"`
	LastCrawled *time.Time             `json:"lastCrawled,omitempty"`
	CreatedAt   time.Time              `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt   time.Time              `json:"updatedAt" gorm:"autoUpdateTime"`
}

// NewCrawlSource creates a new CrawlSource
func NewCrawlSource(name string, sourceType SourceType, url string, config map[string]interface{}) *CrawlSource {
	now := time.Now()
	return &CrawlSource{
		ID:        uuid.New().String(),
		Name:      name,
		Type:      sourceType,
		URL:       url,
		Config:    config,
		Enabled:   true,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// Enable enables the crawl source
func (s *CrawlSource) Enable() {
	s.Enabled = true
	s.UpdatedAt = time.Now()
}

// Disable disables the crawl source
func (s *CrawlSource) Disable() {
	s.Enabled = false
	s.UpdatedAt = time.Now()
}

// MarkCrawled marks the source as recently crawled
func (s *CrawlSource) MarkCrawled() {
	now := time.Now()
	s.LastCrawled = &now
	s.UpdatedAt = now
}

// CrawlJob represents a crawling job
type CrawlJob struct {
	ID              string     `json:"id" gorm:"primaryKey"`
	Status          JobStatus  `json:"status" gorm:"not null;default:'PENDING'"`
	TotalTasks      int        `json:"totalTasks"`
	CompletedTasks  int        `json:"completedTasks"`
	CandidatesFound int        `json:"candidatesFound"`
	CandidatesNew   int        `json:"candidatesNew"`
	StartedAt       *time.Time `json:"startedAt,omitempty"`
	CompletedAt     *time.Time `json:"completedAt,omitempty"`
	ErrorMessage    *string    `json:"errorMessage,omitempty"`
	CreatedAt       time.Time  `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt       time.Time  `json:"updatedAt" gorm:"autoUpdateTime"`
}

// NewCrawlJob creates a new CrawlJob
func NewCrawlJob(totalTasks int) *CrawlJob {
	now := time.Now()
	return &CrawlJob{
		ID:             uuid.New().String(),
		Status:         JobStatusRunning,
		TotalTasks:     totalTasks,
		CompletedTasks: 0,
		StartedAt:      &now,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// IncrementCompletedTasks increments the completed tasks counter
func (j *CrawlJob) IncrementCompletedTasks() {
	j.CompletedTasks++
	j.UpdatedAt = time.Now()
}

// Complete marks the job as completed
func (j *CrawlJob) Complete() {
	now := time.Now()
	j.Status = JobStatusCompleted
	j.CompletedAt = &now
	j.UpdatedAt = now
}

// Fail marks the job as failed with an error message
func (j *CrawlJob) Fail(errorMessage string) {
	now := time.Now()
	j.Status = JobStatusFailed
	j.CompletedAt = &now
	j.ErrorMessage = &errorMessage
	j.UpdatedAt = now
}

// UpdateCounts updates the candidates found and new counts
func (j *CrawlJob) UpdateCounts(found, newCount int) {
	j.CandidatesFound = found
	j.CandidatesNew = newCount
	j.UpdatedAt = time.Now()
}

// AddCounts adds to the candidates found and new counts
func (j *CrawlJob) AddCounts(found, newCount int) {
	j.CandidatesFound += found
	j.CandidatesNew += newCount
	j.UpdatedAt = time.Now()
}

// Progress returns the progress as a float between 0 and 1
func (j *CrawlJob) Progress() float64 {
	if j.TotalTasks == 0 {
		return 0
	}
	return float64(j.CompletedTasks) / float64(j.TotalTasks)
}

// Duration returns the duration of the job
func (j *CrawlJob) Duration() time.Duration {
	if j.StartedAt == nil {
		return 0
	}
	endTime := time.Now()
	if j.CompletedAt != nil {
		endTime = *j.CompletedAt
	}
	return endTime.Sub(*j.StartedAt)
}
