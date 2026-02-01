package filter

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTargetRole_String(t *testing.T) {
	assert.Equal(t, "ALL", RoleAll.String())
	assert.Equal(t, "BACKEND", RoleBackend.String())
	assert.Equal(t, "FRONTEND", RoleFrontend.String())
	assert.Equal(t, "FULLSTACK", RoleFullstack.String())
	assert.Equal(t, "MOBILE", RoleMobile.String())
}

func TestTechStackFilterService_New(t *testing.T) {
	service := NewTechStackFilterService(RoleBackend)

	assert.NotNil(t, service)
	assert.Equal(t, RoleBackend, service.GetTargetRole())
}

func TestTechStackFilterService_DefaultRole(t *testing.T) {
	service := NewTechStackFilterService("")

	assert.Equal(t, RoleAll, service.GetTargetRole())
}

func TestTechStackFilterService_MatchesTargetRole_All(t *testing.T) {
	service := NewTechStackFilterService(RoleAll)

	context := &FilterContext{
		Repositories: []RepoInfo{{Language: "Python"}},
	}

	assert.True(t, service.MatchesTargetRole(context))
}

func TestTechStackFilterService_MatchesRole_Backend_Java(t *testing.T) {
	service := NewTechStackFilterService(RoleBackend)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "Java", Name: "spring-api", Description: "REST API"},
		},
	}

	assert.True(t, service.MatchesRole(context, RoleBackend))
}

func TestTechStackFilterService_MatchesRole_Backend_Go(t *testing.T) {
	service := NewTechStackFilterService(RoleBackend)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "Go", Name: "grpc-server"},
		},
	}

	assert.True(t, service.MatchesRole(context, RoleBackend))
}

func TestTechStackFilterService_MatchesRole_Frontend(t *testing.T) {
	service := NewTechStackFilterService(RoleFrontend)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "TypeScript", Name: "react-app", Description: "React frontend"},
		},
	}

	assert.True(t, service.MatchesRole(context, RoleFrontend))
}

func TestTechStackFilterService_MatchesRole_Mobile_Swift(t *testing.T) {
	service := NewTechStackFilterService(RoleMobile)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "Swift", Name: "ios-app"},
		},
	}

	assert.True(t, service.MatchesRole(context, RoleMobile))
}

func TestTechStackFilterService_MatchesRole_Mobile_Kotlin_Android(t *testing.T) {
	service := NewTechStackFilterService(RoleMobile)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "Kotlin", Name: "android-app", Description: "Android application"},
		},
	}

	assert.True(t, service.MatchesRole(context, RoleMobile))
}

func TestTechStackFilterService_MatchesRole_Excluded(t *testing.T) {
	service := NewTechStackFilterService(RoleBackend)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "JavaScript", Name: "react-native-app", Description: "Mobile app development"},
		},
	}

	// JavaScript only with mobile keywords should not match backend
	assert.False(t, service.MatchesRole(context, RoleBackend))
}

func TestTechStackFilterService_MatchesRole_ExcludedKeywords(t *testing.T) {
	service := NewTechStackFilterService(RoleBackend)

	context := &FilterContext{
		Bio: "UI/UX Designer",
		Repositories: []RepoInfo{
			{Language: "JavaScript"},
		},
	}

	assert.False(t, service.MatchesRole(context, RoleBackend))
}

func TestTechStackFilterService_MatchesRole_AmbiguousLanguage_TypeScript_Backend(t *testing.T) {
	service := NewTechStackFilterService(RoleBackend)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "TypeScript", Name: "nestjs-api", Description: "NestJS REST API backend"},
		},
	}

	assert.True(t, service.MatchesRole(context, RoleBackend))
}

func TestTechStackFilterService_MatchesRole_AmbiguousLanguage_TypeScript_Frontend(t *testing.T) {
	service := NewTechStackFilterService(RoleFrontend)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "TypeScript", Name: "react-dashboard", Description: "React dashboard with Redux"},
		},
	}

	assert.True(t, service.MatchesRole(context, RoleFrontend))
}

func TestTechStackFilterService_MatchesRole_Kotlin_Backend(t *testing.T) {
	service := NewTechStackFilterService(RoleBackend)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "Kotlin", Name: "spring-boot-api", Description: "Spring Boot backend service"},
		},
	}

	assert.True(t, service.MatchesRole(context, RoleBackend))
}

func TestTechStackFilterService_MatchesRoleStrict_Backend(t *testing.T) {
	service := NewTechStackFilterService(RoleBackend)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "Java", Name: "spring-api"},
			{Language: "Java", Name: "microservice"},
			{Language: "JavaScript", Name: "frontend-app"},
		},
	}

	assert.True(t, service.MatchesRoleStrict(context, RoleBackend))
}

func TestTechStackFilterService_MatchesRoleStrict_Backend_FailsRatio(t *testing.T) {
	service := NewTechStackFilterService(RoleBackend)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "Java", Name: "backend-api"},
			{Language: "JavaScript", Name: "frontend-1"},
			{Language: "JavaScript", Name: "frontend-2"},
			{Language: "TypeScript", Name: "react-app", Description: "React application"},
		},
	}

	// Backend repos are minority, should fail strict check
	assert.False(t, service.MatchesRoleStrict(context, RoleBackend))
}

func TestTechStackFilterService_AnalyzeBackendRatio(t *testing.T) {
	service := NewTechStackFilterService(RoleBackend)

	context := &FilterContext{
		Repositories: []RepoInfo{
			{Language: "Java", Name: "api-1"},
			{Language: "Java", Name: "api-2"},
			{Language: "Go", Name: "service"},
			{Language: "JavaScript", Name: "frontend"},
		},
	}

	analysis := service.AnalyzeBackendRatio(context)

	assert.Equal(t, 3, analysis.BackendCount)
	assert.Equal(t, 1, analysis.FrontendCount)
	assert.Equal(t, 0.75, analysis.BackendRatio)
	assert.True(t, analysis.PassesFilter)
}

func TestTechStackFilterService_AnalyzeBackendRatio_EmptyRepos(t *testing.T) {
	service := NewTechStackFilterService(RoleBackend)

	context := &FilterContext{
		Repositories: []RepoInfo{},
	}

	analysis := service.AnalyzeBackendRatio(context)

	assert.Equal(t, 0, analysis.BackendCount)
	assert.Equal(t, 0, analysis.FrontendCount)
	assert.Equal(t, 0.0, analysis.BackendRatio)
}

func TestFilterContext_BuildTextContext(t *testing.T) {
	context := &FilterContext{
		Bio:     "Backend Developer",
		Company: "Tech Corp",
		Repositories: []RepoInfo{
			{Name: "api-server", Description: "REST API"},
		},
	}

	text := context.BuildTextContext()

	assert.Contains(t, text, "backend developer")
	assert.Contains(t, text, "tech corp")
	assert.Contains(t, text, "api-server")
	assert.Contains(t, text, "rest api")
}

func TestParseTargetRole(t *testing.T) {
	tests := []struct {
		input    string
		expected TargetRole
	}{
		{"backend", RoleBackend},
		{"BACKEND", RoleBackend},
		{"Backend", RoleBackend},
		{"frontend", RoleFrontend},
		{"mobile", RoleMobile},
		{"fullstack", RoleFullstack},
		{"all", RoleAll},
		{"invalid", RoleAll},
		{"", RoleAll},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := ParseTargetRole(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
