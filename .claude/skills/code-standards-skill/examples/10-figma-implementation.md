---
alwaysApply: true
---

# Figma 디자인을 코드로 구현하기

## 🎨 디자인 시스템 규칙 (필수)

### 1. 디자인 시스템 색상 우선 사용

Figma에서 하드코딩된 색상이 있더라도, **우리 디자인 시스템에 동일한 색상이 있으면 반드시 디자인 시스템 변수를 사용**합니다.

```typescript
// ❌ 틀린 예 - Figma에서 #6d36f7 하드코딩 되어있다고 그대로 사용
<button className="bg-[#6d36f7]">버튼</button>

// ✅ 올바른 예 - 디자인 시스템에 primary-700이 #6d36f7이므로 변수 사용
<button className="bg-primary-700">버튼</button>
```

**현재 디자인 시스템 색상 (globals.css 참고):**

- **Primary (보라색)**: primary-50 ~ primary-1100 (700이 메인)
- **Gray**: gray-50 ~ gray-950
- **Red**: red (#f54848)
- **기타**: white, kakao

### 2. 공통 컴포넌트 & 디자인 시스템 변경 시 확인 필수

Figma MCP로 디자인을 구현할 때, 다음 상황이면 **반드시 사용자에게 먼저 확인**합니다:

1. **공통 컴포넌트로 판단되는 경우**
   - 여러 화면에서 재사용될 것 같은 UI (버튼, 입력창, 카드 등)
   - 기존 공통 컴포넌트와 유사하지만 다른 스타일인 경우

2. **디자인 시스템 변경/추가가 필요한 경우**
   - 새로운 색상이 필요한 경우
   - 새로운 semantic 변수가 필요한 경우 (예: `--color-success`, `--color-warning`)
   - 기존 변수 값을 변경해야 하는 경우

**반드시 이렇게 물어보세요:**
```
"이 컴포넌트는 공통 컴포넌트로 만들면 좋을 것 같아요.
- 위치: src/components/ui/Button.tsx
- 변경사항: [구체적인 변경 내용]
이렇게 진행해도 될까요?"
```

---

## ✅ 올바른 패턴

### 1. Figma 스펙 정리 및 검증

Figma 디자인을 코드로 변환하기 전에 **모든 스펙을 정리**합니다:

```typescript
/**
 * 컴포넌트: UserCard
 * 
 * 디자인 스펙:
 * - 배경색: #FFFFFF
 * - 테두리: 1px solid #E5E7EB
 * - 모서리: 8px (border-radius)
 * - 패딩: 16px
 * - 그림자: 0 1px 3px rgba(0,0,0,0.1)
 * - 텍스트 색상: #1F2937 (heading), #6B7280 (subtitle)
 * - 글꼴: Inter, 14px, 500 (heading), 12px, 400 (subtitle)
 * 
 * 상태:
 * - Default: 위의 스펙
 * - Hover: 배경 #F9FAFB, 그림자 증가
 * - Active: 테두리색 #3B82F6
 */
```

### 2. TypeScript로 Props 정의

모든 컴포넌트 Props는 **명시적 타입** 지정:

```typescript
'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface UserCardProps {
  // 필수 필드
  name: string
  subtitle: string
  
  // 선택 필드
  onClick?: () => void
  isActive?: boolean
  className?: string
  children?: ReactNode
}

export function UserCard({
  name,
  subtitle,
  onClick,
  isActive = false,
  className,
}: UserCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        // Base 스타일
        'rounded-lg border border-[#E5E7EB] bg-white p-4',
        'shadow-sm transition-all duration-200',
        
        // Hover 상태
        'hover:bg-[#F9FAFB] hover:shadow-md cursor-pointer',
        
        // Active 상태
        isActive && 'border-[#3B82F6] bg-blue-50',
        
        // 커스텀 클래스
        className
      )}
    >
      {/* heading 스타일 */}
      <p className="text-sm font-medium text-[#1F2937]">
        {name}
      </p>
      
      {/* subtitle 스타일 */}
      <p className="text-xs font-normal text-[#6B7280] mt-1">
        {subtitle}
      </p>
    </div>
  )
}
```

### 3. 색상과 간격은 정확하게

**피그마의 정확한 값을 사용**하세요 (근사치 사용 금지):

```typescript
// ❌ 틀린 예
<div className="bg-gray-100 p-4 rounded-md">

// ✅ 올바른 예 (Figma의 정확한 값)
<div className="bg-[#F3F4F6] p-4 rounded-[8px]">
```

### 4. 반응형 디자인 (모든 breakpoint 확인)

Figma의 모든 해상도에서 스펙을 확인하고 구현:

```typescript
export function ResponsiveCard() {
  return (
    <div className={cn(
      // Mobile (기본)
      'w-full px-4 py-3',
      
      // Tablet (768px 이상)
      'sm:px-6 sm:py-4',
      
      // Desktop (1024px 이상)
      'lg:w-1/2 lg:px-8 lg:py-6',
      
      // 큰 화면 (1280px 이상)
      'xl:w-1/3',
    )}>
      Content
    </div>
  )
}
```

### 5. 모든 상태(State) 구현

디자인의 모든 상태를 코드에 반영:

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        // Base
        'rounded-lg font-medium transition-all duration-200 flex items-center justify-center',
        
        // Size
        size === 'sm' && 'px-3 py-2 text-sm',
        size === 'md' && 'px-4 py-2.5 text-base',
        size === 'lg' && 'px-6 py-3 text-lg',
        
        // Variant - Primary
        variant === 'primary' && [
          'bg-[#3B82F6] text-white',
          'hover:bg-[#2563EB] active:bg-[#1D4ED8]',
          'disabled:bg-[#9CA3AF] disabled:cursor-not-allowed',
        ],
        
        // Variant - Secondary
        variant === 'secondary' && [
          'bg-[#F3F4F6] text-[#1F2937]',
          'border border-[#D1D5DB]',
          'hover:bg-[#E5E7EB] active:bg-[#D1D5DB]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        ],
        
        // Variant - Danger
        variant === 'danger' && [
          'bg-[#EF4444] text-white',
          'hover:bg-[#DC2626] active:bg-[#991B1B]',
          'disabled:bg-[#9CA3AF] disabled:cursor-not-allowed',
        ],
        
        // Loading 상태
        isLoading && 'opacity-75 cursor-not-allowed',
      )}
    >
      {isLoading ? <Spinner className="mr-2" /> : null}
      {props.children}
    </button>
  )
}
```

### 6. 아이콘은 @iconscout/react-unicons 사용

**아이콘은 반드시 `@iconscout/react-unicons` 라이브러리에서 가져옵니다** (Figma 디자인과 동일한 Unicons 아이콘셋):

```typescript
import { UilChartPie, UilBell, UilSetting } from '@iconscout/react-unicons'
```

**아이콘 스타일 (Figma 기준):**

| 스타일 | Tailwind 클래스 | 색상 | 용도 |
|--------|-----------------|------|------|
| 기본 | `text-gray-950` | #1d1c22 | 일반 상태 |
| 활성화 | `text-primary-700` | #6d36f7 | 선택/활성 상태 |
| 비활성화 | `text-gray-300` | #b7b5c4 | 비활성/disabled 상태 |

**사용 예시:**

```typescript
import { UilBell, UilSetting, UilUser } from '@iconscout/react-unicons'
import { cn } from '@/lib/utils'

