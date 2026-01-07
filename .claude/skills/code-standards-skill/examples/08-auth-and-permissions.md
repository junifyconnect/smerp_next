---
alwaysApply: true
---

# 인증 & 권한 패턴

## ✅ 올바른 패턴

### actionAuth / actionAuth 사용

**next-safe-action**의 미들웨어를 사용하면 모든 Server Action에서 인증 체크를 자동화할 수 있습니다.

```typescript
// src/lib/action/actionHandler.ts

import { createSafeActionClient } from 'next-safe-action'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

// ✅ 인증 불필요한 액션
export const action = createSafeActionClient()

// ✅ 인증 필요한 액션 (자동 인증 체크)
export const actionAuth = createSafeActionClient()
  .use(async ({ next }) => {
    const session = await auth()

    if (!session?.user?.id) {
      redirect('/login')  // 자동 리다이렉트
    }

    // ctx.userId 자동 전달
    return next({ ctx: { userId: session.user.id } })
  })
```

```typescript
// src/lib/action/actionHandler.ts

import { createSafeActionClient } from 'next-safe-action'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

// ✅ 인증 불필요한 액션
export const action = createSafeActionClient()

// ✅ Admin 인증 필요한 액션 (자동 인증 체크)
export const actionAuth = createSafeActionClient()
  .use(async ({ next }) => {
    const session = await auth()

    if (!session?.user?.id) {
      redirect('/admin/login')  // Admin 로그인으로 리다이렉트
    }

    // ctx.userId 자동 전달
    return next({ ctx: { userId: session.user.id } })
  })
```

### 인증 필수 API
```typescript
// src/app/(client)/(protected)/(detail)/my/actions.ts

'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { api, ApiError } from '@/lib/api/client'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { z } from 'zod'

const getUserDataSchema = z.void()

interface UserProfile {
  profileNickname: string | null
  name: string | null
}

/**
 * 🔒 보호된 API - 인증 필수
 * - 로그인한 사용자만 접근 가능
 * - UNAUTHORIZED 에러는 자동으로 처리됨 (redirect to /login)
 */
export const getUserData = actionAuth
  .inputSchema(getUserDataSchema)
  .action(async ({ ctx }) => {
    try {
      // ctx.userId는 이미 인증된 상태 (미들웨어에서 자동 체크)

      // 외부 API 호출
      const user = await api.get<UserProfile>(`/users/${ctx.userId}/profile`)

      if (!user) {
        return actionError('USER_NOT_FOUND')
      }

      return actionSuccess({
        nickname: user.profileNickname || user.name,
        points: 0,
      }, 'OK')
    } catch (error) {
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

### 역할 기반 접근 제어 (RBAC)
```typescript
// src/app/(admin)/admin/users/list/actions.ts

'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { api, ApiError } from '@/lib/api/client'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { z } from 'zod'
import { auth } from '@/auth'

const listUsersSchema = z.void()

interface UserListItem {
  id: string
  loginId: string
  name: string
  role: string
  createdAt: string
}

/**
 * 🔒🔒 Admin 전용 API
 * - 관리자 권한만 접근 가능
 */
export const listUsers = actionAuth
  .inputSchema(listUsersSchema)
  .action(async ({ ctx }) => {
    try {
      // ctx.userId는 이미 인증된 상태

      // ✅ 권한 확인 (Admin인지)
      const session = await auth()
      if (session?.user?.role !== 'ADMIN') {
        return actionError('FORBIDDEN')  // 권한 없음
      }

      // 권한 확인됨 → 외부 API 호출
      const users = await api.get<UserListItem[]>('/admin/users?limit=50')

      return actionSuccess({ users }, 'OK')
    } catch (error) {
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

### 자신의 리소스만 접근
```typescript
'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { api, ApiError } from '@/lib/api/client'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('유효한 이메일을 입력해주세요'),
})

interface UpdatedProfile {
  id: string
  name: string
  email: string
}

/**
 * 🔒 자신의 프로필만 수정 가능
 * - 다른 사용자의 데이터 수정 불가
 */
export const updateMyProfile = actionAuth
  .inputSchema(updateProfileSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      // ✅ 자신의 ID로만 업데이트 (클라이언트 ID 신뢰 X)
      const updated = await api.put<UpdatedProfile>(
        `/users/${ctx.userId}`,  // 세션에서만 가져옴
        parsedInput
      )

      return actionSuccess(updated, 'OK')
    } catch (error) {
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      console.error('Failed to update user:', error)
      return actionError('UPDATE_FAILED', error)
    }
  })
```

### 다중 역할 확인
```typescript
'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { z } from 'zod'
import { auth } from '@/auth'

const editAuditLogSchema = z.object({
  logId: z.string(),
  changes: z.record(z.any()),
})

export const editAuditLog = actionAuth
  .inputSchema(editAuditLogSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      // ✅ 여러 역할 확인
      const session = await auth()
      const isAuthorized = ['ADMIN', 'AUDIT_MANAGER'].includes(session?.user?.role || '')

      if (!isAuthorized) {
        return actionError('FORBIDDEN')
      }

      // 로직...
      return actionSuccess({ success: true }, 'OK')
    } catch (error) {
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

---

## ❌ 틀린 패턴

### 기존 방식 사용 (수동 인증 체크)
```typescript
// ❌ 잘못됨 - 기존 방식 (수동 인증)
'use server'

export async function deleteUser(userId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return actionError('UNAUTHORIZED')
  }

  if (session.user.role !== 'ADMIN') {
    return actionError('FORBIDDEN')
  }

  await api.delete(`/users/${userId}`)
}

// ✅ 올바름 - actionAuth 사용 (자동 인증)
const deleteUserSchema = z.object({
  userId: z.string(),
})

export const deleteUser = actionAuth
  .inputSchema(deleteUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    // ctx.userId 이미 인증된 상태

    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return actionError('FORBIDDEN')
    }

    await api.delete(`/users/${parsedInput.userId}`)
    return actionSuccess({ success: true }, 'OK')
  })
