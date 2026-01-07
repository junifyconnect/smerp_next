---
alwaysApply: true
---

# 18. Dialog 패턴 및 컴포넌트 책임 분리

## 🎯 핵심 원칙

1. **Dialog는 action 주도권을 가진다** - Dialog 컴포넌트가 직접 Server Action을 실행
2. **부모는 후처리만 담당** - 성공 시 필요한 동작(새로고침, 선택 해제)만 수행
3. **책임을 명확히 분리** - Dialog(action + toast), Parent(상태 관리 + 후처리)

---

## 📦 공통 Dialog 컴포넌트

`@/components/common/Dialog` 컴포넌트를 사용합니다.

### 기본 구조

```tsx
import { Dialog } from '@/components/common/Dialog'

<Dialog isOpen={isOpen} onClose={onClose} size="md">
  <Dialog.Header title="제목">
    <p className="text-md text-gray-600">설명 텍스트</p>
  </Dialog.Header>

  <Dialog.Content className="px-[24px] py-[24px]">
    {/* 컨텐츠 */}
  </Dialog.Content>

  <Dialog.Footer>
    <div className="flex gap-[12px]">
      <Button variant="black" size="lg" fullWidth onClick={onClose}>
        취소
      </Button>
      <Button variant="fill" size="lg" fullWidth onClick={handleSubmit}>
        확인
      </Button>
    </div>
  </Dialog.Footer>
</Dialog>
```

### Dialog 사이즈

| size | width |
|------|-------|
| sm | 560px |
| md | 720px |
| lg | 1080px |

---

## 📁 폴더 구조

```
feature/
├── page.tsx
├── _client/
│   └── FeaturePageClient.tsx
├── _components/
│   └── FeatureTable.tsx
├── _dialogs/                      ← 다이얼로그 전용 폴더
│   ├── FeatureEditDialog.tsx
│   ├── FeatureDeleteDialog.tsx
│   └── FeatureCreateDialog.tsx
├── _actions/
│   └── updateFeature.ts
└── _types/
    └── feature.ts
```

**네이밍 규칙:**
- 파일명: `*Dialog.tsx`
- 컴포넌트명: `*Dialog`
- 인터페이스명: `*DialogProps`

---

## ✅ 올바른 패턴

### 1. Dialog 컴포넌트 (action 주도권을 가짐)

```tsx
// _dialogs/ProfileEditDialog.tsx
'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@/components/common/Dialog'
import { Button } from '@/components/common/form/Button'
import { Input } from '@/components/common/form/Input'
import { toast } from 'sonner'  // Client는 sonner 사용
import { useExecuteAction } from '@/hooks/useExecuteAction'
import { updateProfile } from '../_actions/updateProfile'
import type { ProfileInfo } from '../_types/profile'

interface ProfileEditDialogProps {
  isOpen: boolean
  onClose: () => void
  profileInfo: ProfileInfo
  onSuccess?: () => void  // ⭐ 성공 시 콜백만 받음
}

export function ProfileEditDialog({
  isOpen,
  onClose,
  profileInfo,
  onSuccess,
}: ProfileEditDialogProps) {
  const executeAction = useExecuteAction()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ⭐ props 변경 시 state 업데이트 (필수!)
  useEffect(() => {
    if (isOpen) {
      setName(profileInfo.name)
      setEmail(profileInfo.email)
    }
  }, [isOpen, profileInfo])

  // ⭐ Dialog가 직접 action을 수행
  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const result = await executeAction(() => updateProfile({
        name,
        email,
      }))

      if (result) {
        toast.success('프로필이 수정되었습니다')
        onSuccess?.()  // ⭐ 부모에게 성공 알림
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="sm">
      <Dialog.Header title="프로필 수정">
        <p className="text-md text-gray-600 leading-[20px]">
          프로필 정보를 수정합니다
        </p>
      </Dialog.Header>

      <Dialog.Content className="px-[24px] py-[24px]">
        <div className="flex flex-col gap-[20px]">
          <Input
            label="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </Dialog.Content>

      <Dialog.Footer>
        <div className="flex gap-[12px]">
          <Button
            variant="black"
            size="lg"
            fullWidth
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            variant="fill"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            loading={isSubmitting}
          >
            수정하기
          </Button>
        </div>
      </Dialog.Footer>
    </Dialog>
  )
}
```

### 2. 부모 컴포넌트 (후처리만 담당)

```tsx
// _client/ProfilePageClient.tsx
'use client'

import { useState } from 'react'
import { ProfileEditDialog } from '../_dialogs/ProfileEditDialog'
import { ProfileCard } from '../_components/ProfileCard'
import type { ProfileInfo } from '../_types/profile'

interface ProfilePageClientProps {
  initialData: ProfileInfo
}

export function ProfilePageClient({ initialData }: ProfilePageClientProps) {
  const [profileInfo, setProfileInfo] = useState(initialData)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // ⭐ 데이터 새로고침만 담당
  const handleEditSuccess = async () => {
    // 데이터 새로고침 로직
    const result = await executeAction(() => getProfile())
    if (result) {
      setProfileInfo(result.data)
    }
  }

  return (
    <>
      <ProfileCard
        profileInfo={profileInfo}
        onEditClick={() => setIsEditDialogOpen(true)}
      />

      {/* ⭐ Dialog에게는 onSuccess 콜백만 전달 */}
      <ProfileEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        profileInfo={profileInfo}
        onSuccess={handleEditSuccess}
      />
    </>
  )
}
```

