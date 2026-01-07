---
alwaysApply: true
---

# Client Component 패턴

## ✅ 올바른 패턴

### 실제 사례: Server Action 호출하는 컴포넌트 (useExecuteAction)
```typescript
// src/app/(client)/(protected)/(detail)/my/_components/UserInfo.tsx

'use client'

import { useEffect, useState } from 'react'
import { getUserData } from '@/app/(client)/(protected)/(detail)/my/actions'
import { useExecuteAction } from '@/hooks/useExecuteAction'
import type { UserInfoData } from '../_type/mypage'

export function UserInfo() {
  const executeAction = useExecuteAction()
  const [userData, setUserData] = useState<UserInfoData>({
    nickname: '',
    points: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // ✅ useExecuteAction으로 자동 에러 처리
      const result = await executeAction(() => getUserData())

      if (result) {
        setUserData(result)
      }
      // 에러는 자동으로 toast 표시됨

      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) return <div>로딩 중...</div>

  return (
    <div className="w-full bg-white flex flex-col gap-4 pt-3 pb-3">
      <div className="px-4 py-2.5">
        <p className="text-lg font-semibold">{userData.nickname}님</p>
        <p className="text-sm text-gray-600">포인트: {userData.points}</p>
      </div>
    </div>
  )
}
```

### Props와 함께 사용하는 컴포넌트
```typescript
// src/app/(client)/(protected)/(detail)/my/_components/ProfileCard.tsx

'use client'

import { useRouter } from 'next/navigation'
import { ArrowIcon } from '@/components/ui/ArrowIcon'

interface ProfileCardProps {
  nickname: string
  onToggle?: () => void
}

export function ProfileCard({ nickname, onToggle }: ProfileCardProps) {
  const router = useRouter()

  const handleClick = () => {
    onToggle?.()
    router.push('/user')
  }

  return (
    <div className="flex items-center justify-between w-full gap-2">
      {/* 프로필 이미지 + 정보 */}
      <div className="flex gap-2 items-center flex-1">
        <div className="bg-[#f1f1f1] rounded-full w-12 h-12 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>

        {/* 텍스트 */}
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-base text-[#222222]">안녕하세요.</p>
          <p className="font-semibold text-base text-[#222222]">{nickname}님</p>
        </div>
      </div>

      {/* 클릭 가능한 아이콘 */}
      <button
        onClick={handleClick}
        className="flex items-center justify-center flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <ArrowIcon direction="right" />
      </button>
    </div>
  )
}
```

### 폼 제출 컴포넌트 (useExecuteAction)
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useExecuteAction } from '@/hooks/useExecuteAction'
import { createUserAction } from '../actions'

export function CreateForm() {
  const router = useRouter()
  const executeAction = useExecuteAction()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    loginId: '',
    loginPw: '',
    name: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    // ✅ useExecuteAction으로 자동 에러 처리
    const result = await executeAction(() => createUserAction(formData))

    setLoading(false)

    if (result) {
      // 성공시 처리
      router.push('/login')
    }
    // 에러는 자동으로 toast 표시됨
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        name="loginId"
        value={formData.loginId}
        onChange={handleChange}
        placeholder="이메일"
        required
      />

      <input
        type="password"
        name="loginPw"
        value={formData.loginPw}
        onChange={handleChange}
        placeholder="비밀번호"
        required
      />

      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="이름"
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? '처리 중...' : '가입'}
      </button>
    </form>
  )
}
```

### 에러 시 리다이렉트 (redirectUrl 옵션)
```typescript
'use client'

import { useExecuteAction } from '@/hooks/useExecuteAction'
import { deleteAccountAction } from '../actions'
import { useState } from 'react'

