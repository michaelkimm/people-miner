package scoring

import (
	"math"

	"github.com/peopleminer/backend-go/internal/domain"
)

// ScoreResult represents the result of a scoring calculation
type ScoreResult struct {
	Score   float64                `json:"score"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// Strategy defines the interface for scoring strategies
type Strategy interface {
	Name() string
	DefaultWeight() float64
	Calculate(candidate *domain.Candidate) *ScoreResult
}

// ActivityStrategy scores candidates based on their GitHub activity
type ActivityStrategy struct{}

func NewActivityStrategy() *ActivityStrategy {
	return &ActivityStrategy{}
}

func (s *ActivityStrategy) Name() string {
	return "activity"
}

func (s *ActivityStrategy) DefaultWeight() float64 {
	return 0.25
}

func (s *ActivityStrategy) Calculate(candidate *domain.Candidate) *ScoreResult {
	var score float64
	details := make(map[string]interface{})

	// Repo count score (max 25 points)
	repoScore := math.Min(float64(candidate.PublicRepos)/100.0*25.0, 25.0)
	details["repoScore"] = repoScore
	score += repoScore

	// Longest project duration score (max 25 points)
	projectScore := math.Min(float64(candidate.LongestProjectMonths)/24.0*25.0, 25.0)
	details["projectDurationScore"] = projectScore
	score += projectScore

	// TIL repo bonus (max 25 points)
	if candidate.HasTilRepo {
		tilScore := math.Min(float64(candidate.TilRepoCount)*10.0, 25.0)
		details["tilScore"] = tilScore
		score += tilScore
	}

	// Recent activity score (max 25 points)
	if candidate.LastActivityAt != nil {
		daysSinceActivity := float64(0) // simplified
		activityScore := math.Max(0, 25.0-daysSinceActivity/30.0*5.0)
		details["recentActivityScore"] = activityScore
		score += activityScore
	}

	return &ScoreResult{
		Score:   math.Min(score, 100),
		Details: details,
	}
}

// InfluenceStrategy scores candidates based on their community influence
type InfluenceStrategy struct{}

func NewInfluenceStrategy() *InfluenceStrategy {
	return &InfluenceStrategy{}
}

func (s *InfluenceStrategy) Name() string {
	return "influence"
}

func (s *InfluenceStrategy) DefaultWeight() float64 {
	return 0.2
}

func (s *InfluenceStrategy) Calculate(candidate *domain.Candidate) *ScoreResult {
	var score float64
	details := make(map[string]interface{})

	// Followers score (max 50 points, logarithmic scale)
	if candidate.Followers > 0 {
		followerScore := math.Min(math.Log10(float64(candidate.Followers))*20.0, 50.0)
		details["followerScore"] = followerScore
		score += followerScore
	}

	// Stars score (max 50 points)
	var totalStars int
	for _, repo := range candidate.Repositories {
		totalStars += repo.StarCount
	}
	if totalStars > 0 {
		starScore := math.Min(math.Log10(float64(totalStars))*20.0, 50.0)
		details["starScore"] = starScore
		score += starScore
	}

	details["totalStars"] = totalStars
	details["followers"] = candidate.Followers

	return &ScoreResult{
		Score:   math.Min(score, 100),
		Details: details,
	}
}

// CodeQualityStrategy scores candidates based on their code quality indicators
type CodeQualityStrategy struct{}

func NewCodeQualityStrategy() *CodeQualityStrategy {
	return &CodeQualityStrategy{}
}

func (s *CodeQualityStrategy) Name() string {
	return "code_quality"
}

func (s *CodeQualityStrategy) DefaultWeight() float64 {
	return 0.25
}

func (s *CodeQualityStrategy) Calculate(candidate *domain.Candidate) *ScoreResult {
	var score float64
	details := make(map[string]interface{})

	var analyzedRepos int
	var totalQualityScore float64

	for _, repo := range candidate.Repositories {
		if repo.Analysis != nil {
			analyzedRepos++

			repoScore := repo.Analysis.CodeQualityScore

			// Bonus for having tests
			if repo.Analysis.HasTests {
				repoScore += 10
			}
			// Bonus for having CI
			if repo.Analysis.HasCI {
				repoScore += 10
			}
			// Bonus for documentation
			if repo.Analysis.HasDocumentation {
				repoScore += 5
			}

			totalQualityScore += math.Min(repoScore, 100)
		}
	}

	if analyzedRepos > 0 {
		score = totalQualityScore / float64(analyzedRepos)
	}

	details["analyzedRepos"] = analyzedRepos
	details["averageQualityScore"] = score

	return &ScoreResult{
		Score:   math.Min(score, 100),
		Details: details,
	}
}

// ProblemSolvingStrategy scores candidates based on their OSS contributions
type ProblemSolvingStrategy struct{}

func NewProblemSolvingStrategy() *ProblemSolvingStrategy {
	return &ProblemSolvingStrategy{}
}

func (s *ProblemSolvingStrategy) Name() string {
	return "problem_solving"
}

func (s *ProblemSolvingStrategy) DefaultWeight() float64 {
	return 0.15
}

func (s *ProblemSolvingStrategy) Calculate(candidate *domain.Candidate) *ScoreResult {
	var score float64
	details := make(map[string]interface{})

	contributions := candidate.OSSContributions
	if len(contributions) == 0 {
		return &ScoreResult{Score: 0, Details: details}
	}

	var significantCount int
	var totalRepoStars int

	for _, contrib := range contributions {
		if contrib.IsSignificant {
			significantCount++
		}
		totalRepoStars += contrib.RepoStars
	}

	// Contribution count score (max 40 points)
	contribScore := math.Min(float64(len(contributions))*10.0, 40.0)
	details["contributionCountScore"] = contribScore
	score += contribScore

	// Significant contribution bonus (max 30 points)
	significantScore := math.Min(float64(significantCount)*15.0, 30.0)
	details["significantContributionScore"] = significantScore
	score += significantScore

	// Popular repo contribution score (max 30 points)
	if totalRepoStars > 0 {
		popularScore := math.Min(math.Log10(float64(totalRepoStars))*10.0, 30.0)
		details["popularRepoScore"] = popularScore
		score += popularScore
	}

	details["totalContributions"] = len(contributions)
	details["significantContributions"] = significantCount

	return &ScoreResult{
		Score:   math.Min(score, 100),
		Details: details,
	}
}

// SolvedAcStrategy scores candidates based on their solved.ac profile
type SolvedAcStrategy struct{}

func NewSolvedAcStrategy() *SolvedAcStrategy {
	return &SolvedAcStrategy{}
}

func (s *SolvedAcStrategy) Name() string {
	return "solved_ac"
}

func (s *SolvedAcStrategy) DefaultWeight() float64 {
	return 0.15
}

func (s *SolvedAcStrategy) Calculate(candidate *domain.Candidate) *ScoreResult {
	details := make(map[string]interface{})

	profile := candidate.SolvedAcProfile
	if profile == nil {
		return &ScoreResult{Score: 0, Details: details}
	}

	var score float64

	// Tier score (max 40 points)
	// Tier ranges from 0 (Unrated) to 31 (Master)
	tierScore := math.Min(float64(profile.Tier)/31.0*40.0, 40.0)
	details["tierScore"] = tierScore
	score += tierScore

	// Solved count score (max 30 points)
	solvedScore := math.Min(float64(profile.SolvedCount)/1000.0*30.0, 30.0)
	details["solvedCountScore"] = solvedScore
	score += solvedScore

	// Rating score (max 20 points)
	ratingScore := math.Min(float64(profile.Rating)/3000.0*20.0, 20.0)
	details["ratingScore"] = ratingScore
	score += ratingScore

	// Streak score (max 10 points)
	streakScore := math.Min(float64(profile.MaxStreak)/365.0*10.0, 10.0)
	details["streakScore"] = streakScore
	score += streakScore

	details["tier"] = profile.Tier
	details["tierName"] = profile.TierName
	details["solvedCount"] = profile.SolvedCount
	details["rating"] = profile.Rating

	return &ScoreResult{
		Score:   math.Min(score, 100),
		Details: details,
	}
}
