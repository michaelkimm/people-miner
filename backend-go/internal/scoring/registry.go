package scoring

import (
	"errors"
	"sync"
)

// StrategyConfig holds the configuration for a scoring strategy
type StrategyConfig struct {
	Name    string   `json:"name"`
	Enabled bool     `json:"enabled"`
	Weight  float64  `json:"weight"`
}

// StrategyConfigUpdate holds optional update fields
type StrategyConfigUpdate struct {
	Enabled *bool    `json:"enabled,omitempty"`
	Weight  *float64 `json:"weight,omitempty"`
}

// StrategyWithConfig pairs a strategy with its configuration
type StrategyWithConfig struct {
	Strategy Strategy        `json:"strategy"`
	Config   *StrategyConfig `json:"config"`
}

// StrategyRegistry manages scoring strategies
type StrategyRegistry struct {
	mu         sync.RWMutex
	strategies map[string]Strategy
	configs    map[string]*StrategyConfig
}

// NewStrategyRegistry creates a new StrategyRegistry with default strategies
func NewStrategyRegistry() *StrategyRegistry {
	registry := &StrategyRegistry{
		strategies: make(map[string]Strategy),
		configs:    make(map[string]*StrategyConfig),
	}

	// Register default strategies
	registry.Register(NewActivityStrategy())
	registry.Register(NewInfluenceStrategy())
	registry.Register(NewCodeQualityStrategy())
	registry.Register(NewProblemSolvingStrategy())
	registry.Register(NewSolvedAcStrategy())

	return registry
}

// Register adds a new strategy to the registry
func (r *StrategyRegistry) Register(strategy Strategy) {
	r.mu.Lock()
	defer r.mu.Unlock()

	name := strategy.Name()
	r.strategies[name] = strategy
	r.configs[name] = &StrategyConfig{
		Name:    name,
		Enabled: true,
		Weight:  strategy.DefaultWeight(),
	}
}

// GetStrategy returns a strategy by name
func (r *StrategyRegistry) GetStrategy(name string) (Strategy, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	strategy, exists := r.strategies[name]
	return strategy, exists
}

// GetConfig returns the configuration for a strategy
func (r *StrategyRegistry) GetConfig(name string) *StrategyConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()

	config, exists := r.configs[name]
	if !exists {
		return nil
	}
	// Return a copy to prevent external modification
	return &StrategyConfig{
		Name:    config.Name,
		Enabled: config.Enabled,
		Weight:  config.Weight,
	}
}

// GetEnabledStrategies returns all enabled strategies with their configs
func (r *StrategyRegistry) GetEnabledStrategies() []StrategyWithConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []StrategyWithConfig
	for name, strategy := range r.strategies {
		config := r.configs[name]
		if config.Enabled {
			result = append(result, StrategyWithConfig{
				Strategy: strategy,
				Config:   &StrategyConfig{Name: config.Name, Enabled: config.Enabled, Weight: config.Weight},
			})
		}
	}
	return result
}

// GetAllStrategies returns all strategies with their configs
func (r *StrategyRegistry) GetAllStrategies() []StrategyWithConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []StrategyWithConfig
	for name, strategy := range r.strategies {
		config := r.configs[name]
		result = append(result, StrategyWithConfig{
			Strategy: strategy,
			Config:   &StrategyConfig{Name: config.Name, Enabled: config.Enabled, Weight: config.Weight},
		})
	}
	return result
}

// Enable enables a strategy
func (r *StrategyRegistry) Enable(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if config, exists := r.configs[name]; exists {
		config.Enabled = true
	}
}

// Disable disables a strategy
func (r *StrategyRegistry) Disable(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if config, exists := r.configs[name]; exists {
		config.Enabled = false
	}
}

// SetWeight sets the weight for a strategy
func (r *StrategyRegistry) SetWeight(name string, weight float64) error {
	if weight < 0 || weight > 1 {
		return errors.New("weight must be between 0 and 1")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	config, exists := r.configs[name]
	if !exists {
		return errors.New("strategy not found: " + name)
	}

	config.Weight = weight
	return nil
}

// UpdateConfig updates the configuration for a strategy
func (r *StrategyRegistry) UpdateConfig(name string, updates *StrategyConfigUpdate) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	config, exists := r.configs[name]
	if !exists {
		return errors.New("strategy not found: " + name)
	}

	if updates.Enabled != nil {
		config.Enabled = *updates.Enabled
	}
	if updates.Weight != nil {
		config.Weight = *updates.Weight
	}

	return nil
}

// GetNormalizedWeights returns normalized weights for enabled strategies
func (r *StrategyRegistry) GetNormalizedWeights() map[string]float64 {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var totalWeight float64
	enabledConfigs := make(map[string]*StrategyConfig)

	for name, config := range r.configs {
		if config.Enabled {
			enabledConfigs[name] = config
			totalWeight += config.Weight
		}
	}

	normalized := make(map[string]float64)
	if totalWeight > 0 {
		for name, config := range enabledConfigs {
			normalized[name] = config.Weight / totalWeight
		}
	}

	return normalized
}