### 3. 삭제 확인 Dialog 예제

```tsx
// _dialogs/ItemDeleteDialog.tsx
'use client'

import { useState } from 'react'
import { Dialog } from '@/components/common/Dialog'
import { Button } from '@/components/common/form/Button'
import { toast } from 'sonner'
import { useExecuteAction } from '@/hooks/useExecuteAction'
import { deleteItems } from '../_actions/deleteItems'

interface ItemDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  itemIds: string[]
  onSuccess?: () => void
}

export function ItemDeleteDialog({
  isOpen,
  onClose,
  itemIds,
  onSuccess,
}: ItemDeleteDialogProps) {
  const executeAction = useExecuteAction()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDelete = async () => {
    setIsSubmitting(true)

    try {
      const result = await executeAction(() => deleteItems({ ids: itemIds }))

      if (result) {
        toast.success(`${itemIds.length}개 항목이 삭제되었습니다`)
        onSuccess?.()
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="sm">
      <Dialog.Header title="삭제 확인" />

      <Dialog.Content className="px-[24px] py-[24px]">
        <p className="text-md text-gray-700">
          선택한 <span className="font-bold text-primary-700">{itemIds.length}개</span> 항목을 삭제하시겠습니까?
        </p>
        <p className="text-sm text-gray-500 mt-[8px]">
          이 작업은 되돌릴 수 없습니다.
        </p>
      </Dialog.Content>

      <Dialog.Footer>
        <div className="flex gap-[12px]">
          <Button
            variant="black"
            size="lg"
            fullWidth
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            variant="fill"
            size="lg"
            fullWidth
            onClick={handleDelete}
            loading={isSubmitting}
          >
            삭제
          </Button>
        </div>
      </Dialog.Footer>
    </Dialog>
  )
}
```

---

## ❌ 잘못된 패턴

### 1. 부모가 action을 수행하는 패턴

```tsx
// ❌ BAD - 부모 컴포넌트가 action 수행
export function ProfilePage() {
  const handleDialogSubmit = async (formData: { name: string }) => {
    // ❌ 부모가 복잡한 로직 처리
    const result = await executeAction(() => updateProfile(formData))
    if (result) {
      toast.success('수정되었습니다')
      refreshData()
    }
  }

  return (
    <ProfileEditDialog
      onSubmit={handleDialogSubmit}  // ❌ Dialog는 form data만 전달
    />
  )
}
```

### 2. useEffect 없이 props 변경 처리

```tsx
// ❌ BAD - props 변경이 반영되지 않음
export function ProfileEditDialog({ profileInfo }: Props) {
  // 초기 렌더링 시 한 번만 설정됨
  const [name, setName] = useState(profileInfo.name)

  // ❌ useEffect 없음 - Dialog를 다시 열어도 이전 값 유지
}

// ✅ GOOD
export function ProfileEditDialog({ isOpen, profileInfo }: Props) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(profileInfo.name)  // ✅ Dialog 열릴 때마다 초기화
    }
  }, [isOpen, profileInfo])
}
```

### 3. Dialog가 부모 상태를 직접 수정

```tsx
// ❌ BAD - Dialog가 부모 상태까지 직접 수정
export function ProfileEditDialog({ setProfileInfo }: Props) {
  const handleSubmit = async () => {
    const result = await updateProfile(...)
    if (result) {
      setProfileInfo(result.data)  // ❌ 부모 상태 직접 수정
    }
  }
}

// ✅ GOOD - onSuccess 콜백만 호출
export function ProfileEditDialog({ onSuccess }: Props) {
  const handleSubmit = async () => {
    const result = await updateProfile(...)
    if (result) {
      onSuccess?.()  // ✅ 부모가 알아서 처리
    }
  }
}
```

---

## 📋 체크리스트

### Dialog 컴포넌트 작성 시:
- [ ] `Dialog` 공통 컴포넌트 사용 (`@/components/common/Dialog`)
- [ ] `_dialogs/` 폴더에 위치
- [ ] 파일명은 `*Dialog.tsx` 형식
- [ ] `useExecuteAction` 사용하여 Server Action 직접 호출
- [ ] `toast.success()` / `toast.error()` 로 결과 알림 (Client는 sonner)
- [ ] `onSuccess?: () => void` prop으로 성공 콜백 받기
- [ ] `useEffect`로 props 변경 시 state 초기화
- [ ] `isSubmitting` state로 로딩 상태 관리

### 부모 컴포넌트 작성 시:
- [ ] `isOpen`, `setIsDialogOpen` 상태 관리
- [ ] 필요시 선택된 데이터 상태 관리
- [ ] `handleSuccess` 함수로 후처리만 담당 (새로고침, 선택 해제)
- [ ] Dialog에게 `onSuccess={handleSuccess}` 전달

---

## 🎯 핵심 포인트

1. **책임 분리 명확히**
   - Dialog: action 실행 + validation + toast + onSuccess 호출
   - Parent: 상태 관리 + Dialog 열기/닫기 + 후처리

2. **action 주도권은 Dialog가 가짐**
   - Dialog가 `useExecuteAction()` 직접 사용
   - Dialog가 Server Action 직접 호출
   - 부모는 `onSuccess` 콜백만 받음

3. **useEffect 필수**
   - Dialog가 열릴 때마다 props로 받은 값을 state에 설정
   - `[isOpen, data]` dependency 사용

4. **Toast 사용**
   - `toast` from 'sonner' 사용 (전역 통일)
