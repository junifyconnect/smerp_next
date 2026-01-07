---
alwaysApply: true
---

# 페이지 구조 패턴

## 📌 핵심 원칙

**page.tsx는 기본적으로 Server Component**로 유지합니다.

| 상황 | page.tsx | 데이터 로딩 |
|------|----------|-------------|
| 초기 데이터 필요 (리스트, 상세) | Server Component | page.tsx에서 서버 액션 호출 → initialData 전달 |
| 초기 데이터 불필요 (단순 UI) | Server Component (권장) 또는 Client | 자식 컴포넌트에서 필요 시 로딩 |

---

## ✅ 올바른 패턴

### 패턴 1: 초기 데이터가 필요한 경우 (권장)

리스트 페이지, 상세 페이지 등 **페이지 로드 시 데이터가 바로 보여야 하는 경우**

```
src/app/(client)/(protected)/users/
├── page.tsx                          (Server Component - 초기 데이터 로딩)
├── _actions/
│   └── getUsers.ts                   (Server Action)
├── _client/
│   └── UsersPageClient.tsx           (Client Component - 상태 관리)
├── _components/
│   └── UsersTable.tsx                (Client Component - UI)
├── _type/
│   └── user.ts                       (응답 타입)
└── _lib/
    └── searchParams.ts               (nuqs 파라미터 정의)
```

#### 1. page.tsx (Server Component - 초기 데이터 로딩)

```typescript
// src/app/(client)/(protected)/users/page.tsx

import { unwrapAll } from '@/lib/action/unwrapAll'
import { getUsers } from './_actions/getUsers'
import { UsersPageClient } from './_client/UsersPageClient'
import { loadAllTabParams, convertAllTabFilters } from './_lib/searchParams'
import type { SearchParams } from '@/types/route'

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const parsed = loadAllTabParams(sp)
  const filters = convertAllTabFilters(parsed)

  // ✅ 서버에서 초기 데이터 로딩 (네트워크 왕복 없음)
  const [usersResponse] = await unwrapAll([getUsers(filters)])

  return <UsersPageClient initialData={usersResponse} />
}
```

**장점:**
- SSR로 페이지 로드와 동시에 데이터 렌더링
- 깜빡임 없음 (로딩 상태 불필요)
- SEO 최적화 (HTML에 데이터 포함)

#### 2. _client/UsersPageClient.tsx (Client Component)

```typescript
// src/app/(client)/(protected)/users/_client/UsersPageClient.tsx

'use client'

import { useState } from 'react'
import { useUpdateEffect } from '@/hooks/useUpdateEffect'
import { useExecuteAction } from '@/hooks/useExecuteAction'
import { useAllTabFilters } from '../_hooks/useAllTabFilters'
import { getUsers } from '../_actions/getUsers'
import { UsersTable } from '../_components/UsersTable'
import type { SuccessResponse } from '@/types/responseType'
import type { UserListItem } from '../_type/user'

interface UsersPageClientProps {
  initialData: SuccessResponse<UserListItem[]>
}

export function UsersPageClient({ initialData }: UsersPageClientProps) {
  const executeAction = useExecuteAction()
  const { filters } = useAllTabFilters()
  const [data, setData] = useState<UserListItem[]>(initialData.data)
  const [loading, setLoading] = useState(false)

  // ✅ useUpdateEffect: 첫 렌더링 스킵, 필터 변경 시에만 재로딩
  useUpdateEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await executeAction(() => getUsers(filters))
      if (result?.success && result.data) {
        setData(result.data)
      }
      setLoading(false)
    }
    fetchData()
  }, [filters])

  return <UsersTable data={data} loading={loading} />
}
```

---

### 패턴 2: 초기 데이터가 필요 없는 경우

단순 UI 페이지, 폼 페이지 등 **페이지 로드 시 데이터가 필요 없는 경우**

```
src/app/(client)/(protected)/(detail)/my/
├── page.tsx                          (Server Component - 단순 레이아웃)
├── _actions/
│   └── getUserData.ts                (Server Action)
├── _components/
│   ├── UserInfo.tsx                  (Client Component - 데이터 fetching)
│   ├── ProfileCard.tsx               (Client Component - UI)
│   └── MenuSection.tsx               (Client Component - UI)
└── _type/
    └── mypage.ts                     (응답 타입)
```

#### 1. page.tsx (Server Component - 단순 레이아웃)

```typescript
// src/app/(client)/(protected)/(detail)/my/page.tsx

import { UserInfo } from './_components/UserInfo'
import { MenuSection } from './_components/MenuSection'

/**
 * 마이페이지 메인 화면
 * - 초기 데이터 불필요: 자식 컴포넌트에서 각자 로딩
 */
export default function MyPage() {
  return (
    <div className="w-full flex flex-col">
      <UserInfo />
      <div className="bg-[#f0f0f0] h-2 w-full" />
      <MenuSection title="메뉴" />
    </div>
  )
}
```

#### 2. _components/UserInfo.tsx (Client Component - 데이터 fetching)

```typescript
// src/app/(client)/(protected)/(detail)/my/_components/UserInfo.tsx

'use client'

import { useEffect, useState } from 'react'
import { getUserData } from '../_actions/getUserData'
import { ProfileCard } from './ProfileCard'
import type { UserInfoData } from '../_type/mypage'

export function UserInfo() {
  const [userData, setUserData] = useState<UserInfoData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserData().then((response) => {
      if (response.success) {
        setUserData(response.data)
      }
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-4">로딩 중...</div>
  if (!userData) return null

  return <ProfileCard nickname={userData.nickname} />
}
```

