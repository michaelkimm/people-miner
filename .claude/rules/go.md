# Go/Gin 코드 스타일

## 적용 대상
- `backend-go/` 디렉토리

## 코드 스타일
- Go 표준 포맷팅 (gofmt/goimports)
- 에러는 명시적으로 반환 및 처리 (에러 무시 금지)
- 인터페이스는 사용처에서 정의 (consumer-side interface)
- `internal/` 패키지로 캡슐화
- 네이밍: exported는 PascalCase, unexported는 camelCase

## 프로젝트 구조
```
backend-go/
├── cmd/              # 엔트리포인트 (main.go)
└── internal/
    ├── config/       # 설정 로드
    ├── domain/       # 엔티티, 인터페이스 정의
    ├── handler/      # HTTP 핸들러 (Gin)
    ├── service/      # 비즈니스 로직
    ├── repository/   # 데이터 접근 계층
    ├── scoring/      # 점수 전략 패턴
    ├── filter/       # 필터링 로직
    ├── events/       # WebSocket 이벤트
    └── solvedac/     # SolvedAc 연동
```

## 테스트 규칙
- 파일명: `*_test.go` (소스 파일과 같은 디렉토리)
- 테이블 드리븐 테스트 선호
- `testify/assert`, `testify/mock` 사용

## 명령어
```bash
cd backend-go
go build ./cmd/...    # 빌드
go test ./...         # 테스트
go test -cover ./...  # 커버리지
go vet ./...          # 정적 분석
gofmt -w .            # 포맷팅
```

## PR 체크리스트
- [ ] `go build ./...` 성공
- [ ] `go test ./...` 통과
- [ ] `go vet ./...` 경고 없음
