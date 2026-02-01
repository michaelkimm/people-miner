# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-17
**Commit:** 272258c
**Branch:** master

## OVERVIEW

Talent discovery service crawling Korean tech sources (GitHub orgs, tech blogs, bootcamps) and scoring developer candidates by code quality, activity, and problem-solving ability.

## STRUCTURE

```
people-miner/
├── backend/              # NestJS API (Prisma, BullMQ, WebSocket)
│   └── src/
│       ├── scoring/      # Strategy pattern scoring system [AGENTS.md]
│       ├── crawler/      # BullMQ-based crawl orchestration
│       ├── github/       # GitHub API with rate limiting
│       └── config/       # Crawl sources: 70+ Korean tech sources
├── frontend/             # React + Vite dashboard (monolithic App.tsx)
├── korean-blog-crawler/  # Python async blog crawler [AGENTS.md]
└── Dev-Event/            # Git submodule (Korean dev events)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add crawl source | `backend/src/config/crawl-sources.config.ts` | Follow CrawlSourceConfig interface |
| Add scoring strategy | `backend/src/scoring/strategies/` | Implement ScoringStrategy interface |
| Modify candidate schema | `backend/prisma/schema.prisma` | Run `npm run prisma:migrate` after |
| Tech stack filtering | `backend/src/filter/filter.service.ts` | TARGET_ROLE env controls behavior |
| Real-time updates | `backend/src/events/events.gateway.ts` | WebSocket via Socket.io |
| Blog crawler logic | `korean-blog-crawler/src/crawler.py` | Extend BaseBlogCrawler ABC |
| Rejection learning | `backend/src/rejection/` | JSON condition rules in DB |

## DATA FLOW

```
CrawlSource → BullMQ Queue → GitHub API → Filter (tech stack)
                                ↓
                         Scoring Strategies
                                ↓
                         PostgreSQL → WebSocket → Frontend
```

## CONVENTIONS

### Backend (NestJS)
- Modules: One domain per module, `@Global()` for shared (Prisma, Filter, Events)
- Tests: Colocated `*.spec.ts`, Jest with mocks
- Queue: BullMQ with exponential backoff, job cleanup
- No DTOs folder: Inline validation with class-validator

### Frontend (React)
- **Monolithic**: All UI in `App.tsx` (~1000 lines) - no component splitting
- State: Local useState, no Redux/Zustand
- Styling: Tailwind CSS defaults

### Python Crawler
- Async: aiohttp + asyncio throughout
- Pattern: ABC base class, blog-specific subclasses
- DB: SQLite for crawler, synced to PostgreSQL manually

## ANTI-PATTERNS (THIS PROJECT)

- **DO NOT** add frontend routing or state management - keep monolithic for now
- **DO NOT** suppress TypeScript errors with `as any` or `@ts-ignore`
- **DO NOT** commit `.env` files - use `.env.example` template
- **AVOID** direct Prisma calls outside services - use injected services
- **AVOID** hardcoding crawl sources - use `crawl-sources.config.ts`

## SCORING SYSTEM

5 strategies with weighted composite score:

| Strategy | Weight | Key Factors |
|----------|--------|-------------|
| CodeQuality | 30% | Tests, CI, docs, type safety |
| Activity | 25% | Repos, commits, languages |
| ProblemSolving | 25% | OSS contributions, algorithms |
| Influence | 20% | Stars, followers, forks |
| SolvedAc | 35%* | Baekjoon tier (*conditional) |

Weights auto-normalize. SolvedAc only applies if profile exists.

## COMMANDS

```bash
# Backend
cd backend && npm run start:dev      # Dev server
npm run prisma:studio                # DB GUI
npm run test -- --testPathPattern=scoring

# Frontend
cd frontend && npm run dev           # Vite dev (port 5173)

# Python Crawler
cd korean-blog-crawler
python run_crawler.py --dry-run      # Test without DB write
pytest test_crawler.py

# Infrastructure
docker-compose up -d                 # PostgreSQL + Redis
```

## ENV VARS

| Variable | Purpose | Example |
|----------|---------|---------|
| DATABASE_URL | PostgreSQL | postgresql://... |
| REDIS_HOST/PORT | BullMQ queue | localhost:6380 |
| GITHUB_TOKEN | API auth | ghp_xxx |
| TARGET_ROLE | Filter candidates | backend\|frontend\|all |

## NOTES

- **Rate limiting**: GitHub API has 5000/hr limit, `rate-limiter.service.ts` handles
- **Korean sources**: 70+ orgs including 부스트캠프, SSAFY, 우아한테크코스, 디프만
- **No CI/CD**: Local dev only, no GitHub Actions configured
- **Monorepo without tooling**: No nx/turborepo, separate npm workspaces
