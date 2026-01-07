---
alwaysApply: true
---

# 아이콘 컴포넌트 패턴

이 프로젝트는 **Unicon 라이브러리**와 **커스텀 아이콘 컴포넌트**를 함께 사용합니다.

---

## 🎨 아이콘 시스템 개요

| 종류 | 위치 | 용도 |
|------|------|------|
| **Unicon** | `@iconscout/react-unicons` | 일반적인 UI 아이콘 |
| **커스텀 아이콘** | `src/components/icons/` | Unicon에 없는 커스텀 디자인 아이콘 |

---

## 📦 공용 커스텀 아이콘

### 위치: `src/components/icons/`

```
src/components/icons/
├── types.ts              # IconProps 타입 정의
├── index.ts              # Barrel export
├── SpinnerIcon.tsx       # 로딩 스피너
├── SearchIcon.tsx        # 검색
├── RefreshIcon.tsx       # 새로고침
├── DownloadIcon.tsx      # 다운로드
├── CloseIcon.tsx         # 닫기 (X)
├── KakaoIcon.tsx         # 카카오 말풍선 (고정색)
├── SmsIcon.tsx           # SMS 아이콘
├── ViewIcon.tsx          # 보기/조회
├── CopyIcon.tsx          # 복사
├── DeleteIcon.tsx        # 삭제
├── ChevronDownIcon.tsx   # 아래 화살표
├── GuideActiveIcon.tsx   # 가이드 활성 (고정색)
├── GuideInactiveIcon.tsx # 가이드 비활성 (고정색)
└── PlayIcon.tsx          # 재생 버튼 (고정색)
```

### IconProps 타입

```typescript
// src/components/icons/types.ts
import { SVGProps } from 'react'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: number | string  // 크기 (기본값: 24)
  color?: string          // 색상 (기본값: 'currentColor')
  className?: string      // 추가 클래스
}
```

**Unicon과 동일한 인터페이스** (`size`, `color`, `className`)를 사용하여 일관성 유지

---

## 🎯 사용 방법

### 1. 커스텀 아이콘 사용

```typescript
import { SearchIcon, RefreshIcon, KakaoIcon } from '@/components/icons'

// 기본 사용
<SearchIcon />

// 크기 지정
<RefreshIcon size={20} />

// 색상 지정
<SearchIcon color="#6366f1" />

// 클래스 추가
<SearchIcon className="opacity-50" />

// 조합
<RefreshIcon size={16} color="#919EAB" className="hover:opacity-80" />
```

### 2. Unicon 사용

```typescript
import { UilPlus, UilEdit, UilTrashAlt } from '@iconscout/react-unicons'

<UilPlus size={24} color="#000" />
<UilEdit size={20} />
<UilTrashAlt size={16} color="red" />
```

### 3. Unicon vs 커스텀 아이콘 선택 기준

| 상황 | 선택 |
|------|------|
| 일반적인 UI 아이콘 (화살표, 체크 등) | Unicon |
| 브랜드 아이콘 (카카오, SMS 등) | 커스텀 아이콘 |
| 특수 디자인 아이콘 (가이드, 토스트 등) | 커스텀 아이콘 |
| Unicon에 없는 아이콘 | 커스텀 아이콘 |

---

## 🔧 새 커스텀 아이콘 추가하기

### 1. 기본 아이콘 (색상 변경 가능)

```typescript
// src/components/icons/NewIcon.tsx
import { IconProps } from './types'

export function NewIcon({ size = 24, color = 'currentColor', className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...props}
    >
      <path d="..." fill={color} />
    </svg>
  )
}
```

### 2. 고정색 아이콘 (색상 변경 불가)

브랜드 컬러나 멀티컬러 아이콘은 `color` prop을 제외:

```typescript
// src/components/icons/BrandIcon.tsx
import { IconProps } from './types'

export function BrandIcon({ size = 24, className, ...props }: Omit<IconProps, 'color'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...props}
    >
      <path d="..." fill="#FFE812" />  {/* 고정 색상 */}
      <path d="..." fill="#3C1E1E" />
    </svg>
  )
}
```

### 3. index.ts에 export 추가

```typescript
// src/components/icons/index.ts
export { NewIcon } from './NewIcon'
export { BrandIcon } from './BrandIcon'
```

---

## ❌ 피해야 할 패턴

### 1. 인라인 SVG 반복 사용

```typescript
// ❌ 나쁜 예 - 같은 SVG가 여러 파일에 복사됨
function ComponentA() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M10 10..." fill="currentColor" />
    </svg>
  )
}

function ComponentB() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M10 10..." fill="currentColor" />  {/* 동일한 SVG 중복 */}
    </svg>
  )
}
```

```typescript
// ✅ 좋은 예 - 공용 아이콘 import
import { SearchIcon } from '@/components/icons'

function ComponentA() {
  return <SearchIcon />
}

function ComponentB() {
  return <SearchIcon />
}
```

### 2. public 폴더 SVG import

```typescript
// ❌ 나쁜 예
import SearchIcon from "/icons/search.svg"
<SearchIcon />  // 스타일 조정 어려움
```

### 3. Image 컴포넌트로 SVG 렌더링

```typescript
// ❌ 나쁜 예
import Image from "next/image"
<Image src="/icon.svg" alt="icon" width={24} height={24} />
// 색상/크기 동적 변경 불가
```

---

## 📋 현재 사용 가능한 커스텀 아이콘

### 일반 아이콘 (색상 변경 가능)

| 아이콘 | 용도 | 사용 예 |
|--------|------|---------|
| `SpinnerIcon` | 로딩 상태 | 버튼 로딩, 테이블 로딩 |
| `SearchIcon` | 검색 | 필터 검색 버튼 |
| `RefreshIcon` | 새로고침 | 필터 초기화 버튼 |
| `DownloadIcon` | 다운로드 | 엑셀 다운로드 버튼 |
| `CloseIcon` | 닫기 | 다이얼로그 닫기 버튼 |
| `SmsIcon` | SMS | 메시지 타입 표시 |
| `ViewIcon` | 보기 | 테이블 액션 버튼 |
| `CopyIcon` | 복사 | 테이블 액션 버튼 |
| `DeleteIcon` | 삭제 | 테이블 액션 버튼 |
| `ChevronDownIcon` | 드롭다운 | 셀렉트 박스 화살표 |

### 고정색 아이콘 (색상 변경 불가)

| 아이콘 | 고정 색상 | 용도 |
|--------|----------|------|
| `KakaoIcon` | 노랑/갈색 | 카카오 메시지 타입 |
| `GuideActiveIcon` | 파랑 | 가이드 섹션 활성 |
| `GuideInactiveIcon` | 회색 | 가이드 섹션 비활성 |
| `PlayIcon` | 흰색/반투명 | 비디오 재생 버튼 |

---

## ✅ 체크리스트

새 아이콘 추가 시:

- [ ] `src/components/icons/` 폴더에 파일 생성
- [ ] `IconProps` 또는 `Omit<IconProps, 'color'>` 타입 사용
- [ ] `index.ts`에 export 추가
- [ ] `npm run type-check` 통과
- [ ] `npm run build` 통과