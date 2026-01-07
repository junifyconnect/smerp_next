---
alwaysApply: true
---

# 문제 해결 가이드

## 버튼 상태 구현 불일치
- Figma의 모든 상태(normal, hover, active, disabled) 정의 확인
- Tailwind의 상태 클래스 활용: `hover:`, `active:`, `disabled:`

## 반응형 미적용
- Figma에서 breakpoint별 디자인 확인
- Tailwind 브레이크포인트와 매핑
- 모바일 우선 설계 원칙 적용

## 색상 불일치
- Figma export 색상값과 Tailwind 팔레트 일치도 확인
- 필요시 `tailwind.config.ts`에 커스텀 색상 추가

## 폰트 렌더링 차이
- 시스템 폰트 vs 웹 폰트 확인
- `next/font` 활용: `import { Inter } from 'next/font/google'`

## 타입 에러
- `npm run type-check`로 모든 타입 검증
- `any` 타입 사용 금지
- props에 명시적 타입 지정

## 성능 문제
- 이미지 최적화: Next.js Image 컴포넌트 사용
- 불필요한 리렌더링 확인 (React DevTools Profiler)
- 동적 import 활용 (필요시)
