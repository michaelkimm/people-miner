# TypeScript/NestJS 코드 스타일

## 적용 대상
- `backend/` 디렉토리

## 코드 스타일
- TypeScript strict mode 필수 (`as any`, `@ts-ignore` 금지)
- 함수명 camelCase, private 헬퍼는 underscore prefix (`_helperMethod`)
- class-validator로 입력 검증
- NestJS Logger 사용 (console.log 금지)
- `@Global()` 모듈: PrismaModule, FilterModule, EventsModule만 허용
- Prisma 호출은 서비스 내에서만 (컨트롤러에서 직접 호출 금지)

## 테스트 규칙
- 파일명: `*.spec.ts` (소스 파일과 같은 디렉토리)
- 네이밍: describe 블록으로 논리적 그룹핑
- Mock: `jest.fn()`, `mockResolvedValueOnce()` 사용
- 새 public 메서드에 테스트 필수

## 명령어
```bash
cd backend
npm run build          # NestJS 빌드
npm run test           # Jest 테스트
npm run lint           # ESLint 실행
npm run format         # Prettier 포맷팅
npm run test:cov       # 커버리지 리포트
npm run prisma:migrate # DB 마이그레이션
npm run prisma:studio  # DB GUI
```

## PR 체크리스트
- [ ] `npm run lint` 통과
- [ ] `npm run test` 통과
- [ ] 새 public 메서드에 테스트 존재
- [ ] TypeScript strict 위반 없음
