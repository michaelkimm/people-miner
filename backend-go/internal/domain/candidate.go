package domain

import (
	"time"

	"github.com/google/uuid"
)

// SourceType represents the type of candidate source
type SourceType string

const (
	SourceTypeGithubOrg      SourceType = "GITHUB_ORG"
	SourceTypeGithubStars    SourceType = "GITHUB_STARS"
	SourceTypeGithubSearch   SourceType = "GITHUB_SEARCH"
	SourceTypeOSSContributor SourceType = "OSS_CONTRIBUTOR"
	SourceTypeManual         SourceType = "MANUAL"
)

func (s SourceType) String() string {
	return string(s)
}

// Candidate represents a developer candidate
type Candidate struct {
	ID                   string             `json:"id" gorm:"primaryKey"`
	GithubUsername       string             `json:"githubUsername" gorm:"uniqueIndex;not null"`
	GithubID             int64              `json:"githubId" gorm:"not null"`
	Name                 *string            `json:"name,omitempty"`
	Email                *string            `json:"email,omitempty"`
	Bio                  *string            `json:"bio,omitempty"`
	Company              *string            `json:"company,omitempty"`
	Location             *string            `json:"location,omitempty"`
	Blog                 *string            `json:"blog,omitempty"`
	AvatarURL            *string            `json:"avatarUrl,omitempty"`
	PublicRepos          int                `json:"publicRepos"`
	Followers            int                `json:"followers"`
	Following            int                `json:"following"`
	LastActivityAt       *time.Time         `json:"lastActivityAt,omitempty"`
	HasTilRepo           bool               `json:"hasTilRepo"`
	TilRepoCount         int                `json:"tilRepoCount"`
	LongestProjectMonths int                `json:"longestProjectMonths"`
	CreatedAt            time.Time          `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt            time.Time          `json:"updatedAt" gorm:"autoUpdateTime"`
	Sources              []CandidateSource  `json:"sources,omitempty" gorm:"foreignKey:CandidateID"`
	Repositories         []Repository       `json:"repositories,omitempty" gorm:"foreignKey:CandidateID"`
	SolvedAcProfile      *SolvedAcProfile   `json:"solvedAcProfile,omitempty" gorm:"foreignKey:CandidateID"`
	OSSContributions     []OSSContribution  `json:"ossContributions,omitempty" gorm:"foreignKey:CandidateID"`
	Feedbacks            []CandidateFeedback `json:"feedbacks,omitempty" gorm:"foreignKey:CandidateID"`
}

// NewCandidate creates a new Candidate with the given GitHub info
func NewCandidate(githubUsername string, githubID int64) *Candidate {
	now := time.Now()
	return &Candidate{
		ID:             uuid.New().String(),
		GithubUsername: githubUsername,
		GithubID:       githubID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// AddSource adds a source to the candidate
func (c *Candidate) AddSource(source *CandidateSource) {
	source.ID = uuid.New().String()
	source.CandidateID = c.ID
	source.CreatedAt = time.Now()
	c.Sources = append(c.Sources, *source)
}

// AddRepository adds a repository to the candidate
func (c *Candidate) AddRepository(repo *Repository) {
	repo.ID = uuid.New().String()
	repo.CandidateID = c.ID
	repo.CreatedAt = time.Now()
	repo.UpdatedAt = time.Now()
	c.Repositories = append(c.Repositories, *repo)
}

// SetProfileInfo sets the profile information for the candidate
func (c *Candidate) SetProfileInfo(name, email, bio, company, location, blog, avatarURL string) {
	if name != "" {
		c.Name = &name
	}
	if email != "" {
		c.Email = &email
	}
	if bio != "" {
		c.Bio = &bio
	}
	if company != "" {
		c.Company = &company
	}
	if location != "" {
		c.Location = &location
	}
	if blog != "" {
		c.Blog = &blog
	}
	if avatarURL != "" {
		c.AvatarURL = &avatarURL
	}
	c.UpdatedAt = time.Now()
}

// UpdateStats updates the candidate's statistics
func (c *Candidate) UpdateStats(publicRepos, followers, following int, lastActivityAt *time.Time, hasTilRepo bool, tilRepoCount, longestProjectMonths int) {
	c.PublicRepos = publicRepos
	c.Followers = followers
	c.Following = following
	c.LastActivityAt = lastActivityAt
	c.HasTilRepo = hasTilRepo
	c.TilRepoCount = tilRepoCount
	c.LongestProjectMonths = longestProjectMonths
	c.UpdatedAt = time.Now()
}

// CandidateSource represents the source from which a candidate was discovered
type CandidateSource struct {
	ID          string     `json:"id" gorm:"primaryKey"`
	CandidateID string     `json:"candidateId" gorm:"index;not null"`
	SourceType  SourceType `json:"sourceType" gorm:"not null"`
	SourceName  string     `json:"sourceName" gorm:"not null"`
	SourceURL   string     `json:"sourceUrl,omitempty"`
	CreatedAt   time.Time  `json:"createdAt" gorm:"autoCreateTime"`
}

// NewCandidateSource creates a new CandidateSource
func NewCandidateSource(sourceType SourceType, sourceName, sourceURL string) *CandidateSource {
	return &CandidateSource{
		ID:         uuid.New().String(),
		SourceType: sourceType,
		SourceName: sourceName,
		SourceURL:  sourceURL,
		CreatedAt:  time.Now(),
	}
}

// Repository represents a GitHub repository
type Repository struct {
	ID          string     `json:"id" gorm:"primaryKey"`
	CandidateID string     `json:"candidateId" gorm:"index;not null"`
	Name        string     `json:"name" gorm:"not null"`
	FullName    string     `json:"fullName" gorm:"not null"`
	Description string     `json:"description,omitempty"`
	Language    string     `json:"language,omitempty"`
	StarCount   int        `json:"starCount"`
	ForkCount   int        `json:"forkCount"`
	URL         string     `json:"url,omitempty"`
	PushedAt    *time.Time `json:"pushedAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt   time.Time  `json:"updatedAt" gorm:"autoUpdateTime"`
	Analysis    *RepoAnalysis `json:"analysis,omitempty" gorm:"foreignKey:RepositoryID"`
}

