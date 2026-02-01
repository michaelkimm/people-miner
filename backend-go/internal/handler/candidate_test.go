package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/peopleminer/backend-go/internal/domain"
	"github.com/stretchr/testify/assert"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestCandidateHandler_GetByID(t *testing.T) {
	mockService := &mockCandidateService{
		candidate: domain.NewCandidate("testuser", 12345),
	}
	handler := NewCandidateHandler(mockService)

	router := gin.New()
	router.GET("/candidates/:id", handler.GetByID)

	req := httptest.NewRequest(http.MethodGet, "/candidates/"+mockService.candidate.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response domain.Candidate
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "testuser", response.GithubUsername)
}

func TestCandidateHandler_GetByID_NotFound(t *testing.T) {
	mockService := &mockCandidateService{
		err: ErrNotFound,
	}
	handler := NewCandidateHandler(mockService)

	router := gin.New()
	router.GET("/candidates/:id", handler.GetByID)

	req := httptest.NewRequest(http.MethodGet, "/candidates/nonexistent", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestCandidateHandler_List(t *testing.T) {
	mockService := &mockCandidateService{
		candidates: []*domain.Candidate{
			domain.NewCandidate("user1", 1),
			domain.NewCandidate("user2", 2),
		},
		total: 2,
	}
	handler := NewCandidateHandler(mockService)

	router := gin.New()
	router.GET("/candidates", handler.List)

	req := httptest.NewRequest(http.MethodGet, "/candidates?page=1&limit=10", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response ListResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Len(t, response.Data, 2)
	assert.Equal(t, int64(2), response.Total)
}

func TestCandidateHandler_List_DefaultPagination(t *testing.T) {
	mockService := &mockCandidateService{
		candidates: []*domain.Candidate{},
		total:      0,
	}
	handler := NewCandidateHandler(mockService)

	router := gin.New()
	router.GET("/candidates", handler.List)

	req := httptest.NewRequest(http.MethodGet, "/candidates", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestCandidateHandler_Delete(t *testing.T) {
	mockService := &mockCandidateService{}
	handler := NewCandidateHandler(mockService)

	router := gin.New()
	router.DELETE("/candidates/:id", handler.Delete)

	req := httptest.NewRequest(http.MethodDelete, "/candidates/test-id", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
}

func TestListResponse_Struct(t *testing.T) {
	response := &ListResponse{
		Data:  []interface{}{"item1", "item2"},
		Total: 100,
		Page:  1,
		Limit: 20,
	}

	assert.Len(t, response.Data, 2)
	assert.Equal(t, int64(100), response.Total)
	assert.Equal(t, 1, response.Page)
	assert.Equal(t, 20, response.Limit)
}

func TestErrorResponse_Struct(t *testing.T) {
	response := &ErrorResponse{
		Error:   "Not Found",
		Message: "Resource not found",
	}

	assert.Equal(t, "Not Found", response.Error)
	assert.Equal(t, "Resource not found", response.Message)
}
