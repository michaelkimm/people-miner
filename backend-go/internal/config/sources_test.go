package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSourceCategory_String(t *testing.T) {
	assert.Equal(t, "company", SourceCategoryCompany.String())
	assert.Equal(t, "university", SourceCategoryUniversity.String())
	assert.Equal(t, "community", SourceCategoryCommunity.String())
	assert.Equal(t, "oss", SourceCategoryOSS.String())
}

func TestCrawlSourceConfigEntry_Fields(t *testing.T) {
	entry := &CrawlSourceConfigEntry{
		Name:        "test-source",
		DisplayName: "Test Source",
		Type:        "GITHUB_ORG",
		URL:         "https://github.com/test",
		Config: map[string]interface{}{
			"orgName": "test-org",
		},
		Enabled:     true,
		Category:    SourceCategoryCompany,
		Description: "A test source",
		Tags:        []string{"tech", "startup"},
		Priority:    1,
	}

	assert.Equal(t, "test-source", entry.Name)
	assert.Equal(t, "Test Source", entry.DisplayName)
	assert.Equal(t, "GITHUB_ORG", entry.Type)
	assert.True(t, entry.Enabled)
	assert.Equal(t, SourceCategoryCompany, entry.Category)
	assert.Len(t, entry.Tags, 2)
	assert.Equal(t, 1, entry.Priority)
}

func TestGetAllCrawlSources(t *testing.T) {
	sources := GetAllCrawlSources()

	assert.NotEmpty(t, sources)
	assert.Greater(t, len(sources), 0)
}

func TestGetSourcesByCategory(t *testing.T) {
	sources := GetSourcesByCategory(SourceCategoryCompany)

	for _, source := range sources {
		assert.Equal(t, SourceCategoryCompany, source.Category)
	}
}

func TestGetEnabledSources(t *testing.T) {
	sources := GetEnabledSources()

	for _, source := range sources {
		assert.True(t, source.Enabled)
	}
}

func TestGetSourceByName(t *testing.T) {
	allSources := GetAllCrawlSources()
	if len(allSources) == 0 {
		t.Skip("No sources configured")
	}

	firstName := allSources[0].Name
	source := GetSourceByName(firstName)

	assert.NotNil(t, source)
	assert.Equal(t, firstName, source.Name)
}

func TestGetSourceByName_NotFound(t *testing.T) {
	source := GetSourceByName("nonexistent-source")

	assert.Nil(t, source)
}

func TestDefaultCrawlSources(t *testing.T) {
	sources := DefaultCrawlSources

	assert.NotNil(t, sources)

	for _, source := range sources {
		assert.NotEmpty(t, source.Name)
		assert.NotEmpty(t, source.Type)
		assert.NotEmpty(t, source.URL)
	}
}