interface NavItemProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  isActive?: boolean
  disabled?: boolean
}

export function NavItem({ icon: Icon, label, isActive, disabled }: NavItemProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-4 py-2',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <Icon
        size={24}
        className={cn(
          // 기본
          'text-gray-950',
          // 활성화
          isActive && 'text-primary-700',
          // 비활성화
          disabled && 'text-gray-300'
        )}
      />
      <span>{label}</span>
    </button>
  )
}

// 사용
<NavItem icon={UilBell} label="알림" />
<NavItem icon={UilSetting} label="설정" isActive />
<NavItem icon={UilUser} label="프로필" disabled />
```

**아이콘 찾기:**
- Unicons 공식 사이트: https://iconscout.com/unicons
- Figma 아이콘 목록: node-id=415-22444

### 7. 실제 컴포넌트 예제: Admin Sidebar Item

```typescript
'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface AdminMenuItemProps {
  icon: string           // SVG 경로
  label: string
  isActive?: boolean
  hasArrow?: boolean
  isExpanded?: boolean
  onClick?: () => void
  children?: ReactNode
}

export function AdminMenuItem({
  icon,
  label,
  isActive = false,
  hasArrow = false,
  isExpanded = false,
  onClick,
  children,
}: AdminMenuItemProps) {
  return (
    <>
      <button
        onClick={onClick}
        className={cn(
          // Base 스타일 (Figma 스펙)
          'w-full h-12 rounded-lg transition-all duration-200',
          'flex items-center gap-3 px-4 font-medium text-sm',
          
          // Active 상태
          isActive
            ? 'bg-[rgba(0,167,111,0.08)] text-[#00a76f] hover:bg-[rgba(0,167,111,0.12)]'
            : 'text-[#637381] hover:bg-[#f5f6f7] hover:text-[#1f2937]',
        )}
      >
        {/* 아이콘 */}
        <Image
          src={icon}
          alt={label}
          width={isActive ? 28 : 24}
          height={isActive ? 28 : 24}
          className="transition-all duration-200"
        />
        
        {/* 레이블 */}
        <span className="flex-1 text-left">{label}</span>
        
        {/* 펼침 화살표 */}
        {hasArrow && (
          <svg
            className={cn(
              'w-5 h-5 transition-transform duration-300',
              isExpanded && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        )}
      </button>
      
      {/* 하위 메뉴 */}
      {children && isExpanded && (
        <div className="ml-4 space-y-2 mt-2">
          {children}
        </div>
      )}
    </>
  )
}
```

---

## ⚠️ 필수 규칙

### 클릭 가능한 요소에는 `cursor-pointer` 필수

버튼, 링크, 클릭 이벤트가 있는 요소에는 반드시 `cursor-pointer`를 추가합니다:

```typescript
// ❌ 틀린 예
<button className="bg-primary-700 text-white">클릭</button>
<div onClick={handleClick} className="p-4">클릭 가능</div>

// ✅ 올바른 예
<button className="bg-primary-700 text-white cursor-pointer">클릭</button>
<div onClick={handleClick} className="p-4 cursor-pointer">클릭 가능</div>
```

**적용 대상:**
- `<button>` 요소
- `onClick` 핸들러가 있는 요소
- 클릭 시 동작하는 카드, 리스트 아이템 등

---

## 🧹 Figma MCP 사용 후 정리 (필수)

Figma MCP(`get_design_context`)를 사용하면 **불필요한 파일들이 자동 생성**됩니다. 구현 완료 후 반드시 정리해야 합니다.

### 정리 대상

1. **public/assets 폴더의 해시 파일들**
   - 패턴: `85a59bc5ac8beddc463082d0f5f6dd1bc1922e35.png` (해시값 파일명)
   - 실제 사용하지 않는 이미지/SVG 파일들

2. **svg-*.ts 파일** (생성된 경우)
   - Figma MCP가 생성하는 SVG 상수 파일
   - 사용하지 않으면 삭제

### 정리 방법

```bash
# 해시 파일명을 가진 불필요한 이미지 삭제
rm public/assets/[해시값].png
rm public/assets/[해시값].svg

# 또는 최근 생성된 의심 파일 확인
ls -lt public/assets/ | head -10
```

### 실제로 사용하는 파일만 유지

```typescript
// ✅ 사용하는 파일 - 명확한 이름
public/assets/kakao-talk-icon.png
public/assets/brand-message-preview.png

// ❌ 삭제 대상 - 해시 파일명
public/assets/85a59bc5ac8beddc463082d0f5f6dd1bc1922e35.png
public/assets/d6ca9145ca1f5002cc33845e1e45de78dfc068c2.png
```

### 체크리스트

- [ ] `public/assets`에 해시 파일명 이미지가 없는지 확인
- [ ] 생성된 SVG 컴포넌트 중 실제 사용하지 않는 것 삭제
- [ ] 아이콘은 `@iconscout/react-unicons` 또는 직접 만든 SVG 컴포넌트 사용

---

## ❌ 틀린 패턴

### 근사치로 색상값 사용
```typescript
// ❌ 틀린 예
className="bg-blue-500 text-gray-600"  // Figma의 정확한 색상이 아님

// ✅ 올바른 예
className="bg-[#3B82F6] text-[#6B7280]"  // Figma 정확한 값
```

### 상태 처리 누락
```typescript
// ❌ 틀린 예 - hover, active, disabled 상태 없음
<button className="bg-blue-500 text-white rounded-lg px-4 py-2">
  Click me
</button>

// ✅ 올바른 예 - 모든 상태 포함
<button className={cn(
  'bg-[#3B82F6] text-white rounded-lg px-4 py-2',
  'hover:bg-[#2563EB] active:bg-[#1D4ED8]',
  'disabled:bg-[#9CA3AF] disabled:cursor-not-allowed',
)}>
  Click me
</button>
```

### 하드코딩된 스타일
```typescript
// ❌ 틀린 예
<div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#fff' }}>

// ✅ 올바른 예
<div className="p-4 rounded-lg bg-white">
```

### 타입 미지정
```typescript
// ❌ 틀린 예
export function Card(props) {
  return <div className={props.className}>{props.children}</div>
}

// ✅ 올바른 예
interface CardProps {
  className?: string
  children?: ReactNode
}

export function Card({ className, children }: CardProps) {
  return <div className={cn('rounded-lg bg-white p-4', className)}>{children}</div>
}
```

---

## 📋 Figma → 코드 구현 체크리스트

### 디자인 정확성
- [ ] 모든 색상값이 Figma와 일치하는가? (근사치 X)
- [ ] 크기, 패딩, 마진이 정확한가?
- [ ] 테두리, 모서리(border-radius)가 정확한가?
- [ ] 그림자(box-shadow)가 정확한가?
- [ ] 무의미한 border나 shadow가 들어가지 않았는가?

### 상태 구현
- [ ] Default 상태 구현
- [ ] Hover 상태 구현
- [ ] Active/Focus 상태 구현
- [ ] Disabled 상태 구현
- [ ] Loading 상태 구현 (필요시)

### 타입 & 접근성
- [ ] 모든 Props에 명시적 타입 지정
- [ ] `className?: string` prop 지원
- [ ] alt 텍스트 지정 (이미지)
- [ ] aria-label 지정 (필요시)

### 반응형
- [ ] Mobile 디자인 확인 및 구현
- [ ] Tablet 디자인 확인 및 구현
- [ ] Desktop 디자인 확인 및 구현
- [ ] 모든 breakpoint에서 정렬 확인

### 코드 품질
- [ ] `any` 타입 사용 안함
- [ ] 변수명 명확
- [ ] `cn()` 유틸리티 사용
- [ ] 불필요한 상태 관리 없음

### 테스트
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과
- [ ] 브라우저에서 Figma와 시각적으로 동일한가?
