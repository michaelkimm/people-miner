package filter

import (
	"strings"
)

// TargetRole represents the target developer role
type TargetRole string

const (
	RoleAll       TargetRole = "ALL"
	RoleBackend   TargetRole = "BACKEND"
	RoleFrontend  TargetRole = "FRONTEND"
	RoleFullstack TargetRole = "FULLSTACK"
	RoleMobile    TargetRole = "MOBILE"
)

func (r TargetRole) String() string {
	return string(r)
}

// ParseTargetRole parses a string to a TargetRole
func ParseTargetRole(s string) TargetRole {
	switch strings.ToUpper(s) {
	case "BACKEND":
		return RoleBackend
	case "FRONTEND":
		return RoleFrontend
	case "FULLSTACK":
		return RoleFullstack
	case "MOBILE":
		return RoleMobile
	case "ALL":
		return RoleAll
	default:
		return RoleAll
	}
}

// RoleConfig defines the configuration for a role
type RoleConfig struct {
	Languages       []string
	Keywords        []string
	ExcludeLanguages []string
	ExcludeKeywords []string
}

// TechStackConfig holds the configuration for all roles
var TechStackConfig = map[TargetRole]*RoleConfig{
	RoleBackend: {
		Languages: []string{"java", "go", "python", "rust", "c#", "scala", "ruby", "php", "c++"},
		Keywords: []string{
			"backend", "server", "api", "rest", "grpc", "microservice",
			"spring", "django", "flask", "fastapi", "gin", "echo",
			"database", "sql", "nosql", "redis", "kafka", "rabbitmq",
			"docker", "kubernetes", "k8s", "devops", "aws", "gcp", "azure",
			"nestjs", "express", "node.js", "backend",
		},
		ExcludeLanguages: []string{},
		ExcludeKeywords:  []string{"ui/ux", "designer", "graphic", "figma"},
	},
	RoleFrontend: {
		Languages: []string{"javascript", "typescript", "vue", "svelte"},
		Keywords: []string{
			"frontend", "front-end", "react", "vue", "angular", "svelte",
			"nextjs", "nuxt", "gatsby", "webpack", "vite",
			"css", "scss", "sass", "tailwind", "styled-components",
			"redux", "mobx", "zustand", "recoil",
		},
		ExcludeLanguages: []string{},
		ExcludeKeywords:  []string{"ui/ux", "designer"},
	},
	RoleMobile: {
		Languages: []string{"swift", "objective-c", "dart"},
		Keywords: []string{
			"ios", "android", "mobile", "flutter", "react native", "react-native",
			"swiftui", "uikit", "jetpack compose", "kotlin multiplatform",
		},
		ExcludeLanguages: []string{},
		ExcludeKeywords:  []string{},
	},
	RoleFullstack: {
		Languages: []string{"javascript", "typescript", "python", "java", "go", "ruby", "php"},
		Keywords: []string{
			"fullstack", "full-stack", "full stack",
		},
		ExcludeLanguages: []string{},
		ExcludeKeywords:  []string{},
	},
}

// AmbiguousLanguages are languages that can be used for multiple roles
var AmbiguousLanguages = []string{"javascript", "typescript", "python"}

// KotlinAndroidKeywords help identify Kotlin usage for Android
var KotlinAndroidKeywords = []string{"android", "jetpack", "compose", "kotlin multiplatform", "kmp"}

// KotlinBackendKeywords help identify Kotlin usage for backend
var KotlinBackendKeywords = []string{"spring", "ktor", "backend", "server", "api", "microservice"}

// MinBackendLanguageRatio is the minimum ratio for strict backend matching
const MinBackendLanguageRatio = 0.5

// FilterContext holds the context for filtering
type FilterContext struct {
	Repositories []RepoInfo
	Bio          string
	Company      string
}

// RepoInfo holds repository information for filtering
type RepoInfo struct {
	Language    string
	Name        string
	Description string
}

