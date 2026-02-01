package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConfig_Load_Defaults(t *testing.T) {
	// Clear any existing env vars
	os.Clearenv()

	cfg := Load()

	assert.Equal(t, "8080", cfg.Server.Port)
	assert.Equal(t, "0.0.0.0", cfg.Server.Host)
	assert.Equal(t, "localhost", cfg.Database.Host)
	assert.Equal(t, "5432", cfg.Database.Port)
	assert.Equal(t, "postgres", cfg.Database.User)
	assert.Equal(t, "peopleminer", cfg.Database.Name)
	assert.Equal(t, "ALL", cfg.App.TargetRole)
}

func TestConfig_Load_FromEnv(t *testing.T) {
	os.Setenv("PORT", "3000")
	os.Setenv("DB_HOST", "db.example.com")
	os.Setenv("GITHUB_TOKEN", "test-token")
	os.Setenv("TARGET_ROLE", "BACKEND")
	defer func() {
		os.Unsetenv("PORT")
		os.Unsetenv("DB_HOST")
		os.Unsetenv("GITHUB_TOKEN")
		os.Unsetenv("TARGET_ROLE")
	}()

	cfg := Load()

	assert.Equal(t, "3000", cfg.Server.Port)
	assert.Equal(t, "db.example.com", cfg.Database.Host)
	assert.Equal(t, "test-token", cfg.GitHub.Token)
	assert.Equal(t, "BACKEND", cfg.App.TargetRole)
}

func TestDatabaseConfig_DSN(t *testing.T) {
	dbCfg := &DatabaseConfig{
		Host:     "localhost",
		Port:     "5432",
		User:     "user",
		Password: "password",
		Name:     "testdb",
		SSLMode:  "disable",
	}

	dsn := dbCfg.DSN()

	assert.Contains(t, dsn, "host=localhost")
	assert.Contains(t, dsn, "port=5432")
	assert.Contains(t, dsn, "user=user")
	assert.Contains(t, dsn, "password=password")
	assert.Contains(t, dsn, "dbname=testdb")
	assert.Contains(t, dsn, "sslmode=disable")
}

func TestGetEnv(t *testing.T) {
	os.Setenv("TEST_VAR", "test_value")
	defer os.Unsetenv("TEST_VAR")

	assert.Equal(t, "test_value", getEnv("TEST_VAR", "default"))
	assert.Equal(t, "default", getEnv("NON_EXISTENT", "default"))
}

func TestGetEnvInt(t *testing.T) {
	os.Setenv("TEST_INT", "42")
	os.Setenv("TEST_INVALID", "not_a_number")
	defer func() {
		os.Unsetenv("TEST_INT")
		os.Unsetenv("TEST_INVALID")
	}()

	assert.Equal(t, 42, getEnvInt("TEST_INT", 0))
	assert.Equal(t, 0, getEnvInt("TEST_INVALID", 0))
	assert.Equal(t, 10, getEnvInt("NON_EXISTENT", 10))
}
