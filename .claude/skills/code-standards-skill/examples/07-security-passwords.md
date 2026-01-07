---
alwaysApply: true
---

# 보안 & 인증 패턴

## ✅ 올바른 패턴

### 비밀번호 해싱 (bcrypt)
```typescript
// src/validators/auth.ts

import { z } from 'zod'

export const signupSchema = z
  .object({
    loginId: z.email('유효한 이메일을 입력하세요'),
    loginPw: z
      .string()
      .min(6, '비밀번호는 최소 6글자 이상')
      .max(100, '비밀번호는 최대 100글자'),
    confirmPw: z.string().min(6),
    name: z.string().min(1).max(50),
  })
  .refine((data) => data.loginPw === data.confirmPw, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPw'],
  })

export type SignupRequest = z.infer<typeof signupSchema>
```

```typescript
// src/app/(admin)/admin/signup/actions.ts

'use server'

import { signupSchema, SignupRequest } from '@/validators/auth'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { api, ApiError } from '@/lib/api/client'

interface SignupResponse {
  id: string
  loginId: string
  name: string
}

// ✅ Zod 추론 타입 직접 사용
export async function signupAction(data: SignupRequest) {
  try {
    // 외부 API 호출 (비밀번호 해싱은 API 서버에서 처리)
    // ⚠️ 비밀번호는 HTTPS로 전송되어야 함
    const user = await api.post<SignupResponse>('/auth/signup', {
      loginId: data.loginId,
      loginPw: data.loginPw,
      name: data.name,
    })

    return actionSuccess(user, 'CREATED')
  } catch (error) {
    if (error instanceof ApiError) {
      // API 서버에서 중복 체크 등을 처리하고 에러 반환
      return actionError(error.code, error)
    }
    return actionError('SIGNUP_FAILED', error)
  }
}
```

> **참고**: 비밀번호 해싱은 외부 API 서버에서 처리합니다. Next.js 서버에서는 비밀번호를 직접 해싱하지 않습니다.

### 세션 확인 (인증 필수)
```typescript
// src/app/(client)/(protected)/(detail)/my/actions.ts

'use server'

import { auth } from '@/auth'
import { api, ApiError } from '@/lib/api/client'
import { actionError, actionSuccess } from '@/lib/response/responseHandler'

interface UserProfile {
  profileNickname: string | null
  name: string | null
}

/**
 * 보호된 API - 세션 확인 필수
 */
export async function getUserData() {
  try {
    // 1️⃣ ✅ 세션 확인 (필수!)
    const session = await auth()

    // 2️⃣ 세션 없거나 user ID 없음
    if (!session?.user?.id) {
      return actionError('UNAUTHORIZED')
    }

    // 3️⃣ 외부 API 호출 (현재 사용자 ID로만)
    const user = await api.get<UserProfile>(`/users/${session.user.id}/profile`)

    if (!user) {
      return actionError('USER_NOT_FOUND')
    }

    return actionSuccess({
      nickname: user.profileNickname || user.name,
      points: 0,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return actionError(error.code, error)
    }
    return actionError('INTERNAL_SERVER_ERROR', error)
  }
}
```

### 권한 확인 (역할 기반)
```typescript
'use server'

import { auth } from '@/auth'
import { api, ApiError } from '@/lib/api/client'
import { actionError, actionSuccess } from '@/lib/response/responseHandler'

interface DashboardData {
  totalUsers: number
  activeUsers: number
  revenue: number
}

/**
 * Admin 전용 API
 */
export async function getAdminDashboard() {
  try {
    // 1️⃣ 세션 확인
    const session = await auth()
    if (!session?.user?.id) {
      return actionError('UNAUTHORIZED')
    }

    // 2️⃣ ✅ 권한 확인 (Admin인지)
    if (session.user.role !== 'ADMIN') {
      return actionError('FORBIDDEN')  // 권한 없음
    }

    // 3️⃣ Admin 권한 확인됨 → 외부 API 호출
    const dashboardData = await api.get<DashboardData>('/admin/dashboard')

    return actionSuccess(dashboardData)
  } catch (error) {
    if (error instanceof ApiError) {
      return actionError(error.code, error)
    }
    return actionError('INTERNAL_SERVER_ERROR', error)
  }
}
```

