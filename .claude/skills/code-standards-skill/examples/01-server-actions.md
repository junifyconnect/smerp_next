---
alwaysApply: true
---

# Server Actions 패턴

## ✅ 올바른 패턴

### 조회 (Read) 패턴 - 인증 필요

```typescript
// src/app/(client)/(protected)/(detail)/my/actions.ts
'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { db } from '@/lib/prisma/prisma'
import { z } from 'zod'

const getUserDataSchema = z.void()

export const getUserData = actionAuth
  .inputSchema(getUserDataSchema)
  .action(async ({ ctx }) => {
    try {
      // ctx.userId는 이미 인증된 상태
      const kakaoUser = await db.kakaoUser.findUnique({
        where: { id: ctx.userId },
        select: {
          profileNickname: true,
          name: true,
          // loginPw, email 같은 민감 정보는 제외
        },
      })

      if (!kakaoUser) {
        return actionError('USER_NOT_FOUND')
      }

      const response = {
        nickname: kakaoUser.profileNickname || kakaoUser.name || '사용자',
        points: 0,
      }

      return actionSuccess(response, 'OK')
    } catch (error) {
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

### 생성 (Create) 패턴 - 인증 불필요
```typescript
'use server'

import { action } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { db } from '@/lib/prisma/prisma'
import { hash } from 'bcrypt'
import { z } from 'zod'

const signupSchema = z.object({
  loginId: z.string().min(4, '아이디는 4자 이상이어야 합니다'),
  loginPw: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z.string().min(1, '이름을 입력해주세요'),
})

export const signupAction = action
  .inputSchema(signupSchema)
  .action(async ({ parsedInput }) => {
    try {
      // 중복 확인
      const existingUser = await db.user.findUnique({
        where: { loginId: parsedInput.loginId },
        select: { id: true },
      })

      if (existingUser) {
        return actionError('DUPLICATE_LOGIN_ID')
      }

      // 비밀번호 해싱
      const hashedPassword = await hash(parsedInput.loginPw, 10)

      // 데이터 생성
      const user = await db.user.create({
        data: {
          loginId: parsedInput.loginId,
          loginPw: hashedPassword,
          name: parsedInput.name,
        },
        select: { id: true, loginId: true, name: true },
      })

      return actionSuccess(user, 'CREATED')
    } catch (error) {
      console.error('Failed to create user:', error)
      return actionError('SIGNUP_FAILED', error)
    }
  })
```

### Client에서 사용하기
```typescript
'use client'

import { useExecuteAction } from '@/hooks/useExecuteAction'
import { signupAction } from './actions'

export function SignupForm() {
  const executeAction = useExecuteAction()

  const handleSubmit = async (data: { loginId: string; loginPw: string; name: string }) => {
    const result = await executeAction(() => signupAction(data))

    if (result) {
      // 성공 처리
      console.log('Created user:', result)
    }
    // 에러는 자동으로 toast 표시됨
  }

  return <form onSubmit={(e) => {
    e.preventDefault()
    // ... form 처리
  }}>...</form>
}
```

---

### 수정 (Update) 패턴 - 인증 필요

```typescript
'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { db } from '@/lib/prisma/prisma'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
})

