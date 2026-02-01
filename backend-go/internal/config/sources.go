package config

// SourceCategory represents the category of a crawl source
type SourceCategory string

const (
	SourceCategoryCompany    SourceCategory = "company"
	SourceCategoryUniversity SourceCategory = "university"
	SourceCategoryCommunity  SourceCategory = "community"
	SourceCategoryOSS        SourceCategory = "oss"
)

func (c SourceCategory) String() string {
	return string(c)
}

// CrawlSourceConfigEntry represents a configured crawl source
type CrawlSourceConfigEntry struct {
	Name        string                 `json:"name"`
	DisplayName string                 `json:"displayName"`
	Type        string                 `json:"type"`
	URL         string                 `json:"url"`
	Config      map[string]interface{} `json:"config"`
	Enabled     bool                   `json:"enabled"`
	Category    SourceCategory         `json:"category"`
	Description string                 `json:"description,omitempty"`
	Tags        []string               `json:"tags,omitempty"`
	Priority    int                    `json:"priority"`
}

// DefaultCrawlSources contains the default crawl sources
var DefaultCrawlSources = []CrawlSourceConfigEntry{
	{
		Name:        "toss",
		DisplayName: "Toss",
		Type:        "GITHUB_ORG",
		URL:         "https://github.com/toss",
		Config:      map[string]interface{}{"orgName": "toss"},
		Enabled:     true,
		Category:    SourceCategoryCompany,
		Description: "Toss - Korean fintech unicorn",
		Tags:        []string{"fintech", "unicorn"},
		Priority:    1,
	},
	{
		Name:        "woowabros",
		DisplayName: "Woowahan Bros",
		Type:        "GITHUB_ORG",
		URL:         "https://github.com/woowabros",
		Config:      map[string]interface{}{"orgName": "woowabros"},
		Enabled:     true,
		Category:    SourceCategoryCompany,
		Description: "Baedal Minjok - Korean food delivery platform",
		Tags:        []string{"foodtech", "platform"},
		Priority:    1,
	},
	{
		Name:        "kakao",
		DisplayName: "Kakao",
		Type:        "GITHUB_ORG",
		URL:         "https://github.com/kakao",
		Config:      map[string]interface{}{"orgName": "kakao"},
		Enabled:     true,
		Category:    SourceCategoryCompany,
		Description: "Kakao - Korean tech giant",
		Tags:        []string{"bigtech"},
		Priority:    1,
	},
	{
		Name:        "naver",
		DisplayName: "Naver",
		Type:        "GITHUB_ORG",
		URL:         "https://github.com/naver",
		Config:      map[string]interface{}{"orgName": "naver"},
		Enabled:     true,
		Category:    SourceCategoryCompany,
		Description: "Naver - Korean search and tech company",
		Tags:        []string{"bigtech"},
		Priority:    1,
	},
	{
		Name:        "line",
		DisplayName: "LINE",
		Type:        "GITHUB_ORG",
		URL:         "https://github.com/line",
		Config:      map[string]interface{}{"orgName": "line"},
		Enabled:     true,
		Category:    SourceCategoryCompany,
		Description: "LINE - Messaging platform",
		Tags:        []string{"messaging"},
		Priority:    2,
	},
	{
		Name:        "coupang",
		DisplayName: "Coupang",
		Type:        "GITHUB_ORG",
		URL:         "https://github.com/coupang",
		Config:      map[string]interface{}{"orgName": "coupang"},
		Enabled:     true,
		Category:    SourceCategoryCompany,
		Description: "Coupang - Korean e-commerce giant",
		Tags:        []string{"ecommerce"},
		Priority:    1,
	},
	{
		Name:        "krafton",
		DisplayName: "KRAFTON",
		Type:        "GITHUB_ORG",
		URL:         "https://github.com/krafton-ai",
		Config:      map[string]interface{}{"orgName": "krafton-ai"},
		Enabled:     true,
		Category:    SourceCategoryCompany,
		Description: "KRAFTON - Game company (PUBG)",
		Tags:        []string{"gaming", "ai"},
		Priority:    2,
	},
	{
		Name:        "devsisters",
		DisplayName: "Devsisters",
		Type:        "GITHUB_ORG",
		URL:         "https://github.com/devsisters",
		Config:      map[string]interface{}{"orgName": "devsisters"},
		Enabled:     true,
		Category:    SourceCategoryCompany,
		Description: "Devsisters - Cookie Run developer",
		Tags:        []string{"gaming"},
		Priority:    2,
	},
}

// GetAllCrawlSources returns all configured crawl sources
func GetAllCrawlSources() []CrawlSourceConfigEntry {
	return DefaultCrawlSources
}

// GetSourcesByCategory returns sources by category
func GetSourcesByCategory(category SourceCategory) []CrawlSourceConfigEntry {
	var result []CrawlSourceConfigEntry
	for _, source := range DefaultCrawlSources {
		if source.Category == category {
			result = append(result, source)
		}
	}
	return result
}

// GetEnabledSources returns enabled sources
func GetEnabledSources() []CrawlSourceConfigEntry {
	var result []CrawlSourceConfigEntry
	for _, source := range DefaultCrawlSources {
		if source.Enabled {
			result = append(result, source)
		}
	}
	return result
}

// GetSourceByName returns a source by name
func GetSourceByName(name string) *CrawlSourceConfigEntry {
	for _, source := range DefaultCrawlSources {
		if source.Name == name {
			return &source
		}
	}
	return nil
}
