---
alwaysApply: true
---

# Admin 컴포넌트: shadcn/ui 패턴

관리자 페이지(`/src/components/admin/`)에서 shadcn/ui를 활용하여 일관된 UI를 구현하는 패턴입니다.

---

## ✅ 올바른 패턴

### 1. 기본 Button 컴포넌트 확장

`@/src/components/admin/Button.tsx`에는 이미 기본 스타일이 정의되어 있습니다. 이를 활용하세요:

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface AdminButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: ReactNode
}

export function AdminButton({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: AdminButtonProps) {
  return (
    <Button
      disabled={disabled || isLoading}
      className={cn(
        // Size 변형
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-base',
        size === 'lg' && 'px-6 py-3 text-lg',

        // Variant 변형
        variant === 'primary' &&
          'bg-[#00a76f] text-white hover:bg-[#008a59] active:bg-[#006b47]',
        variant === 'secondary' &&
          'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
        variant === 'danger' &&
          'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
        variant === 'outline' &&
          'border border-gray-300 text-gray-900 hover:bg-gray-50 active:bg-gray-100',

        // Disabled 상태
        disabled && 'opacity-50 cursor-not-allowed',

        // Loading 상태
        isLoading && 'relative text-transparent',

        className,
      )}
      {...props}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </span>
      )}
      {children}
    </Button>
  )
}
```

### 2. 검색 입력 컴포넌트

검색 기능이 있는 표 위에 배치하는 검색 입력:

```typescript
'use client'

import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AdminSearchInputProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onClear?: () => void
}