### 민감 정보 제외
```typescript
// ✅ 올바름 - API 응답에서 민감 정보 제외
interface UserResponse {
  id: string
  loginId: string
  name: string
  // ❌ loginPw는 API 응답에 포함되지 않아야 함
}

const user = await api.get<UserResponse>(`/users/${userId}`)

// 응답에 비밀번호 절대 포함 금지
return actionSuccess({
  id: user.id,
  name: user.name,
  // loginPw 제외 (API에서 애초에 반환하지 않음)
})
```

> **참고**: 외부 API 서버에서 민감 정보를 응답에서 제외해야 합니다.

---

## ❌ 틀린 패턴

### any 타입 사용
```typescript
// ❌ 잘못됨 - 타입 안전성 없음
export async function signupAction(data: any) {
  const user = await api.post('/auth/signup', data)
  return actionSuccess(user)
}

// ✅ 올바름 - Zod 추론 타입 직접 사용
export async function signupAction(data: SignupRequest) {
  try {
    // data는 이미 타입 체크됨 (컴파일 타임)
    const user = await api.post<SignupResponse>('/auth/signup', {
      loginId: data.loginId,
      loginPw: data.loginPw,
      name: data.name,
    })

    return actionSuccess(user, 'CREATED')
  } catch (error) {
    if (error instanceof ApiError) {
      return actionError(error.code, error)
    }
    return actionError('SIGNUP_FAILED', error)
  }
}
```

### 비밀번호 처리
```typescript
// ⚠️ 외부 API 사용 시 비밀번호 처리 원칙

// 1️⃣ HTTPS 필수 - 비밀번호 전송 시 반드시 HTTPS 사용
// 2️⃣ 해싱은 API 서버에서 - Next.js에서 직접 해싱하지 않음
// 3️⃣ 응답에 비밀번호 제외 - API 응답에 비밀번호 포함 금지

// ✅ 올바름 - 외부 API로 전송
const user = await api.post<SignupResponse>('/auth/signup', {
  loginId: data.loginId,
  loginPw: data.loginPw,  // HTTPS로 전송, API 서버에서 해싱
  name: data.name,
})
```

### 세션 확인 누락
```typescript
// ❌ 잘못됨 - 누구나 접근 가능
export async function updateProfile(data: UpdateProfileRequest) {
  const user = await api.put(`/users/${data.userId}`, data)  // 클라이언트에서 받은 ID
}

// ✅ 올바름 - 세션 ID만 사용
export async function updateProfile(data: UpdateProfileRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return actionError('UNAUTHORIZED')
  }

  const user = await api.put(`/users/${session.user.id}`, data)  // 세션에서만 ID 가져오기
}
```

### 비밀번호를 응답에 포함
```typescript
// ❌ 잘못됨 - API가 비밀번호를 반환하면 안 됨
interface BadUserResponse {
  id: string
  name: string
  loginPw: string  // 절대 포함하면 안 됨!
}

// ✅ 올바름 - API 응답에 비밀번호 없음
interface UserResponse {
  id: string
  name: string
  // loginPw 제외
}

const user = await api.get<UserResponse>(`/users/${userId}`)
return actionSuccess(user)
```

### 권한 확인 누락
```typescript
// ❌ 잘못됨
export async function deleteUser(userId: string) {
  // 관리자 권한 확인 없음
  await api.delete(`/users/${userId}`)
}

// ✅ 올바름
export async function deleteUser(userId: string) {
  const session = await auth()
  if (session.user.role !== 'ADMIN') {
    return actionError('FORBIDDEN')
  }

  await api.delete(`/users/${userId}`)
}
```

### 클라이언트 ID 신뢰
```typescript
// ❌ 잘못됨
export async function updateProfile(data: {
  userId: string  // 클라이언트에서 받은 ID
  name: string
}) {
  await api.put(`/users/${data.userId}`, { name: data.name })  // 신뢰할 수 없음!
}

// ✅ 올바름
export async function updateProfile(data: {
  name: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return actionError('UNAUTHORIZED')
  }

  await api.put(`/users/${session.user.id}`, { name: data.name })  // 세션에서만 가져오기
}
```

---

## 📋 체크리스트

- [ ] 비밀번호 전송은 HTTPS로 하는가?
- [ ] 인증 필요한 API에서 세션을 확인했는가?
- [ ] **Zod 추론 타입을 직접 사용했는가?** (unknown 금지)
- [ ] API 응답에 민감 정보(password)가 제외되어 있는가?
- [ ] Admin 전용 API에서 권한을 확인했는가?
- [ ] 세션 ID만 신뢰했는가? (클라이언트 ID 신뢰 X)
- [ ] 응답에 비밀번호를 포함하지 않았는가?
