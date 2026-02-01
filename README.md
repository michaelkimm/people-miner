# People-Miner

개발자 후보 발굴 및 분석 시스템 - 다중 백엔드 모노레포

## 핵심 기능

- **다중 소스 크롤링**: GitHub 조직, 기술 블로그, 개발 이벤트에서 후보 수집
- **심층 코드 분석**: 테스트, CI/CD, 문서화, 타입 안정성 자동 감지
- **다차원 점수 산정**: 5가지 독립 전략을 가중치 기반으로 평가
- **스마트 필터링**: 기술 스택 기반 역할 자동 분류 (backend/frontend/mobile/fullstack)
- **학습 시스템**: 거절 피드백을 통한 필터링 개선
- **실시간 업데이트**: WebSocket으로 크롤링 진행 상황 라이브 표시

## 스코어링 알고리즘

5가지 독립적인 전략을 가중 평균하여 최종 점수 산출:

| 전략 | 기본 가중치 | 평가 항목 |
|------|-------------|-----------|
| **Activity** | 25% | 레포 수, 언어 다양성, 커밋 활동, TIL/장기 프로젝트 보너스 |
| **Code Quality** | 30% | 테스트 문화, CI/CD 성숙도, 문서화, 커밋 품질, OSS 기여, 타입 안정성 |
| **Problem Solving** | 25% | 알고리즘 연습, 소스 명성, 프로젝트 복잡도, 도메인 다양성 |
| **Solved.ac** | 35% (조건부) | 티어, 알고리즘 깊이, 연속 풀이 일수, 클래스 레벨 |
| **Influence** | 20% | 팔로워, 스타, 포크, 네트워크 비율 |

### 주요 평가 기준

**코드 품질 감지**
- 테스트: Jest, pytest, JUnit, Go test 등
- CI/CD: GitHub Actions, GitLab CI, Jenkins, CircleCI, Travis
- 문서화: README, docs/, CONTRIBUTING, LICENSE
- 타입 안정성: TypeScript, Java, Go, Rust 등

**알고리즘 분류**
- 고급: Segment Tree, DP on Tree, Network Flow, SCC, Convex Hull Trick
- 중급: DP, Greedy, Graph, Dijkstra, Binary Search, Geometry

## 데이터 소스 (50+)

| 카테고리 | 소스 예시 | 예상 후보 수 |
|----------|-----------|--------------|
| 교육 프로그램 | Boostcamp, SSAFY, Woowacourse, SW Maestro | ~2,000+ |
| IT 커뮤니티 | Depromeet, Nexters, DND, YAPP, SOPT | ~1,500+ |
| 대학 동아리 | SPARCS, Wafflestudio, PoApper, PoolC | ~500+ |
| 테크 기업 | Naver, Kakao, Toss, Coupang, Woowabros | ~1,000+ |
| 기술 블로그 | 우아한형제들, 카카오, 토스, 네이버 D2 | ~500+ |

## 필터링 알고리즘

### 기술 스택 자동 분류
```
Backend  → Java, Go, Python, Rust, C#, Ruby, PHP, Scala
Frontend → TypeScript, JavaScript, HTML, CSS
Mobile   → Swift, Kotlin, Dart, Objective-C
```

### 역할 감지 로직
1. 제외 키워드 체크 → 매칭시 거절
2. 제외 언어만 있는지 체크 → 거절
3. 대상 언어 + 컨텍스트 분석 (애매한 언어의 경우)
4. 대상 키워드 체크
5. Backend: 60% 이상 비율 필터

### 거절 규칙 엔진
사용자 피드백 기반 조건부 필터링:
- 연산자: `<`, `>`, `<=`, `>=`, `=`, `!=`, `in`, `notIn`, `contains`
- 동적 활성화/비활성화 가능

## 프로젝트 구조

```
people-miner/
├── backend/              # NestJS (TypeScript) - Primary
├── backend-go/           # Gin (Go) - Alternative
├── backend-java/         # Spring Boot (Java) - Alternative
├── frontend/             # React + Vite + Tailwind
├── korean-blog-crawler/  # Python async crawler
└── docker-compose.yml    # PostgreSQL + Redis
```

## 아키텍처 패턴

- **Strategy Pattern**: 스코어링 전략 교체 가능
- **Factory Pattern**: 블로그 타입별 크롤러 생성
- **Repository Pattern**: 데이터 접근 추상화
- **Consumer-side Interface**: Go 스타일 인터페이스 설계

## 시작하기

### 사전 요구사항

- Node.js 18+
- Go 1.21+ (backend-go 사용 시)
- Java 21+ (backend-java 사용 시)
- Python 3.10+ (크롤러 사용 시)
- Docker & Docker Compose

### 인프라 실행

```bash
# PostgreSQL + Redis 시작
docker-compose up -d

# 중지
docker-compose down
```

### 백엔드 실행

**NestJS (Primary)**
```bash
cd backend
npm install
npm run prisma:migrate
npm run start:dev
```

**Go (Alternative)**
```bash
cd backend-go
go build ./cmd/...
./cmd/server
```

**Java (Alternative)**
```bash
cd backend-java
./mvnw spring-boot:run
```

### 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

### 크롤러 실행

```bash
cd korean-blog-crawler
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run_crawler.py --dry-run  # 테스트
python run_crawler.py            # 실행
```

## 환경변수

| 변수 | 용도 | 예시 |
|------|------|------|
| DATABASE_URL | PostgreSQL 연결 | postgresql://user:pass@localhost:5432/db |
| REDIS_HOST | Redis 호스트 | localhost |
| REDIS_PORT | Redis 포트 | 6380 |
| GITHUB_TOKEN | GitHub API 인증 | ghp_xxx |
| TARGET_ROLE | 필터 대상 | backend \| frontend \| all |

## 테스트

```bash
# TypeScript/NestJS
cd backend && npm run test

# Go
cd backend-go && go test ./...

# Java
cd backend-java && ./mvnw test

# Python
cd korean-blog-crawler && pytest
```

## 라이선스

MIT