export function AdminSearchInput({
  placeholder = '검색...',
  value,
  onChange,
  onClear,
}: AdminSearchInputProps) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'pl-9 pr-8',
          'border-gray-300 rounded-lg',
          'focus:border-[#00a76f] focus:ring-1 focus:ring-[#00a76f]',
        )}
      />
      {value && (
        <button
          onClick={() => {
            onChange('')
            onClear?.()
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
```

### 3. 배지(Badge) 컴포넌트 - 상태 표시

회원 등급, 주문 상태 등을 표시하는 배지:

```typescript
'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type BadgeStatus = 'success' | 'warning' | 'danger' | 'info' | 'default'

interface AdminBadgeProps {
  status: BadgeStatus
  label: string
  size?: 'sm' | 'md'
}

export function AdminBadge({
  status,
  label,
  size = 'md',
}: AdminBadgeProps) {
  const statusStyles: Record<BadgeStatus, string> = {
    success: 'bg-[#10B981] text-white hover:bg-[#059669]',
    warning: 'bg-[#F59E0B] text-white hover:bg-[#D97706]',
    danger: 'bg-[#EF4444] text-white hover:bg-[#DC2626]',
    info: 'bg-[#3B82F6] text-white hover:bg-[#2563EB]',
    default: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  }

  return (
    <Badge
      className={cn(
        'rounded-full font-medium',
        size === 'sm' && 'px-2 py-1 text-xs',
        size === 'md' && 'px-3 py-1.5 text-sm',
        statusStyles[status],
      )}
    >
      {label}
    </Badge>
  )
}
```

**사용 예시**:
```typescript
<AdminBadge status="success" label="활성" />
<AdminBadge status="danger" label="정지" size="sm" />
```

### 4. 테이블 헤더 셀

shadcn의 Table 컴포넌트를 확장:

```typescript
'use client'

import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface AdminTableHeaderProps {
  children: ReactNode
  sortable?: boolean
  onSort?: () => void
  align?: 'left' | 'center' | 'right'
  width?: string | number
}

export function AdminTableHeader({
  children,
  sortable = false,
  onSort,
  align = 'left',
  width,
}: AdminTableHeaderProps) {
  return (
    <TableHead
      className={cn(
        'bg-gray-50 font-semibold text-gray-900 border-b border-gray-200',
        'text-sm h-12 px-4 py-3',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        sortable && 'cursor-pointer hover:bg-gray-100 select-none',
      )}
      onClick={sortable ? onSort : undefined}
      style={width ? { width } : undefined}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4v12m6-13v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        )}
      </div>
    </TableHead>
  )
}
```

### 5. 모달(Dialog) 확인 컴포넌트

shadcn의 Dialog 확장 - 삭제 확인 등:

```typescript
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AdminButton } from './Button'

interface AdminConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'warning',
  isLoading = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-gray-600 mt-2">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 pt-4">
          <AdminButton
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </AdminButton>
          <AdminButton
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 6. 실제 사용 예: 회원 관리 테이블

```typescript
'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AdminButton } from './Button'
import { AdminBadge } from './Badge'
import { AdminTableHeader } from './TableHeader'
import { AdminConfirmDialog } from './ConfirmDialog'

interface User {
  id: string
  name: string
  email: string
  grade: 'gold' | 'silver' | 'bronze'
  status: 'active' | 'inactive'
  joinedAt: string
}

export function UserManagementTable({ users }: { users: User[] }) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      // API 호출
      await fetch(`/api/users/${deleteId}`, { method: 'DELETE' })
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <AdminTableHeader width="25%">이름</AdminTableHeader>
              <AdminTableHeader width="30%">이메일</AdminTableHeader>
              <AdminTableHeader width="15%">등급</AdminTableHeader>
              <AdminTableHeader width="15%">상태</AdminTableHeader>
              <AdminTableHeader width="15%" align="center">
                작업
              </AdminTableHeader>
            </TableRow>
          </TableHeader>

          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className="hover:bg-gray-50 border-b border-gray-200"
              >
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-gray-600">{user.email}</TableCell>
                <TableCell>
                  <AdminBadge
                    status="success"
                    label={user.grade.toUpperCase()}
                    size="sm"
                  />
                </TableCell>
                <TableCell>
                  <AdminBadge
                    status={user.status === 'active' ? 'success' : 'danger'}
                    label={user.status === 'active' ? '활성' : '정지'}
                    size="sm"
                  />
                </TableCell>
                <TableCell className="flex items-center justify-center gap-2">
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // 수정 로직
                    }}
                  >
                    수정
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteId(user.id)}
                  >
                    삭제
                  </AdminButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AdminConfirmDialog
        open={!!deleteId}
        title="회원 삭제"
        description="이 회원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
```

---

## ❌ 틀린 패턴

### shadcn 컴포넌트 직접 사용

```typescript
// ❌ 틀린 예 - shadcn 컴포넌트를 직접 사용
import { Button } from '@/components/ui/button'

export function UserList() {
  return <Button onClick={() => {}}>삭제</Button>
}

// ✅ 올바른 예 - Admin 래퍼 컴포넌트 사용
import { AdminButton } from '@/components/admin/Button'

export function UserList() {
  return <AdminButton variant="danger">삭제</AdminButton>
}
```

### 색상 하드코딩

```typescript
// ❌ 틀린 예
<div className="bg-green-500 text-white">활성</div>

// ✅ 올바른 예 - 재사용 가능한 컴포넌트
<AdminBadge status="success" label="활성" />
```

### Props 타입 미지정

```typescript
// ❌ 틀린 예
export function CustomButton(props) {
  return <button className={props.className}>{props.children}</button>
}

// ✅ 올바른 예
interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
}

export function CustomButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: CustomButtonProps) {
  // ...
}
```

### Shadcn 기본 스타일 무시

```typescript
// ❌ 틀린 예 - shadcn의 기본 구조 무시
<div style={{ padding: '10px', background: '#fff' }}>
  <span style={{ color: 'red' }}>에러</span>
</div>

// ✅ 올바른 예 - 기존 컴포넌트 활용
<div className="p-2.5 bg-white">
  <AdminBadge status="danger" label="에러" />
</div>
```

---

## 📋 Admin 컴포넌트 체크리스트

### 구현
- [ ] `@/src/components/admin/` 에 새 컴포넌트 생성했는가?
- [ ] 기존 admin 컴포넌트를 먼저 확인했는가?
- [ ] shadcn/ui 기본 컴포넌트를 래핑했는가?
- [ ] Props에 명시적 타입을 지정했는가?

### 디자인 일관성
- [ ] Figma 스펙과 일치하는가?
- [ ] 색상이 Figma의 정확한 값인가?
- [ ] 모든 상태(hover, active, disabled)를 구현했는가?
- [ ] 다른 admin 컴포넌트와 스타일이 일치하는가?

### 재사용성
- [ ] Props를 충분히 커스터마이징 가능하게 했는가?
- [ ] `className` prop을 지원하는가?
- [ ] 공통 패턴을 분리했는가? (Button, Badge 등)
- [ ] 매직 문자열 대신 상수나 타입을 사용했는가?

### 코드 품질
- [ ] `npm run type-check` 통과
- [ ] `npm run lint` 통과
- [ ] `'use client'` 선언이 필요한가?
- [ ] 서버 컴포넌트로 가능한가?

### 문서화
- [ ] 컴포넌트의 목적이 명확한가?
- [ ] Props 설명이 충분한가?
- [ ] 사용 예시가 있는가?
