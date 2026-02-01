# React/Vite 코드 스타일

## 적용 대상
- `frontend/` 디렉토리

## 코드 스타일
- React 18 + TypeScript
- Tailwind CSS (유틸리티 클래스 우선)
- 현재 모놀리식 구조 (App.tsx에 집중) - 컴포넌트 분리 지양
- Socket.io-client로 실시간 업데이트

## 상태 관리
- 로컬 useState 사용
- Redux/Zustand 등 외부 상태관리 도입 지양 (현재 구조 유지)

## 스타일링
- Tailwind 유틸리티 클래스 사용
- 커스텀 CSS 최소화
- 반응형: `sm:`, `md:`, `lg:` 프리픽스

## 명령어
```bash
cd frontend
npm run dev      # Vite 개발 서버 (port 5173)
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 미리보기
```

## 빌드 출력
- `dist/` 디렉토리에 빌드 결과물
- NestJS backend의 ServeStatic으로 서빙 가능

## PR 체크리스트
- [ ] `npm run build` 성공
- [ ] TypeScript 에러 없음
- [ ] 콘솔 에러/경고 없음
