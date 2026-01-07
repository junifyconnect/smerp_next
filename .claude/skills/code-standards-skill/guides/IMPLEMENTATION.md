---
alwaysApply: true
---

# 구현 패턴 및 Best Practices

## 컴포넌트 구조
```typescript
'use client'  // 필요시만 사용

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'  // shadcn 유틸리티

interface ComponentProps {
  children?: ReactNode
  className?: string
  // 모든 타입 명시 (any 금지)
}

export function Component({ ...props }: ComponentProps) {
  return (
    // JSX
  )
}
```

## 색상 관리
- Figma에서 추출한 색상값을 `tailwind.config.ts`에 변수화
- CSS 변수 활용: `var(--color-primary)`
- 다크모드 고려: `dark:bg-slate-900` 등

## 반응형 디자인
- Tailwind 브레이크포인트: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Mobile-first 접근: 모바일 스타일부터 작성
- 예: `w-full md:w-1/2 lg:w-1/3`

## 자주 사용하는 shadcn 컴포넌트
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
```

## 이미지 및 아이콘
```typescript
import Image from 'next/image'
import CheckIcon from '@/public/icons/check.svg'

// SVG import
<CheckIcon className="w-5 h-5" />

// Image (Next.js 최적화)
<Image src="/images/logo.png" alt="로고" width={100} height={100} />
```

---

## 구현 체크리스트

### 디자인 정확성
- [ ] Figma 스펙의 모든 치수 확인 (크기, 여백, 간격)
- [ ] 색상값 정확성 검증 (RGB/HEX)
- [ ] 그림자, 테두리, 모서리 반경 정확히 구현
- [ ] 모든 상태 구현 (hover, focus, active, disabled)

### 기술 사항
- [ ] TypeScript strict mode 준수 (any 타입 금지)
- [ ] 모든 props에 명시적 타입 지정
- [ ] 불필요한 리렌더링 최소화
- [ ] 서버/클라이언트 컴포넌트 구분

### 반응형 및 접근성
- [ ] 모바일/태블릿/데스크톱 반응형 확인
- [ ] 스크린리더 대응 (alt, aria-label)
- [ ] 키보드 네비게이션 지원
- [ ] 색상 대비 충분 (WCAG AA 이상)

### 성능 및 코드 품질
- [ ] 이미지 최적화 (Next.js Image)
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과
- [ ] 변수명 명확 및 일관성
