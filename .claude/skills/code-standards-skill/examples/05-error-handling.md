---
alwaysApply: true
---

# 에러 처리 패턴

## ✅ 올바른 패턴

### 기본 에러 처리 (인증 필요)
```typescript
'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { actionError, actionSuccess } from '@/lib/response/responseHandler'
import { api, ApiError } from '@/lib/api/client'
import { z } from 'zod'

const getUserDataSchema = z.void()

interface UserData {
  id: string
  name: string
}

export const getUserData = actionAuth
  .inputSchema(getUserDataSchema)
  .action(async ({ ctx }) => {
    try {
      // ctx.userId는 이미 인증된 상태 (UNAUTHORIZED 에러 자동 처리됨)

      // 1️⃣ 데이터 조회 (외부 API 호출)
      const user = await api.get<UserData>(`/users/${ctx.userId}`)

      // 2️⃣ 데이터 없음 → 에러
      if (!user) {
        return actionError('USER_NOT_FOUND')
      }

      // 3️⃣ 성공 응답
      return actionSuccess(user, 'OK')
    } catch (error) {
      // 4️⃣ API 에러 처리
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      // 5️⃣ 예상 불가능한 에러
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

### 비즈니스 로직 검증 (inputSchema로 자동 검증)
```typescript
'use server'

import { action } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { api, ApiError } from '@/lib/api/client'
import { z } from 'zod'

const createUserSchema = z.object({
  loginId: z.string().email('유효한 이메일을 입력해주세요').toLowerCase().trim(),
  loginPw: z.string().min(6, '비밀번호는 최소 6자 이상입니다'),
  name: z.string().min(1, '이름을 입력해주세요'),
})

interface CreateUserResponse {
  id: string
  loginId: string
  name: string
}

// ✅ inputSchema로 자동 검증 (parsedInput은 검증 완료된 데이터)
export const createUserAction = action
  .inputSchema(createUserSchema)
  .action(async ({ parsedInput }) => {
    try {
      // 외부 API 호출 (중복 체크는 API 서버에서 처리)
      const user = await api.post<CreateUserResponse>('/auth/signup', parsedInput)

      return actionSuccess(user, 'CREATED')
    } catch (error) {
      if (error instanceof ApiError) {
        // API 에러 코드에 따라 분기 (예: 중복 이메일)
        if (error.code === 'DUPLICATE_LOGIN_ID') {
          return actionError('DUPLICATE_LOGIN_ID')
        }
        return actionError(error.code, error)
      }
      return actionError('USER_CREATE_FAILED', error)
    }
  })
```

### 조건부 에러 (인증 + 검증)
```typescript
'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { api, ApiError } from '@/lib/api/client'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('유효한 이메일을 입력해주세요'),
})

interface UpdateUserResponse {
  id: string
  name: string
  email: string
}

export const updateUserAction = actionAuth
  .inputSchema(updateUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      // ctx.userId로 자신의 정보만 수정 (클라이언트 ID 신뢰 X)
      const updated = await api.put<UpdateUserResponse>(
        `/users/${ctx.userId}`,
        parsedInput
      )

      return actionSuccess(updated, 'OK')
    } catch (error) {
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      return actionError('UPDATE_FAILED', error)
    }
  })
```

### Client에서 자동 에러 처리
```typescript
'use client'

import { useExecuteAction } from '@/hooks/useExecuteAction'
import { createUserAction } from '../actions'
import { useState } from 'react'

export function CreateUserForm() {
  const executeAction = useExecuteAction()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data: { loginId: string; loginPw: string; name: string }) => {
    setLoading(true)

    // ✅ 모든 에러는 자동으로 toast 표시됨
    const result = await executeAction(() => createUserAction(data))

    setLoading(false)

    if (result) {
      // 성공 처리
      console.log('Created user:', result)
    }
    // validation 에러, 비즈니스 에러, 서버 에러 모두 자동 처리됨
  }

  return <form>{/* ... */}</form>
}
```

---

## ❌ 틀린 패턴

### 기존 방식 사용 (async function)
```typescript
// ❌ 잘못됨 - 기존 방식
'use server'

export async function getUserData() {
  const session = await auth()
  if (!session?.user?.id) {
    return actionError('UNAUTHORIZED')
  }
  const user = await api.get(`/users/${session.user.id}`)
  // ...
}

// ✅ 올바름 - next-safe-action 사용
export const getUserData = actionAuth
  .inputSchema(z.void())
  .action(async ({ ctx }) => {
    // ctx.userId 자동 제공, UNAUTHORIZED 자동 처리
    const user = await api.get(`/users/${ctx.userId}`)
    // ...
  })