export function DeleteAccountButton() {
  const executeAction = useExecuteAction()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('정말 탈퇴하시겠습니까?')) return

    setLoading(true)

    // ✅ 에러 발생 시 자동으로 /error로 리다이렉트
    const result = await executeAction(
      () => deleteAccountAction(),
      {
        errorMessage: '계정 삭제에 실패했습니다',
        redirectUrl: '/error',
      }
    )

    setLoading(false)

    if (result) {
      // 성공 처리 (보통 서버에서 redirect 됨)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="bg-red-500 text-white px-4 py-2 rounded"
    >
      {loading ? '처리 중...' : '회원 탈퇴'}
    </button>
  )
}
```

---

## ❌ 틀린 패턴

### useExecuteAction 사용하지 않음 (기존 방식)
```typescript
// ❌ 잘못됨 - 기존 방식 (수동 에러 처리)
'use client'

import { useState } from 'react'
import { createUserAction } from '../actions'

export function CreateForm() {
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: FormData) => {
    const response = await createUserAction(data)

    // 수동 에러 처리
    if (!response.success) {
      setError(response.data)
      return
    }

    // 성공 처리
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div>{error}</div>}
      {/* ... */}
    </form>
  )
}

// ✅ 올바름 - useExecuteAction 사용
'use client'

import { useState } from 'react'
import { useExecuteAction } from '@/hooks/useExecuteAction'
import { createUserAction } from '../actions'

export function CreateForm() {
  const executeAction = useExecuteAction()

  const handleSubmit = async (data: FormData) => {
    const result = await executeAction(() => createUserAction(data))

    if (result) {
      // 성공 처리
    }
    // 에러는 자동으로 toast 표시됨
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>
}
```

### 'use client' 누락
```typescript
// ❌ 잘못됨 - useState, useEffect 사용하는데 'use client' 없음
import { useState, useEffect } from 'react'

export function UserInfo() {
  const [data, setData] = useState(null)
  // ...
}

// ✅ 올바름
'use client'

import { useState, useEffect } from 'react'

export function UserInfo() {
  const [data, setData] = useState(null)
  // ...
}
```

### Hook을 최상단에서 호출하지 않음
```typescript
// ❌ 잘못됨
export function MyComponent() {
  const handleClick = () => {
    const executeAction = useExecuteAction() // Hook은 최상단에서만!
  }
}

// ✅ 올바름
export function MyComponent() {
  const executeAction = useExecuteAction()

  const handleClick = () => {
    // executeAction 사용
  }
}
```

### Props 타입 미지정
```typescript
// ❌ 잘못됨
export function ProfileCard(props) {
  return <div>{props.nickname}</div>
}

// ✅ 올바름
interface ProfileCardProps {
  nickname: string
  onToggle?: () => void
}

export function ProfileCard({ nickname, onToggle }: ProfileCardProps) {
  return <div>{nickname}</div>
}
```

### 로딩 상태 미처리
```typescript
// ❌ 잘못됨 - 로딩 상태 없음
export function UserInfo() {
  const executeAction = useExecuteAction()
  const [data, setData] = useState(null)

  useEffect(() => {
    executeAction(() => getUserData()).then((result) => {
      if (result) setData(result)
    })
  }, [])

  // data가 null일 때 렌더링 에러 발생
  return <div>{data.nickname}</div>
}

// ✅ 올바름
export function UserInfo() {
  const executeAction = useExecuteAction()
  const [data, setData] = useState<UserInfoData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const result = await executeAction(() => getUserData())
      if (result) setData(result)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div>로딩 중...</div>
  if (!data) return null

  return <div>{data.nickname}</div>
}
```

---

## 📋 체크리스트

- [ ] `'use client'` 선언했는가?
- [ ] `useExecuteAction` 또는 `useExecuteAction` 사용했는가?
- [ ] Hook을 컴포넌트 최상단에서 호출했는가?
- [ ] executeAction의 결과를 null 체크했는가?
- [ ] 모든 Props에 타입을 지정했는가?
- [ ] 로딩 상태를 관리했는가?
- [ ] useEffect에 dependencies를 지정했는가?

## 📖 참고 문서

- `20-action-handler-pattern.md` - Action Handler 전체 가이드
- `01-server-actions.md` - Server Actions 패턴
