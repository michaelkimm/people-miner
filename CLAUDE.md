# People-Miner Backend (TypeScript/NestJS)

## 프로젝트 개요
개발자 후보 발굴 및 분석 시스템 - NestJS 기반

## 공통 아키텍처 규칙
- Domain layer는 Infrastructure를 import하면 안 됨
- Prisma 호출은 서비스 내에서만 (직접 호출 금지)
- @Global() 모듈: PrismaModule, FilterModule, EventsModule만 허용
- 새 도메인 추가 시 독립 모듈로 구성

## 코드 스타일
- TypeScript strict mode 필수 (`as any`, `@ts-ignore` 금지)
- 함수명 camelCase, private 헬퍼는 underscore prefix
- class-validator로 입력 검증
- NestJS Logger 사용 (console.log 금지)

## 테스트 규칙
- 파일명: `*.spec.ts` (소스 파일과 같은 디렉토리)
- 네이밍: describe 블록으로 논리적 그룹핑
- Mock: jest.fn(), mockResolvedValueOnce() 사용
- 새 public 메서드에 테스트 필수

## 빌드 & 테스트 명령어
- `npm run build`: NestJS 빌드
- `npm run test`: Jest 테스트
- `npm run lint`: ESLint 실행
- `npm run format`: Prettier 포맷팅
- `npm run test:cov`: 커버리지 리포트

## PR 전 필수 체크
- [ ] npm run lint 통과
- [ ] npm run test 통과
- [ ] 새 public 메서드에 테스트 존재
- [ ] TypeScript strict 위반 없음