```

### inputSchema 없이 사용
```typescript
// ❌ 잘못됨 - 수동 검증
export const createUser = action
  .action(async ({ parsedInput }) => {
    const schema = z.object({ name: z.string() })
    const validated = schema.parse(parsedInput)  // 수동 검증
    // ...
  })

// ✅ 올바름 - inputSchema 사용
const createUserSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
})

export const createUser = action
  .inputSchema(createUserSchema)  // 자동 검증
  .action(async ({ parsedInput }) => {
    // parsedInput은 이미 검증됨
    // ...
  })
```

### Client에서 수동 에러 처리
```typescript
// ❌ 잘못됨 - 수동 에러 처리
'use client'

export function MyComponent() {
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: FormData) => {
    const response = await createUserAction(data)

    if (!response.success) {
      setError(response.data)  // 수동으로 에러 관리
      return
    }
    // ...
  }

  return (
    <form>
      {error && <div>{error}</div>}
    </form>
  )
}

// ✅ 올바름 - useExecuteAction 사용
'use client'

import { useExecuteAction } from '@/hooks/useExecuteAction'

export function MyComponent() {
  const executeAction = useExecuteAction()

  const handleSubmit = async (data: FormData) => {
    const result = await executeAction(() => createUserAction(data))

    if (result) {
      // 성공 처리
    }
    // 에러는 자동으로 toast 표시됨
  }

  return <form>{/* ... */}</form>
}
```

### try-catch 누락
```typescript
// ❌ 잘못됨
export const getUser = actionAuth
  .inputSchema(z.void())
  .action(async ({ ctx }) => {
    const user = await api.get(`/users/${ctx.userId}`)
    return actionSuccess(user)  // 에러 발생 가능
  })

// ✅ 올바름
export const getUser = actionAuth
  .inputSchema(z.void())
  .action(async ({ ctx }) => {
    try {
      const user = await api.get(`/users/${ctx.userId}`)

      if (!user) {
        return actionError('USER_NOT_FOUND')
      }

      return actionSuccess(user, 'OK')
    } catch (error) {
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

### 존재 여부 미확인
```typescript
// ❌ 잘못됨
const user = await api.get(`/users/${ctx.userId}`)
const { name } = user  // user가 null이면 런타임 에러!

// ✅ 올바름
const user = await api.get(`/users/${ctx.userId}`)
if (!user) {
  return actionError('USER_NOT_FOUND')
}
const { name } = user
```

### 에러 무시
```typescript
// ❌ 잘못됨
try {
  const user = await api.post('/users', parsedInput)
} catch (error) {
  // 에러 무시 또는 로그 안함
}

// ✅ 올바름
try {
  const user = await api.post('/users', parsedInput)
  return actionSuccess(user, 'CREATED')
} catch (error) {
  console.error('User create failed:', error)
  if (error instanceof ApiError) {
    return actionError(error.code, error)
  }
  return actionError('USER_CREATE_FAILED', error)
}
```

---

## 에러 처리 흐름

```
Server Action 호출
    ↓
1. inputSchema 검증 (자동)
   - 실패 → validationErrors 반환
   ↓
2. 인증 미들웨어 (actionAuth만)
   - 실패 → redirect('/login')
   ↓
3. action 함수 실행
   - 비즈니스 에러 → actionError() 반환
   - DB 에러 → catch → actionError() 반환
   - 성공 → actionSuccess() 반환
   ↓
Client (useExecuteAction)
    ↓
1. validationErrors 체크
   - 있으면 → Toast 표시 → return null
   ↓
2. response.success 체크
   - false → Toast 표시 → return null
   - true → return data
```

---

## 📋 체크리스트

### Server Action
- [ ] `action` 또는 `actionAuth` 사용했는가?
- [ ] `inputSchema`로 Zod 검증 설정했는가?
- [ ] try-catch로 예상 불가능한 에러를 처리했는가?
- [ ] 데이터 존재 여부를 확인했는가?
- [ ] 모든 에러 경로에서 `actionError`를 반환했는가?
- [ ] 에러 코드는 `responseCode.ts`에 등록했는가?
- [ ] 민감한 에러 정보를 노출하지 않았는가?

### Client Component
- [ ] `useExecuteAction` 또는 `useExecuteAction` 사용했는가?
- [ ] executeAction의 결과를 null 체크했는가?
- [ ] 수동 에러 처리 코드를 제거했는가?

## 📖 참고 문서

- `20-action-handler-pattern.md` - Action Handler 전체 가이드
- `01-server-actions.md` - Server Actions 패턴
- `09-client-components.md` - Client Component 패턴