// BuildTextContext builds a searchable text context
func (c *FilterContext) BuildTextContext() string {
	var sb strings.Builder

	if c.Bio != "" {
		sb.WriteString(c.Bio)
		sb.WriteString(" ")
	}
	if c.Company != "" {
		sb.WriteString(c.Company)
		sb.WriteString(" ")
	}
	for _, repo := range c.Repositories {
		if repo.Name != "" {
			sb.WriteString(repo.Name)
			sb.WriteString(" ")
		}
		if repo.Description != "" {
			sb.WriteString(repo.Description)
			sb.WriteString(" ")
		}
	}

	return strings.ToLower(sb.String())
}

// BackendRatioAnalysis holds the result of backend ratio analysis
type BackendRatioAnalysis struct {
	BackendCount  int
	FrontendCount int
	BackendRatio  float64
	PassesFilter  bool
}

// TechStackFilterService filters candidates by tech stack
type TechStackFilterService struct {
	targetRole TargetRole
}

// NewTechStackFilterService creates a new TechStackFilterService
func NewTechStackFilterService(role TargetRole) *TechStackFilterService {
	if role == "" {
		role = RoleAll
	}
	return &TechStackFilterService{
		targetRole: role,
	}
}

// GetTargetRole returns the target role
func (s *TechStackFilterService) GetTargetRole() TargetRole {
	return s.targetRole
}

// MatchesTargetRole checks if context matches the configured target role
func (s *TechStackFilterService) MatchesTargetRole(context *FilterContext) bool {
	return s.MatchesRole(context, s.targetRole)
}

// MatchesRole checks if context matches the given role
func (s *TechStackFilterService) MatchesRole(context *FilterContext, role TargetRole) bool {
	if role == RoleAll {
		return true
	}

	config, exists := TechStackConfig[role]
	if !exists {
		return false
	}

	languages := s.extractLanguages(context.Repositories)
	textContext := context.BuildTextContext()

	// Check excluded keywords
	if s.hasExcludedKeywords(textContext, config.ExcludeKeywords) {
		return false
	}

	// Check if only excluded languages
	if s.hasExcludedLanguagesOnly(languages, config.ExcludeLanguages, config.Languages) {
		return false
	}

	// Check for target languages
	if s.hasTargetLanguages(languages, config.Languages, textContext, role) {
		return true
	}

	// Check for target keywords
	return s.hasTargetKeywords(textContext, config.Keywords)
}

// MatchesRoleStrict checks with strict backend ratio requirements
func (s *TechStackFilterService) MatchesRoleStrict(context *FilterContext, role TargetRole) bool {
	if role != RoleBackend {
		return s.MatchesRole(context, role)
	}

	if !s.MatchesRole(context, role) {
		return false
	}

	analysis := s.AnalyzeBackendRatio(context)
	return analysis.PassesFilter
}

// AnalyzeBackendRatio analyzes the backend to frontend ratio
func (s *TechStackFilterService) AnalyzeBackendRatio(context *FilterContext) *BackendRatioAnalysis {
	backendConfig := TechStackConfig[RoleBackend]
	frontendConfig := TechStackConfig[RoleFrontend]

	backendLangs := make(map[string]bool)
	for _, lang := range backendConfig.Languages {
		backendLangs[strings.ToLower(lang)] = true
	}

	frontendLangs := make(map[string]bool)
	for _, lang := range frontendConfig.Languages {
		frontendLangs[strings.ToLower(lang)] = true
	}

	ambiguous := make(map[string]bool)
	for _, lang := range AmbiguousLanguages {
		ambiguous[strings.ToLower(lang)] = true
	}

	var backendCount, frontendCount int

	for _, repo := range context.Repositories {
		if repo.Language == "" {
			continue
		}
		lang := strings.ToLower(repo.Language)

		if ambiguous[lang] {
			repoContext := strings.ToLower(repo.Name + " " + repo.Description)

			hasBackendContext := s.hasTargetKeywords(repoContext, backendConfig.Keywords)
			hasFrontendContext := s.hasTargetKeywords(repoContext, frontendConfig.Keywords)

			if hasBackendContext && !hasFrontendContext {
				backendCount++
			} else if hasFrontendContext && !hasBackendContext {
				frontendCount++
			}
			continue
		}

		if lang == "kotlin" {
			repoContext := strings.ToLower(repo.Name + " " + repo.Description)
			isAndroid := s.hasTargetKeywords(repoContext, KotlinAndroidKeywords)
			isBackend := s.hasTargetKeywords(repoContext, KotlinBackendKeywords)

			if isBackend && !isAndroid {
				backendCount++
			}
			continue
		}

		if backendLangs[lang] {
			backendCount++
		} else if frontendLangs[lang] {
			frontendCount++
		}
	}

	total := backendCount + frontendCount
	var backendRatio float64
	if total > 0 {
		backendRatio = float64(backendCount) / float64(total)
	}

	return &BackendRatioAnalysis{
		BackendCount:  backendCount,
		FrontendCount: frontendCount,
		BackendRatio:  backendRatio,
		PassesFilter:  backendRatio >= MinBackendLanguageRatio,
	}
}

