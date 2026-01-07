---
alwaysApply: true
---

# Action Handler Pattern

## 개요

Server Action 실행 시 에러 처리, validation, toast 알림을 통합 관리하는 패턴입니다.

## 파일 구조

```
src/
├── hooks/
│   └── useExecuteAction.ts     # 액션 실행 Hook (Sonner toast)
│
└── lib/
    └── action/
        └── actionHandler.ts    # next-safe-action 설정
```

## 1. Server Action 정의 (Server Component)

```typescript
// app/(client)/(protected)/profile/actions.ts
'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { api, ApiError } from '@/lib/api/client'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
})

interface UpdatedUser {
  id: string
  name: string
  email: string
}

export const updateProfile = actionAuth
  .inputSchema(updateProfileSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      // 외부 API 호출
      const updated = await api.put<UpdatedUser>(`/users/${ctx.userId}`, {
        name: parsedInput.name,
        email: parsedInput.email,
      })

      return actionSuccess(updated, 'OK')
    } catch (error) {
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

## 2. Client Component에서 사용

```typescript
'use client'

import { useExecuteAction } from '@/hooks/useExecuteAction'
import { updateProfile } from './actions'
import { useState } from 'react'

export function ProfileEditForm() {
  const executeAction = useExecuteAction()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: { name: string; email: string }) => {
    setIsLoading(true)

    const result = await executeAction(() => updateProfile(data))

    setIsLoading(false)

    if (result && result.data) {
      // 성공 처리
      console.log('Updated user:', result.data)
    }
    // 에러는 자동으로 toast 표시됨
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      handleSubmit({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
      })
    }}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit" disabled={isLoading}>
        {isLoading ? '저장 중...' : '저장'}
      </button>
    </form>
  )
}
```

## 3. 옵션 사용

### 커스텀 에러 메시지

```typescript
const result = await executeAction(
  () => updateProfile(data),
  { errorMessage: '프로필 업데이트에 실패했습니다' }
)
```

### 에러 시 리다이렉트

```typescript
const result = await executeAction(
  () => deleteAccount(),
  {
    errorMessage: '계정 삭제에 실패했습니다',
    redirectUrl: '/error'  // 에러 발생 시 자동으로 /error로 이동
  }
)
```

## 4. useTransition과 함께 사용

```typescript
'use client'

import { useExecuteAction } from '@/hooks/useExecuteAction'
import { updateProfile } from './actions'
import { useTransition } from 'react'

export function ProfileForm() {
  const executeAction = useExecuteAction()
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (data: FormData) => {
    startTransition(async () => {
      const result = await executeAction(() => updateProfile({
        name: data.get('name') as string,
        email: data.get('email') as string,
      }))

      if (result) {
        // 성공 처리
      }
    })
  }

  return (
    <form action={handleSubmit}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit" disabled={isPending}>
        {isPending ? '저장 중...' : '저장'}
      </button>
    </form>
  )
}
```

## 5. 인증이 필요 없는 액션

```typescript
// Server Action
import { action } from '@/lib/action/actionHandler'
import { api, ApiError } from '@/lib/api/client'

export const sendContactForm = action
  .inputSchema(contactSchema)
  .action(async ({ parsedInput }) => {
    try {
      // 인증 없이 실행 가능
      await api.post('/contact', parsedInput)
      return actionSuccess({ sent: true }, 'OK')
    } catch (error) {
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })

// Client Component
const result = await executeAction(() => sendContactForm(data))
```

## 주요 특징

1. **자동 에러 처리**: Validation 에러, 서버 에러 모두 자동 처리
2. **Toast 자동 표시**: Sonner를 사용한 통일된 Toast 알림
3. **타입 안전성**: TypeScript 제네릭으로 완벽한 타입 추론
4. **일관된 패턴**: 모든 페이지에서 동일한 사용 방식
5. **옵션 제공**: 커스텀 메시지, 리다이렉트 등
6. **SuccessResponse 자동 처리**: Server Action의 SuccessResponse를 자동으로 반환

## 에러 처리 흐름

```
1. Validation 에러 (inputSchema)
   ↓
   validationErrors 반환 → Toast 표시 → return null

2. 응답 없음
   ↓
   Toast 표시 → return null

3. SuccessResponse.success === false
   ↓
   에러 메시지 Toast 표시 → return null

4. 성공
   ↓
   return SuccessResponse<T>
   (executeAction이 자동으로 반환, 개발자는 result?.success 체크)
```

## SuccessResponse 사용법

### 기본 사용 (data만 있는 경우)

```typescript
// Server Action
export const updateProfile = actionAuth
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const user = await api.put(`/users/${ctx.userId}`, parsedInput)
    return actionSuccess(user, 'OK')
  })

// Client Component
const result = await executeAction(() => updateProfile(data))

if (result && result.data) {
  // result.data로 직접 접근
  console.log('Updated user:', result.data)
}
```

### Pagination이 있는 경우

```typescript
// Server Action
export const getUsers = actionAuth
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const result = await api.get<{ users: User[]; total: number }>('/users')

    return actionSuccess(result.users, 'OK', {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    })
  })

// Client Component
const result = await executeAction(() => getUsers())

if (result && result.data) {
  // result.data와 result.pagination 모두 접근 가능
  setData(result.data)

  if (result.pagination) {
    setPagination(result.pagination)
    console.log(`Total: ${result.pagination.total}`)
  }
}
```

## 주의사항

1. **Hook 호출**: 컴포넌트 최상단에서 호출
   ```typescript
   // ✅ 올바름
   export function MyComponent() {
     const executeAction = useExecuteAction()
     // ...
   }

   // ❌ 잘못됨
   export function MyComponent() {
     const handleClick = () => {
       const executeAction = useExecuteAction() // Hook은 최상단에서만!
     }
   }
   ```

2. **에러 처리**: executeAction은 에러를 throw하지 않음 (null 반환)
   ```typescript
   const result = await executeAction(() => someAction())

   // ✅ SuccessResponse 체크
   if (result?.success && result.data) {
     // 성공 처리 - result.data 사용
     console.log(result.data)

     // 페이지네이션이 있는 경우
     if (result.pagination) {
       console.log(result.pagination.total)
     }
   }
   // 에러는 자동으로 toast 표시됨
   ```

3. **NEXT_REDIRECT**: Next.js redirect는 자동으로 re-throw됨
   ```typescript
   // Server Action에서 redirect 사용 가능
   if (condition) {
     redirect('/other-page')
   }
   ```
