---
alwaysApply: true
---

# Zod 검증 패턴

## ✅ 올바른 패턴

### 실제 사례: 로그인 검증
```typescript
// src/validators/auth.ts

import { z } from 'zod'

export const loginSchema = z.object({
  loginId: z
    .email('아이디는 유효한 이메일 형식이어야 합니다')
    .min(1, '아이디는 필수입니다')
    .toLowerCase()
    .trim(),
  loginPw: z
    .string()
    .min(1, '비밀번호는 필수입니다')
    .min(6, '비밀번호는 최소 6글자 이상이어야 합니다')
    .max(100, '비밀번호는 최대 100글자입니다'),
})

// ✅ 타입 자동 생성 (타입 정의 불필요!)
export type LoginRequest = z.infer<typeof loginSchema>
```

### 커스텀 검증 (refine) - 비밀번호 일치 확인
```typescript
// src/validators/auth.ts

export const signupSchema = z
  .object({
    loginId: z
      .email('아이디는 유효한 이메일 형식이어야 합니다')
      .toLowerCase()
      .trim(),
    loginPw: z
      .string()
      .min(6, '비밀번호는 최소 6글자 이상이어야 합니다')
      .max(100, '비밀번호는 최대 100글자입니다'),
    confirmPw: z
      .string()
      .min(6, '비밀번호 확인은 최소 6글자 이상이어야 합니다')
      .max(100, '비밀번호 확인은 최대 100글자입니다'),
    name: z
      .string()
      .min(1, '이름은 필수입니다')
      .max(50, '이름은 최대 50글자입니다')
      .trim(),
  })
  .refine((data) => data.loginPw === data.confirmPw, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPw'],  // 에러가 confirmPw 필드에 표시됨
  })

export type SignupRequest = z.infer<typeof signupSchema>
```

### 선택적 필드 - 카카오 사용자 정보
```typescript
// src/validators/auth.ts

export const kakaoUserSchema = z.object({
  kakaoId: z.string().min(1, '카카오 ID는 필수입니다'),

  // ✅ 선택적 필드 (optional)
  profileNickname: z
    .string()
    .max(100, '닉네임은 최대 100글자입니다')
    .optional(),

  name: z
    .string()
    .min(1, '이름은 필수입니다')
    .max(100, '이름은 최대 100글자입니다'),

  // ✅ 정규표현식으로 형식 검증
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '생일은 YYYY-MM-DD 형식이어야 합니다')
    .optional(),

  phoneNumber: z
    .string()
    .regex(/^\d{3}-\d{3,4}-\d{4}$/, '전화번호는 010-1234-5678 형식이어야 합니다')
    .optional(),
})

export type KakaoUserRequest = z.infer<typeof kakaoUserSchema>
```

### 페이지네이션 검증 (coerce로 형식 변환)
```typescript
// src/validators/pagination.ts

import { z } from 'zod'

export const paginationSchema = z.object({
  // ✅ coerce: 문자열 → 숫자 자동 변환
  page: z
    .coerce.number()
    .min(1, 'page는 1 이상이어야 합니다')
    .default(1),
  pageSize: z
    .coerce.number()
    .min(1, 'pageSize는 1 이상이어야 합니다')
    .max(100, 'pageSize는 최대 100입니다')
    .default(10),
})

export type PaginationParams = z.infer<typeof paginationSchema>

// 사용 예
const result = paginationSchema.parse({
  page: searchParams.get('page'),      // '2' (문자열)
  pageSize: searchParams.get('pageSize'),  // '20' (문자열)
})
// result.data.page === 2 (숫자로 변환됨!)
// result.data.pageSize === 20 (숫자로 변환됨!)
```

### next-safe-action에서 Zod 사용 (권장)
```typescript
'use server'

import { action } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { api, ApiError } from '@/lib/api/client'
import { z } from 'zod'

const loginSchema = z.object({
  loginId: z.email('유효한 이메일을 입력해주세요').toLowerCase().trim(),
  loginPw: z.string().min(6, '비밀번호는 최소 6자 이상입니다'),
})

interface LoginResponse {
  id: string
  loginId: string
  name: string
  accessToken: string
}

// ✅ inputSchema로 자동 검증
export const loginAction = action
  .inputSchema(loginSchema)
  .action(async ({ parsedInput }) => {
    try {
      // parsedInput은 이미 검증됨
      const { loginId, loginPw } = parsedInput

      // 외부 API 호출
      const result = await api.post<LoginResponse>('/auth/login', {
        loginId,
        loginPw,
      })

      return actionSuccess({ id: result.id, loginId: result.loginId }, 'OK')
    } catch (error) {
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      return actionError('LOGIN_FAILED', error)
    }
  })
```

---

## ❌ 틀린 패턴

### 타입만 정의하고 스키마 미정의
```typescript
// ❌ 잘못됨
interface CreateUserRequest {
  loginId: string
  loginPw: string
  name: string
}

// 런타임 검증이 없음
export async function createUserAction(data: CreateUserRequest) {
  // data가 실제로 요구사항을 만족하는지 모름
}
```

### 기존 방식 사용 (이제 사용하지 않음)
```typescript
// ❌ 잘못됨 - 기존 방식
export async function loginAction(data: LoginRequest) {
  const result = loginSchema.parse(data)  // 수동 검증
// ...
}

// ✅ 올바름 - next-safe-action 사용
export const loginAction = action
  .inputSchema(loginSchema)  // 자동 검증
  .action(async ({ parsedInput }) => {
    // parsedInput 이미 검증됨
  })
```

### inputSchema 없이 사용
```typescript
// ❌ 잘못됨 - inputSchema 없음
export const createUser = action
  .action(async ({ parsedInput }) => {  // parsedInput 타입 없음!
    // ...
  })

// ✅ 올바름
export const createUser = action
  .inputSchema(createUserSchema)  // 스키마 필수!
  .action(async ({ parsedInput }) => {
    // parsedInput 타입 안전
  })
```

### 외부 데이터 검증 안함
```typescript
// ❌ 잘못됨
const userId = searchParams.get('id')  // string | null

export async function getUser() {
  const user = await api.get(`/users/${userId}`)  // 검증 없음!
}

// ✅ 올바름
const userIdSchema = z.string().uuid()
const validatedId = userIdSchema.parse(userId)
const user = await api.get(`/users/${validatedId}`)
```

---

## 📋 체크리스트

- [ ] 모든 Server Action에 `inputSchema` 설정했는가?
- [ ] 에러 메시지가 사용자 친화적인가?
- [ ] 타입은 `z.infer<typeof schema>`로 추출했는가?
- [ ] URL params, searchParams, query도 검증했는가?
- [ ] coerce를 사용하여 타입 변환했는가? (필요 시)

## 📖 참고 문서

- `01-server-actions.md` - Server Actions 패턴
- `20-action-handler-pattern.md` - Action Handler 전체 가이드
