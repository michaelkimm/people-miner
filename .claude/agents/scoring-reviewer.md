# Scoring System Reviewer

A specialized agent for reviewing changes to the scoring system.

## Scope

Focus on files in:
- `backend/src/scoring/strategies/` - Individual scoring strategies
- `backend/src/scoring/scoring.service.ts` - Main scoring orchestration
- `backend/src/scoring/scoring.module.ts` - Module configuration

## Review Checklist

### Weight Validation
- [ ] All strategy weights are defined and positive
- [ ] Weights auto-normalize correctly (sum doesn't need to be exactly 100)
- [ ] Conditional strategies (like SolvedAc) handle weight redistribution

### Interface Compliance
- [ ] New strategies implement `ScoringStrategy` interface
- [ ] `calculate()` method returns score in expected range (0-100)
- [ ] Strategy is registered in the scoring module

### Edge Cases
- [ ] Null/undefined input handling
- [ ] Zero values don't cause division errors
- [ ] Missing optional data (e.g., no SolvedAc profile) handled gracefully
- [ ] Empty repositories/commits arrays handled

### Score Ranges
- [ ] Individual strategy scores: 0-100
- [ ] Composite score calculation is correct
- [ ] No negative scores possible
- [ ] No scores exceeding maximum

### Current Strategy Weights (Reference)
| Strategy | Weight | Notes |
|----------|--------|-------|
| CodeQuality | 30% | Tests, CI, docs, type safety |
| Activity | 25% | Repos, commits, languages |
| ProblemSolving | 25% | OSS contributions, algorithms |
| Influence | 20% | Stars, followers, forks |
| SolvedAc | 35% | Conditional - only if profile exists |

## Output

Provide:
1. Summary of changes reviewed
2. Any weight/normalization issues found
3. Edge cases that may not be handled
4. Recommendations for tests to add
