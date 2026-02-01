# People-Miner Monorepo

## 프로젝트 개요
개발자 후보 발굴 및 분석 시스템 - 다중 백엔드 모노레포

## 레포 구조
```
people-miner/
├── backend/              # NestJS (TypeScript) - Primary
├── backend-go/           # Gin (Go) - Alternative
├── backend-java/         # Spring Boot (Java) - Alternative
├── frontend/             # React + Vite + Tailwind
├── korean-blog-crawler/  # Python async crawler
└── docker-compose.yml    # PostgreSQL + Redis
```

## 공통 아키텍처 규칙
- Domain layer는 Infrastructure를 import하면 안 됨
- DB 호출은 서비스/리포지토리 내에서만 (직접 호출 금지)
- 새 도메인 추가 시 독립 모듈로 구성
- 환경변수는 `.env.example` 템플릿 유지, `.env` 커밋 금지

## 언어별 스타일 가이드

| 디렉토리 | 언어/프레임워크 | 스타일 가이드 |
|----------|-----------------|---------------|
| `backend/` | TypeScript/NestJS | [.claude/rules/typescript.md](.claude/rules/typescript.md) |
| `backend-go/` | Go/Gin | [.claude/rules/go.md](.claude/rules/go.md) |
| `backend-java/` | Java/Spring Boot | [.claude/rules/java.md](.claude/rules/java.md) |
| `frontend/` | React/Vite | [.claude/rules/react.md](.claude/rules/react.md) |
| `korean-blog-crawler/` | Python | [.claude/rules/python.md](.claude/rules/python.md) |

## 인프라

### Docker Compose
```bash
docker-compose up -d    # PostgreSQL + Redis 시작
docker-compose down     # 중지
```

### 환경변수
| 변수 | 용도 | 예시 |
|------|------|------|
| DATABASE_URL | PostgreSQL | postgresql://... |
| REDIS_HOST/PORT | BullMQ 큐 | localhost:6380 |
| GITHUB_TOKEN | API 인증 | ghp_xxx |
| TARGET_ROLE | 필터 대상 | backend\|frontend\|all |

## Anti-Patterns (금지 사항)
- `.env` 파일 커밋
- `as any`, `@ts-ignore` 사용 (TypeScript)
- console.log 직접 사용 (Logger 사용)
- Domain에서 Infrastructure import
- 하드코딩된 크롤 소스 (config 사용)