// RepoAnalysis represents analysis results for a repository
type RepoAnalysis struct {
	ID               string         `json:"id" gorm:"primaryKey"`
	RepositoryID     string         `json:"repositoryId" gorm:"uniqueIndex;not null"`
	Languages        map[string]int `json:"languages" gorm:"serializer:json"`
	HasTests         bool           `json:"hasTests"`
	HasCI            bool           `json:"hasCi"`
	HasDocumentation bool           `json:"hasDocumentation"`
	CodeQualityScore float64        `json:"codeQualityScore"`
	LastAnalyzedAt   time.Time      `json:"lastAnalyzedAt"`
	CreatedAt        time.Time      `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt        time.Time      `json:"updatedAt" gorm:"autoUpdateTime"`
}

// SolvedAcProfile represents a solved.ac competitive programming profile
type SolvedAcProfile struct {
	ID              string         `json:"id" gorm:"primaryKey"`
	CandidateID     string         `json:"candidateId" gorm:"uniqueIndex;not null"`
	Handle          string         `json:"handle" gorm:"not null"`
	Tier            int            `json:"tier"`
	TierName        string         `json:"tierName,omitempty"`
	Rating          int            `json:"rating"`
	SolvedCount     int            `json:"solvedCount"`
	VoteCount       int            `json:"voteCount"`
	ClassLevel      int            `json:"classLevel"`
	ClassDecoration *string        `json:"classDecoration,omitempty"`
	MaxStreak       int            `json:"maxStreak"`
	Rank            *int           `json:"rank,omitempty"`
	TagStats        map[string]int `json:"tagStats,omitempty" gorm:"serializer:json"`
	CreatedAt       time.Time      `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt       time.Time      `json:"updatedAt" gorm:"autoUpdateTime"`
}

// OSSContribution represents a contribution to an open source project
type OSSContribution struct {
	ID                 string    `json:"id" gorm:"primaryKey"`
	CandidateID        string    `json:"candidateId" gorm:"index;not null"`
	RepoFullName       string    `json:"repoFullName" gorm:"not null"`
	RepoStars          int       `json:"repoStars"`
	ContributionType   string    `json:"contributionType"`
	ContributionCount  int       `json:"contributionCount"`
	IsSignificant      bool      `json:"isSignificant"`
	SignificanceReason string    `json:"significanceReason,omitempty"`
	CreatedAt          time.Time `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt          time.Time `json:"updatedAt" gorm:"autoUpdateTime"`
}

// CandidateFeedback represents feedback for a candidate
type CandidateFeedback struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	CandidateID string    `json:"candidateId" gorm:"index;not null"`
	Type        string    `json:"type" gorm:"not null"` // "POSITIVE" or "NEGATIVE"
	Reason      string    `json:"reason,omitempty"`
	Category    string    `json:"category,omitempty"`
	CreatedAt   time.Time `json:"createdAt" gorm:"autoCreateTime"`
}