---

### Route Params & SearchParams 컨벤션

#### ⭐ Route Params (Dynamic Route)

```typescript
// /users/[id] 같은 동적 라우트
import type { RouteParams } from '@/types/route'

export default async function UserDetailPage({ params }: RouteParams<{ id: string }>) {
  const { id } = await params  // ⭐ await params 필수!
  // ...
}

// 여러 params가 필요한 경우
export default async function ProductDetailPage({
  params
}: RouteParams<{ category: string; id: string }>) {
  const { category, id } = await params
  // ...
}
```

#### ⭐ SearchParams (URL Query)

```typescript
// ?page=1&search=foo 같은 쿼리 파라미터
import type { SearchParams } from '@/types/route'

export default async function UsersListPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  // nuqs로 타입-안전하게 파싱
  const parsed = loadParams(sp)
}

// params + searchParams 둘 다 필요한 경우
import type { RouteParams, SearchParams } from '@/types/route'

export default async function UserDetailPage(
  props: RouteParams<{ userId: string }> & { searchParams: SearchParams }
) {
  const { userId } = await props.params
  const sp = await props.searchParams
}
```

---

### Server Action 예시

```typescript
// _actions/getUsers.ts

'use server'

import { action } from '@/lib/action/actionHandler'
import { api, ApiError } from '@/lib/api/client'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { z } from 'zod'

const getUsersFiltersSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(10),
  search: z.string().optional(),
})

interface UserListItem {
  id: string
  name: string
  email: string
}

interface UsersApiResponse {
  users: UserListItem[]
  total: number
}

export const getUsers = action
  .inputSchema(getUsersFiltersSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { page, limit, search } = parsedInput

      // 외부 API 호출
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
      })

      const result = await api.get<UsersApiResponse>(`/users?${params}`)

      return actionSuccess(result.users, 'OK', {
        total: result.total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(result.total / limit),
      })
    } catch (error) {
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

---

## ❌ 틀린 패턴

### RouteParams 타입 미사용 또는 await 누락

```typescript
// ❌ 잘못됨 - 타입 없음
export default async function UserDetailPage({ params }: any) {
  const { id } = await params
}

// ❌ 잘못됨 - await 누락
export default async function UserDetailPage({ params }: RouteParams<{ id: string }>) {
  const { id } = params  // Promise를 직접 destructure하려고 함
}

// ✅ 올바름
export default async function UserDetailPage({ params }: RouteParams<{ id: string }>) {
  const { id } = await params  // ⭐ 타입과 await 모두 필수!
}
```

### 초기 데이터 필요한데 클라이언트에서 로딩

```typescript
// ❌ 잘못됨 - 리스트 페이지인데 클라이언트에서 로딩
'use client'

export default function UsersPage() {
  const [data, setData] = useState([])

  useEffect(() => {
    getUsers().then(setData)  // 깜빡임 발생!
  }, [])

  return <UsersTable data={data} />
}

// ✅ 올바름 - 서버에서 초기 데이터 로딩
export default async function UsersPage() {
  const [data] = await unwrapAll([getUsers()])
  return <UsersPageClient initialData={data} />
}
```

### 모든 타입을 _type에 정의

```typescript
// ❌ 잘못됨 - 컴포넌트 Props를 _type에
// _type/user.ts
export interface ProfileCardProps {
  nickname: string
  onToggle?: () => void
}

// ✅ 올바름 - 컴포넌트 파일 내에서 정의
// _components/ProfileCard.tsx
interface ProfileCardProps {
  nickname: string
  onToggle?: () => void
}

export function ProfileCard({ nickname, onToggle }: ProfileCardProps) {
  // ...
}
```

### 컴포넌트가 너무 크거나 복잡

```typescript
// ❌ 잘못됨 - 500줄짜리 컴포넌트
export function UserInfo() {
  // 데이터 fetching + 상태 관리 + UI 렌더링 + 이벤트 핸들링...
}

// ✅ 올바름 - 역할별 분리
export function UserInfo({ initialData }) {
  // 상태 관리만
  return (
    <>
      <ProfileCard nickname={data.nickname} />
      <PointCard points={data.points} />
    </>
  )
}

export function ProfileCard({ nickname }) {
  // 순수 UI만
}
```

---

## 📋 체크리스트

- [ ] page.tsx는 Server Component인가? (`'use client'` 없음)
- [ ] 초기 데이터 필요한 페이지는 page.tsx에서 `unwrapAll`로 로딩하는가?
- [ ] 필터/페이지네이션 변경은 `useUpdateEffect`로 처리하는가?
- [ ] Dynamic Route 사용 시 `RouteParams<T>` 타입과 `await params`를 사용하는가?
- [ ] SearchParams 사용 시 `@/types/route`에서 import하는가?
- [ ] _type에는 응답 타입만 정의하는가? (Props는 컴포넌트 파일에)
- [ ] 각 컴포넌트의 책임이 명확한가? (데이터 fetching vs UI)
- [ ] 컴포넌트 파일 크기가 300줄 이하인가?

---

## 🔗 관련 문서

- [초기 데이터 패턴 상세](./15-initial-data-pattern.md) - useUpdateEffect, unwrapAll 상세 설명
- [nuqs URL 상태 관리](./19-nuqs-url-state-management.md) - 필터/페이지네이션 URL 동기화
- [Server Actions](./01-server-actions.md) - 서버 액션 작성 패턴