```

### action 사용 (인증 필요한데)
```typescript
// ❌ 잘못됨 - 인증 필요한데 action 사용
export const getUserProfile = action  // 인증 체크 없음!
  .inputSchema(z.void())
  .action(async () => {
    // 누구나 접근 가능!
    const users = await api.get('/users')
    return actionSuccess(users, 'OK')
  })

// ✅ 올바름 - actionAuth 사용
export const getUserProfile = actionAuth
  .inputSchema(z.void())
  .action(async ({ ctx }) => {
    // ctx.userId로 자신의 정보만 조회
    const user = await api.get(`/users/${ctx.userId}`)
    return actionSuccess(user, 'OK')
  })
```

### 권한 확인 부재
```typescript
// ❌ 잘못됨 - Admin 권한 확인 없음
export const listAllUsers = actionAuth
  .inputSchema(z.void())
  .action(async ({ ctx }) => {
    // 권한 확인 없음 - 일반 사용자도 모든 사용자 조회 가능!
    const users = await api.get('/admin/users')
    return actionSuccess(users, 'OK')
  })

// ✅ 올바름 - Admin 권한 확인
export const listAllUsers = actionAuth
  .inputSchema(z.void())
  .action(async ({ ctx }) => {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return actionError('FORBIDDEN')
    }

    const users = await api.get('/admin/users')
    return actionSuccess(users, 'OK')
  })
```

### 클라이언트에서 받은 ID 신뢰
```typescript
// ❌ 잘못됨 - 클라이언트에서 받은 userId를 신뢰
const updateUserSchema = z.object({
  userId: z.string(),  // 클라이언트 입력 - 신뢰할 수 없음!
  name: z.string(),
})

export const updateUser = actionAuth
  .inputSchema(updateUserSchema)
  .action(async ({ parsedInput }) => {
    await api.put(`/users/${parsedInput.userId}`, {  // 다른 사람 ID 보낼 수 있음!
      name: parsedInput.name,
    })
  })

// ✅ 올바름 - ctx.userId만 사용
const updateProfileSchema = z.object({
  name: z.string(),
})

export const updateProfile = actionAuth
  .inputSchema(updateProfileSchema)
  .action(async ({ parsedInput, ctx }) => {
    await api.put(`/users/${ctx.userId}`, {  // 세션에서만!
      name: parsedInput.name,
    })
    return actionSuccess({ success: true }, 'OK')
  })
```

---

## 📋 체크리스트

- [ ] 인증 필요한 액션은 `actionAuth` 또는 `actionAuth` 사용했는가?
- [ ] 인증 불필요한 액션만 `action` 또는 `action` 사용했는가?
- [ ] Admin 전용 API에서 role 권한을 확인했는가?
- [ ] 자신의 리소스만 수정하도록 `ctx.userId` 사용했는가?
- [ ] 클라이언트에서 받은 userId를 신뢰하지 않았는가?
- [ ] 다중 역할이 필요한 경우 모두 확인했는가?
- [ ] 권한 없을 때 `FORBIDDEN` 에러를 반환했는가?

## 📖 참고 문서

- `20-action-handler-pattern.md` - Action Handler 전체 가이드
- `01-server-actions.md` - Server Actions 패턴
- `05-error-handling.md` - 에러 처리 패턴
