package scoring

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestStrategyRegistry_NewRegistry(t *testing.T) {
	registry := NewStrategyRegistry()

	assert.NotNil(t, registry)
	assert.Len(t, registry.GetAllStrategies(), 5)
}

func TestStrategyRegistry_GetStrategy(t *testing.T) {
	registry := NewStrategyRegistry()

	strategy, exists := registry.GetStrategy("activity")

	assert.True(t, exists)
	assert.NotNil(t, strategy)
	assert.Equal(t, "activity", strategy.Name())
}

func TestStrategyRegistry_GetStrategy_NotFound(t *testing.T) {
	registry := NewStrategyRegistry()

	strategy, exists := registry.GetStrategy("nonexistent")

	assert.False(t, exists)
	assert.Nil(t, strategy)
}

func TestStrategyRegistry_GetEnabledStrategies(t *testing.T) {
	registry := NewStrategyRegistry()

	enabled := registry.GetEnabledStrategies()

	assert.Len(t, enabled, 5)
}

func TestStrategyRegistry_Disable(t *testing.T) {
	registry := NewStrategyRegistry()

	registry.Disable("activity")

	enabled := registry.GetEnabledStrategies()
	assert.Len(t, enabled, 4)

	strategy, exists := registry.GetStrategy("activity")
	assert.True(t, exists)
	assert.NotNil(t, strategy)
}

func TestStrategyRegistry_Enable(t *testing.T) {
	registry := NewStrategyRegistry()
	registry.Disable("activity")

	registry.Enable("activity")

	enabled := registry.GetEnabledStrategies()
	assert.Len(t, enabled, 5)
}

func TestStrategyRegistry_SetWeight(t *testing.T) {
	registry := NewStrategyRegistry()

	err := registry.SetWeight("activity", 0.5)

	assert.NoError(t, err)
	config := registry.GetConfig("activity")
	assert.Equal(t, 0.5, config.Weight)
}

func TestStrategyRegistry_SetWeight_InvalidRange(t *testing.T) {
	registry := NewStrategyRegistry()

	err := registry.SetWeight("activity", 1.5)

	assert.Error(t, err)
}

func TestStrategyRegistry_SetWeight_NegativeWeight(t *testing.T) {
	registry := NewStrategyRegistry()

	err := registry.SetWeight("activity", -0.1)

	assert.Error(t, err)
}

func TestStrategyRegistry_SetWeight_NotFound(t *testing.T) {
	registry := NewStrategyRegistry()

	err := registry.SetWeight("nonexistent", 0.5)

	assert.Error(t, err)
}

func TestStrategyRegistry_GetNormalizedWeights(t *testing.T) {
	registry := NewStrategyRegistry()

	weights := registry.GetNormalizedWeights()

	var total float64
	for _, weight := range weights {
		total += weight
	}
	assert.InDelta(t, 1.0, total, 0.0001)
}

func TestStrategyRegistry_GetNormalizedWeights_AllDisabled(t *testing.T) {
	registry := NewStrategyRegistry()
	for _, s := range registry.GetAllStrategies() {
		registry.Disable(s.Strategy.Name())
	}

	weights := registry.GetNormalizedWeights()

	assert.Len(t, weights, 0)
}

func TestStrategyRegistry_UpdateConfig(t *testing.T) {
	registry := NewStrategyRegistry()

	err := registry.UpdateConfig("activity", &StrategyConfigUpdate{
		Enabled: boolPtr(false),
		Weight:  float64Ptr(0.3),
	})

	assert.NoError(t, err)
	config := registry.GetConfig("activity")
	assert.False(t, config.Enabled)
	assert.Equal(t, 0.3, config.Weight)
}

func TestStrategyRegistry_UpdateConfig_NotFound(t *testing.T) {
	registry := NewStrategyRegistry()

	err := registry.UpdateConfig("nonexistent", &StrategyConfigUpdate{})

	assert.Error(t, err)
}

func TestStrategyConfig_Defaults(t *testing.T) {
	registry := NewStrategyRegistry()

	config := registry.GetConfig("activity")

	assert.True(t, config.Enabled)
	assert.Equal(t, 0.25, config.Weight)
	assert.Equal(t, "activity", config.Name)
}

func TestStrategyWithConfig_Struct(t *testing.T) {
	registry := NewStrategyRegistry()

	all := registry.GetAllStrategies()

	for _, swc := range all {
		assert.NotNil(t, swc.Strategy)
		assert.NotNil(t, swc.Config)
		assert.Equal(t, swc.Strategy.Name(), swc.Config.Name)
	}
}

// Helper functions
func boolPtr(b bool) *bool {
	return &b
}

func float64Ptr(f float64) *float64 {
	return &f
}
