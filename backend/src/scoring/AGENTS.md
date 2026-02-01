# SCORING MODULE

Strategy pattern scoring system with BullMQ async processing and auto-normalizing weights.

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add new strategy | `strategies/*.strategy.ts` | Implement `ScoringStrategy` interface |
| Modify weights | `StrategyRegistry.setWeight()` | Runtime; 0-1 range, auto-normalized |
| Skip strategy for candidate | Implement `isApplicable()` | Optional method, see SolvedAcStrategy |
| Queue job options | `scoring.module.ts` | BullMQ config: 2 attempts, exponential backoff |
| Debug scoring | `scoring.service.spec.ts` | Mock StrategyRegistry for unit tests |

## STRATEGY PATTERN

```
ScoringStrategy (interface)
├── name, description, defaultWeight (readonly)
├── calculate(candidate) → Promise<StrategyScore>
└── isApplicable?(candidate) → boolean  // optional

StrategyRegistry
├── Auto-registers via SCORING_STRATEGY token injection
├── getNormalizedWeights() → weights sum to 1.0
└── enable/disable/setWeight at runtime

ScoringService
└── Orchestrates: fetch candidate → run applicable strategies → weighted sum → persist
```

**Adding a strategy:**
1. Create `strategies/my-new.strategy.ts` implementing `ScoringStrategy`
2. Add class to `strategies` array in `scoring.module.ts`
3. Export from `strategies/index.ts`

**Strategy output:**
```typescript
{ value: 0-100, breakdown?: { metric: score }, metadata?: { ... } }
```

## WEIGHT DEFAULTS

| Strategy | Weight | Conditional |
|----------|--------|-------------|
| SolvedAc | 0.35 | Only if `solvedAcProfile` exists |
| CodeQuality | 0.30 | - |
| Activity | 0.25 | - |
| ProblemSolving | 0.25 | - |
| Influence | 0.20 | - |

Weights auto-normalize among enabled+applicable strategies.

## ANTI-PATTERNS

- **DO NOT** call Prisma directly in strategies - receive `CandidateWithRelations`
- **DO NOT** return scores outside 0-100 range
- **DO NOT** skip `breakdown` object - debugging requires it
- **AVOID** heavy async in `calculate()` - data should be pre-fetched
- **NEVER** modify candidate in strategy - read-only scoring