func (s *TechStackFilterService) extractLanguages(repos []RepoInfo) []string {
	seen := make(map[string]bool)
	var languages []string

	for _, repo := range repos {
		if repo.Language != "" {
			lang := strings.ToLower(repo.Language)
			if !seen[lang] {
				seen[lang] = true
				languages = append(languages, lang)
			}
		}
	}
	return languages
}

func (s *TechStackFilterService) hasExcludedKeywords(textContext string, excludeKeywords []string) bool {
	for _, keyword := range excludeKeywords {
		if strings.Contains(textContext, strings.ToLower(keyword)) {
			return true
		}
	}
	return false
}

func (s *TechStackFilterService) hasExcludedLanguagesOnly(languages, excludeLanguages, targetLanguages []string) bool {
	if len(languages) == 0 || len(excludeLanguages) == 0 {
		return false
	}

	excludeSet := make(map[string]bool)
	for _, lang := range excludeLanguages {
		excludeSet[strings.ToLower(lang)] = true
	}

	targetSet := make(map[string]bool)
	for _, lang := range targetLanguages {
		targetSet[strings.ToLower(lang)] = true
	}

	for _, lang := range languages {
		if !excludeSet[lang] || targetSet[lang] {
			return false
		}
	}
	return true
}

func (s *TechStackFilterService) hasTargetLanguages(languages, targetLanguages []string, textContext string, role TargetRole) bool {
	targetSet := make(map[string]bool)
	for _, lang := range targetLanguages {
		targetSet[strings.ToLower(lang)] = true
	}

	for _, lang := range languages {
		// Handle ambiguous languages
		isAmbiguous := false
		for _, al := range AmbiguousLanguages {
			if strings.EqualFold(lang, al) {
				isAmbiguous = true
				break
			}
		}

		if isAmbiguous {
			if role == RoleBackend {
				if s.hasTargetKeywords(textContext, TechStackConfig[RoleBackend].Keywords) {
					return true
				}
			} else if role == RoleFrontend {
				if s.hasTargetKeywords(textContext, TechStackConfig[RoleFrontend].Keywords) {
					return true
				}
			} else if role == RoleFullstack {
				return true
			}
			continue
		}

		// Handle Kotlin ambiguity
		if strings.EqualFold(lang, "kotlin") {
			isAndroid := s.hasTargetKeywords(textContext, KotlinAndroidKeywords)
			isBackend := s.hasTargetKeywords(textContext, KotlinBackendKeywords)

			if role == RoleBackend && isBackend && !isAndroid {
				return true
			}
			if role == RoleMobile && isAndroid {
				return true
			}
			if role == RoleFullstack && isBackend {
				return true
			}
			continue
		}

		if targetSet[lang] {
			return true
		}
	}

	return false
}

func (s *TechStackFilterService) hasTargetKeywords(textContext string, keywords []string) bool {
	for _, keyword := range keywords {
		if strings.Contains(textContext, strings.ToLower(keyword)) {
			return true
		}
	}
	return false
}
