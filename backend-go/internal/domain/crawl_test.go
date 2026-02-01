package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestCrawlSource_NewCrawlSource(t *testing.T) {
	config := map[string]interface{}{
		"orgName": "test-org",
	}

	source := NewCrawlSource("test-source", SourceTypeGithubOrg, "https://github.com/test-org", config)

	assert.NotEmpty(t, source.ID)
	assert.Equal(t, "test-source", source.Name)
	assert.Equal(t, SourceTypeGithubOrg, source.Type)
	assert.Equal(t, "https://github.com/test-org", source.URL)
	assert.Equal(t, "test-org", source.Config["orgName"])
	assert.True(t, source.Enabled)
}

func TestCrawlSource_Enable(t *testing.T) {
	source := NewCrawlSource("test-source", SourceTypeGithubOrg, "https://github.com/test-org", nil)
	source.Enabled = false

	source.Enable()

	assert.True(t, source.Enabled)
}

func TestCrawlSource_Disable(t *testing.T) {
	source := NewCrawlSource("test-source", SourceTypeGithubOrg, "https://github.com/test-org", nil)

	source.Disable()

	assert.False(t, source.Enabled)
}

func TestCrawlSource_MarkCrawled(t *testing.T) {
	source := NewCrawlSource("test-source", SourceTypeGithubOrg, "https://github.com/test-org", nil)

	source.MarkCrawled()

	assert.NotNil(t, source.LastCrawled)
}

func TestCrawlJob_NewCrawlJob(t *testing.T) {
	job := NewCrawlJob(5)

	assert.NotEmpty(t, job.ID)
	assert.Equal(t, JobStatusRunning, job.Status)
	assert.Equal(t, 5, job.TotalTasks)
	assert.Equal(t, 0, job.CompletedTasks)
	assert.NotNil(t, job.StartedAt)
	assert.Nil(t, job.CompletedAt)
}

func TestCrawlJob_IncrementCompletedTasks(t *testing.T) {
	job := NewCrawlJob(5)

	job.IncrementCompletedTasks()

	assert.Equal(t, 1, job.CompletedTasks)
}

func TestCrawlJob_Complete(t *testing.T) {
	job := NewCrawlJob(5)
	job.CompletedTasks = 5

	job.Complete()

	assert.Equal(t, JobStatusCompleted, job.Status)
	assert.NotNil(t, job.CompletedAt)
}

func TestCrawlJob_Fail(t *testing.T) {
	job := NewCrawlJob(5)

	job.Fail("connection error")

	assert.Equal(t, JobStatusFailed, job.Status)
	assert.NotNil(t, job.CompletedAt)
	assert.Equal(t, "connection error", *job.ErrorMessage)
}

func TestCrawlJob_UpdateCounts(t *testing.T) {
	job := NewCrawlJob(5)

	job.UpdateCounts(100, 50)

	assert.Equal(t, 100, job.CandidatesFound)
	assert.Equal(t, 50, job.CandidatesNew)
}

func TestCrawlJob_AddCounts(t *testing.T) {
	job := NewCrawlJob(5)
	job.CandidatesFound = 50
	job.CandidatesNew = 20

	job.AddCounts(30, 10)

	assert.Equal(t, 80, job.CandidatesFound)
	assert.Equal(t, 30, job.CandidatesNew)
}

func TestCrawlJob_Progress(t *testing.T) {
	job := NewCrawlJob(10)
	job.CompletedTasks = 5

	progress := job.Progress()

	assert.Equal(t, 0.5, progress)
}

func TestCrawlJob_Progress_ZeroTasks(t *testing.T) {
	job := NewCrawlJob(0)

	progress := job.Progress()

	assert.Equal(t, 0.0, progress)
}

func TestJobStatus_String(t *testing.T) {
	assert.Equal(t, "PENDING", JobStatusPending.String())
	assert.Equal(t, "RUNNING", JobStatusRunning.String())
	assert.Equal(t, "COMPLETED", JobStatusCompleted.String())
	assert.Equal(t, "FAILED", JobStatusFailed.String())
}

func TestCrawlJob_Duration(t *testing.T) {
	job := NewCrawlJob(5)
	startTime := time.Now().Add(-5 * time.Minute)
	job.StartedAt = &startTime

	duration := job.Duration()

	assert.True(t, duration >= 5*time.Minute)
}

func TestCrawlJob_Duration_WithCompletion(t *testing.T) {
	job := NewCrawlJob(5)
	startTime := time.Now().Add(-10 * time.Minute)
	completedTime := time.Now().Add(-5 * time.Minute)
	job.StartedAt = &startTime
	job.CompletedAt = &completedTime

	duration := job.Duration()

	assert.InDelta(t, 5*time.Minute, duration, float64(time.Second))
}
