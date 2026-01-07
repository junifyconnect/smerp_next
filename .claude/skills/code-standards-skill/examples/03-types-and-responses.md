---
alwaysApply: true
---

# 타입 & 응답 패턴

## ✅ 올바른 패턴

### 실제 사례: 마이페이지 타입
```typescript
// src/app/(client)/(protected)/(detail)/my/_type/mypage.ts

import type { ActionResponse } from '@/types/responseType'

// ✅ Response Data 타입만 정의
export interface UserInfoData {
  nickname: string
  points: number
}

export interface MenuItemData {
  id: string
  icon: string
  label: string
  href: string
}

// Request 타입은 Zod validators에서 자동 생성!
// export type UserInfoRequest = z.infer<typeof userInfoSchema>
```

### 페이지별 _types 구조
```typescript
// src/app/admin/users/list/_types/list.ts

export interface UserListItem {
  id: string
  loginId: string
  name: string
  role: 'ADMIN' | 'USER'
  createdAt: string
}

export interface UserListData {
  users: UserListItem[]
  total: number
  page: number
}

export type UserListResponse = ActionResponse<UserListData>
```

### Server Action 정의 (next-safe-action)
```typescript
// src/app/admin/users/create/actions.ts

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

interface CreateUserData {
  id: string
  loginId: string
  name: string
}

// ✅ next-safe-action 패턴 사용
export const createUserAction = action
  .inputSchema(createUserSchema)
  .action(async ({ parsedInput }) => {
    try {
      // parsedInput은 이미 검증됨
      // 외부 API 호출
      const user = await api.post<CreateUserData>('/users', parsedInput)

      // ✅ actionSuccess로 응답
      return actionSuccess({
        id: user.id,
        loginId: user.loginId,
        name: user.name,
      }, 'CREATED')
    } catch (error) {
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      return actionError('USER_CREATE_FAILED', error)
    }
  })
```

### Client Component에서 사용 (useExecuteAction)
```typescript
// src/app/admin/users/create/_components/CreateForm.tsx

'use client'

import { useState } from 'react'
import { useExecuteAction } from '@/hooks/useExecuteAction'
import { createUserAction } from '../actions'

export function CreateForm() {
  const executeAction = useExecuteAction()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)

    // ✅ useExecuteAction으로 자동 에러 처리
    const result = await executeAction(() => createUserAction({
      loginId: formData.get('loginId') as string,
      loginPw: formData.get('loginPw') as string,
      name: formData.get('name') as string,
    }))

    setLoading(false)

    if (result) {
      // 성공시 데이터 사용 (타입 안전)
      console.log(result.id)
      console.log(result.loginId)
    }
    // validation 에러, 비즈니스 에러 모두 자동으로 toast 표시됨
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      handleSubmit(new FormData(e.currentTarget))
    }}>
      {/* ... */}
      <button type="submit" disabled={loading}>
        {loading ? '생성 중...' : '생성'}
      </button>
    </form>
  )
}
```

---

## ❌ 틀린 패턴

### 기존 방식 사용 (async function)
```typescript
// ❌ 잘못됨 - 기존 방식
'use server'

export async function createUserAction(data: CreateUserRequest): Promise<ActionResponse<CreateUserData>> {
  try {
    const user = await api.post('/users', data)
    return actionSuccess(user, 'CREATED')
  } catch (error) {
    return actionError('USER_CREATE_FAILED', error)
  }
}

// ✅ 올바름 - next-safe-action 사용
export const createUserAction = action
  .inputSchema(createUserSchema)
  .action(async ({ parsedInput }) => {
    // ...
  })
```

### Client에서 수동 에러 처리
```typescript
// ❌ 잘못됨 - 수동 에러 처리
'use client'

const result = await createUserAction(data)

if (!result.success) {
  setError(result.data)  // 수동 에러 처리
  return
}

// ✅ 올바름 - useExecuteAction 사용
const executeAction = useExecuteAction()
const result = await executeAction(() => createUserAction(data))

if (result) {
  // 성공 처리
}
// 에러는 자동으로 toast 표시됨
```

### any 타입 사용
```typescript
// ❌ 잘못됨
export const updateUser = action
  .inputSchema(z.any())  // any 사용하지 마세요
  .action(async ({ parsedInput }) => {
    // ...
  })

// ✅ 올바름
const updateUserSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const updateUser = action
  .inputSchema(updateUserSchema)
  .action(async ({ parsedInput }) => {
    // parsedInput은 타입 안전
  })
```

### 공통 응답 타입 미사용
```typescript
// ❌ 잘못됨
return {
  success: true,
  message: '성공',
  data: user,
}

return {
  success: false,
  error: '실패',
  code: 'ERROR_CODE',
}

// ✅ 올바름
return actionSuccess(user, 'OK')
return actionError('ERROR_CODE', error)
```

---

## 📋 체크리스트

### Server Action
- [ ] `action` 또는 `action` 사용했는가?
- [ ] `inputSchema`로 Zod 검증 설정했는가?
- [ ] Response 데이터 타입만 `_types` 폴더에 정의했는가?
- [ ] API 응답 타입은 `@/types`에 정의했는가?
- [ ] 응답은 `actionSuccess/actionError`로 반환했는가?

### Client Component
- [ ] `useExecuteAction` 또는 `useExecuteAction` 사용했는가?
- [ ] executeAction의 결과를 null 체크했는가?
- [ ] 수동 에러 처리 코드를 제거했는가?

## 📖 참고 문서

- `20-action-handler-pattern.md` - Action Handler 전체 가이드
- `01-server-actions.md` - Server Actions 패턴
- `02-zod-validation.md` - Zod 검증 패턴