export const updateProfile = actionAuth
  .inputSchema(updateProfileSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const updated = await db.user.update({
        where: { id: ctx.userId },
        data: {
          name: parsedInput.name,
          email: parsedInput.email,
        },
        select: { id: true, name: true, email: true },
      })

      return actionSuccess(updated, 'OK')
    } catch (error) {
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

### 삭제 (Delete) 패턴 - 인증 필요

```typescript
'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { db } from '@/lib/prisma/prisma'
import { z } from 'zod'

const deleteReviewSchema = z.object({
  id: z.string(),
})

export const deleteReview = actionAuth
  .inputSchema(deleteReviewSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      // 본인의 리뷰만 삭제 가능
      const review = await db.review.findUnique({
        where: { id: parsedInput.id },
        select: { userId: true },
      })

      if (!review) {
        return actionError('NOT_FOUND')
      }

      if (review.userId !== ctx.userId) {
        return actionError('FORBIDDEN')
      }

      await db.review.delete({
        where: { id: parsedInput.id },
      })

      return actionSuccess({ success: true }, 'OK')
    } catch (error) {
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

### Admin 액션 패턴

```typescript
'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { db } from '@/lib/prisma/prisma'
import { z } from 'zod'

const approveUserSchema = z.object({
  userId: z.string(),
})

export const approveUser = actionAuth
  .inputSchema(approveUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const user = await db.user.update({
        where: { id: parsedInput.userId },
        data: { status: 'APPROVED' },
        select: { id: true, status: true },
      })

      return actionSuccess(user, 'OK')
    } catch (error) {
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

---

## ❌ 틀린 패턴

### 기존 방식 사용 (이제 사용하지 않음)
```typescript
// ❌ 잘못됨 - 기존 방식
export async function getUserData(): Promise<ActionResponse<UserInfoData>> {
  const session = await auth()
  if (!session?.user?.id) {
    return actionError('UNAUTHORIZED')
  }
  // ...
}

// ✅ 올바름 - next-safe-action 사용
export const getUserData = actionAuth
  .inputSchema(z.void())
  .action(async ({ ctx }) => {
    // ctx.userId 자동 제공
    // ...
  })
```

### actionAuth/action 구분 안 함
```typescript
// ❌ 잘못됨 - 인증 필요한데 action 사용
export const updateProfile = action  // 인증 체크 없음!
  .inputSchema(updateSchema)
  .action(async ({ parsedInput }) => {
    // ...
  })

// ✅ 올바름
export const updateProfile = actionAuth  // 인증 체크 포함
  .inputSchema(updateSchema)
  .action(async ({ parsedInput, ctx }) => {
    // ctx.userId 사용 가능
  })
```

### select 없이 모든 필드 조회
```typescript
// ❌ 잘못됨 - loginPw, email 등 민감 정보도 반환됨
const user = await db.user.findUnique({
  where: { id: ctx.userId },
  // select 없음 - 모든 필드 반환
})

// ✅ 올바름
const user = await db.user.findUnique({
  where: { id: ctx.userId },
  select: {
    id: true,
    name: true,
    // loginPw, email 등은 제외
  },
})
```

### 응답 형식 불일치
```typescript
// ❌ 잘못됨
return data  // actionSuccess 사용하지 않음

// ❌ 잘못됨
return { success: true, data: item }

// ✅ 올바름
return actionSuccess(data, 'OK')
return actionError('INTERNAL_SERVER_ERROR', error)
```

---

## 📋 체크리스트

### Server Action
- [ ] `'use server'` 선언했는가?
- [ ] 인증 필요 시 `actionAuth` 또는 `actionAuth` 사용했는가?
- [ ] 인증 불필요 시 `action` 또는 `action` 사용했는가?
- [ ] `inputSchema`로 Zod 검증 설정했는가?
- [ ] DB 조회 시 select로 필요 필드만 가져왔는가?
- [ ] 민감 정보(password, token)는 제외했는가?
- [ ] 응답은 `actionSuccess/actionError`로 반환하는가?
- [ ] try-catch로 에러 처리했는가?

### Client Component
- [ ] `useExecuteAction` 또는 `useExecuteAction` 사용했는가?
- [ ] Hook을 컴포넌트 최상단에서 호출했는가?
- [ ] executeAction의 결과를 null 체크했는가?
- [ ] loading 상태를 관리하는가?

## 📖 참고 문서

더 자세한 내용은 다음 문서를 참고하세요:
- `20-action-handler-pattern.md` - Action Handler 패턴 전체 가이드
- `09-client-components.md` - Client Component 패턴
