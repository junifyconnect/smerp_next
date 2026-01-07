---
alwaysApply: true
---

# 초기 데이터 패턴 (Server/Client Component 분리)

Next.js App Router에서 **초기 데이터를 효율적으로 로딩**하는 패턴입니다.

---

## 📌 핵심 원칙

### 1. 초기 데이터 (페이지 로드 시 필요)
👉 **서버 컴포넌트에서 가져오기**

```tsx
// page.tsx - 서버 컴포넌트
export default async function UsersPage() {
  const data = await fetchInitialData()  // ✅ 서버에서 직접 실행
  return <ClientComponent initialData={data} />
}
```

**이유:**
- SSR로 페이지 로드와 동시에 데이터 렌더링
- 깜빡임 없음 (로딩 상태 불필요)
- SEO 최적화

### 2. 사용자 액션 (클릭, 제출, 필터 등)
👉 **클라이언트에서 서버 액션 호출**

```tsx
// ClientComponent.tsx - 클라이언트
'use client'
export default function ClientComponent({ initialData }) {
  const handleFilter = async (filters) => {
    const result = await filterData(filters)  // ✅ 서버 액션 호출
    setData(result)
  }
}
```

---

## ✅ 올바른 패턴

### 실제 구현 예제: Users 관리 페이지 (필터 + 테이블)

#### 1. Server Component에서 초기 데이터 로딩

```typescript
// page.tsx - Server Component
import { type PageTabItem } from '@/components/admin/pageTab'
import { getUsers } from './_actions/getUsers'
import { getUserCounts } from './_actions/getUserCounts'
import { UsersPageClient } from './_components/UsersPageClient'
import { unwrapAll } from '@/lib/action/unwrapAll'
import { loadAllTabParams, convertAllTabFilters } from './_lib/searchParams'
import type { SearchParams } from '@/types/route'

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  // nuqs의 createLoader로 타입-안전하게 파싱
  const parsed = loadAllTabParams(sp);
  const allFilters = convertAllTabFilters(parsed);

  // ✅ unwrapAll로 간단하게 (에러 처리 자동)
  // Server Action의 SuccessResponse가 자동으로 unwrap됨
  const [usersResponse, counts] = await unwrapAll([
    getUsers(allFilters),  // SuccessResponse<UserListItem[]>
    getUserCounts(),       // SuccessResponse<CountData>
  ])

  const tabs: PageTabItem[] = [
    { id: 'all', label: 'All', count: counts.data.total },
    { id: 'blocked', label: '차단회원', count: counts.data.blocked, badgeVariant: 'error' },
  ]

  return <UsersPageClient tabs={tabs} initialData={usersResponse} />
}
```

#### 2. Client Component로 탭 전환 & Context 사용

```typescript
// _components/UsersPageClient.tsx - Client Component
'use client'

import { PageTab, type PageTabItem } from '@/components/admin/pageTab'
import { AllTabContent } from '../_tabs/all_tab'
import { BlockedTabContent } from '../_tabs/blocked_tab'
import { useUsers } from '../_context/UsersContext'
import { SuccessResponse } from '@/types/responseType'
import { UserListItem } from '../_types/user.types'

interface UsersPageClientProps {
  tabs: PageTabItem[]
  initialData: SuccessResponse<UserListItem[]>  // ✅ SuccessResponse 타입
}

export function UsersPageClient({ tabs, initialData }: UsersPageClientProps) {
  const { state, setActiveTab, getCurrentFilters } = useUsers()

  const handleExcelExport = () => {
    const currentFilters = getCurrentFilters()
    console.log('엑셀 다운로드', currentFilters)
  }

  const handleTabChange = (tab: string | number) => {
    setActiveTab(tab as 'all' | 'blocked')
  }

  return (
    <PageTab
      tabs={tabs}
      activeTab={state.activeTab}
      onTabChange={handleTabChange}
      actionButton={{
        label: '엑셀 출력',
        onClick: handleExcelExport,
      }}
    >
      <AllTabContent initialData={initialData} />
      <BlockedTabContent />
    </PageTab>
  )
}
```

#### 3. Tab Content는 Server Component로 유지

```typescript
// _tabs/all_tab/index.tsx - Server Component
import { TabsContent } from '@/components/ui/tabs'
import { UserFilters } from "./filter/UserFilters"
import { UsersTable } from "./table/UsersTable"
import { SuccessResponse } from '@/types/responseType'
import { UserListItem } from "../../_types/user.types"

interface AllTabContentProps {
  initialData: SuccessResponse<UserListItem[]>  // ✅ SuccessResponse 타입
}

export function AllTabContent({ initialData }: AllTabContentProps) {
  return (
    <TabsContent value="all" className='py-2'>
      <UserFilters />
      <UsersTable initialData={initialData} />
    </TabsContent>
  )
}
```

#### 4. Table은 Client Component - 필터 변경 감지

```typescript
// _tabs/all_tab/table/UsersTable.tsx - Client Component
"use client"

import { useState, useEffect, useRef } from "react"
import { AdminTable } from "@/components/admin/table"
import { useUsers } from "../../../_context/UsersContext"
import { useExecuteAction } from "@/hooks/useExecuteAction"
import { getUsers } from "../../../_actions/getUsers"
import { SuccessResponse } from "@/types/responseType"
import { UserListItem } from "../../../_types/user.types"

interface UsersTableProps {
  initialData: SuccessResponse<UserListItem[]>  // ✅ SuccessResponse 타입
}

export function UsersTable({ initialData }: UsersTableProps) {
  const { state, setSelectedRows } = useUsers()
  const executeAction = useExecuteAction()
  const [data, setData] = useState<UserListItem[]>(initialData.data)  // ✅ initialData.data
  const [total, setTotal] = useState(initialData.pagination?.total ?? 0)  // ✅ pagination
  const [loading, setLoading] = useState(false)

  // ✅ 초기 마운트 시 fetch 스킵용 ref
  const isFirstRender = useRef(true)

  // ✅ 필터 변경 시에만 재로딩 (초기 렌더링 시 스킵)
  useEffect(() => {
    // 🎯 초기 마운트 시에는 서버에서 받은 initialData를 사용하므로 fetch 스킵
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const fetchData = async () => {
      setLoading(true)

      // ✅ useExecuteAction으로 자동 에러 처리
      // executeAction은 SuccessResponse를 자동 unwrap하여 data 반환
      const result = await executeAction(() => getUsers(state.all.filters))

      if (result?.success && result.data && result.pagination) {
        setData(result.data)
        setTotal(result.pagination.total)
      }
      // 에러는 자동으로 toast 표시됨

      setLoading(false)
    }

    fetchData()
  }, [state.all.filters, executeAction])

  const handleRowSelect = (ids: (string | number)[]) => {
    setSelectedRows('all', ids)
  }

  return (
    <AdminTable
      data={data}
      totalItems={total}
      onRowSelect={handleRowSelect}
      loading={loading}
      // ... 기타 props
    />
  )
}
```

**📌 중요: 초기 렌더링 스킵 패턴**

서버에서 이미 데이터를 받아온 경우, **컴포넌트 마운트 시 useEffect가 실행되어 중복 fetch가 발생**합니다.

**왜 발생하는가?**
```typescript
useEffect(() => {
  fetchData()  // 마운트 시 무조건 실행됨 (dependency 변경 없어도!)
}, [filters])   // dependency는 "변경 감지"용이지 "첫 실행 방지"용이 아님
```

**해결 방법: useRef로 초기 마운트 체크**
```typescript
const isFirstRender = useRef(true)

useEffect(() => {
  // 첫 번째 렌더링 시 early return
  if (isFirstRender.current) {
    isFirstRender.current = false
    return
  }

  // 이후부터는 정상적으로 fetch
  fetchData()
}, [filters])
```

**실행 흐름:**
1. **새로고침 시:** 서버에서 데이터 fetch → initialData 사용 → useEffect 스킵 ✅
2. **필터 변경 시:** useEffect 실행 → 새 데이터 fetch ✅

이는 **2024년 React/Next.js 권장 패턴**으로, 불필요한 중복 요청을 방지합니다.

---

**📌 Alternative: useUpdateEffect Hook (권장)**

매번 `useRef`로 초기 마운트를 체크하는 대신, **커스텀 훅**을 사용하면 더 깔끔합니다.

```typescript
// src/hooks/useUpdateEffect.ts
import { useEffect, useRef } from 'react'

/**
 * 첫 렌더링을 제외하고 의존성이 변경될 때만 실행되는 useEffect
 * @param effect 실행할 함수
 * @param deps 의존성 배열
 */
export function useUpdateEffect(effect: React.EffectCallback, deps: React.DependencyList) {
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }

    return effect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
```

**사용 예시:**
```typescript
// _tabs/all_tab/table/UsersTable.tsx - useUpdateEffect 사용
"use client"

import { useState } from "react"
import { useUpdateEffect } from "@/hooks/useUpdateEffect"  // ✅ 커스텀 훅
import { AdminTable } from "@/components/admin/table"
import { useExecuteAction } from "@/hooks/useExecuteAction"
import { getUsers } from "../../../_actions/getUsers"
import { UserListItem } from "../../../_types/user.types"

export function UsersTable({ initialData }: UsersTableProps) {
  const executeAction = useExecuteAction()
  const { filters } = useAllTabFilters()
  const [data, setData] = useState<UserListItem[]>(initialData.data)
  const [loading, setLoading] = useState(false)

  // ✅ useUpdateEffect 사용 - 훨씬 깔끔!
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
  }, [filters, executeAction])

  return <AdminTable data={data} loading={loading} />
}
```

**장점:**
- ✅ 보일러플레이트 코드 제거 (useRef 선언 불필요)
- ✅ 의도가 명확함: "업데이트 시에만 실행"
- ✅ 재사용성: 모든 컴포넌트에서 사용 가능
- ✅ 타입 안전: cleanup 함수도 정상 작동
- ✅ 업계 표준: `ahooks`, `react-use` 등에서 검증된 패턴

**비교:**
```typescript
// ❌ useRef 직접 사용 - 매번 반복 작성
const isFirstRender = useRef(true)
useEffect(() => {
  if (isFirstRender.current) {
    isFirstRender.current = false
    return
  }
  fetchData()
}, [filters])

// ✅ useUpdateEffect - 한 줄로 깔끔
useUpdateEffect(() => {
  fetchData()
}, [filters])
```

---

#### 5. Server Action으로 데이터 조회

```typescript
// _actions/getUsers.ts
'use server'

import { action } from '@/lib/action/actionHandler'
import { api, ApiError } from '@/lib/api/client'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { z } from 'zod'
import { UserListItem } from '../_types/user.types'

const getUsersFiltersSchema = z.object({
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).optional(),
  searchKeyword: z.string().optional(),
}).optional()

interface ApiUser {
  id: string
  name: string | null
  profileNickname: string | null
  phoneNumber: string | null
  createdAt: string
}

// ✅ next-safe-action 패턴 사용
export const getUsersAction = action
  .inputSchema(getUsersFiltersSchema)
  .action(async ({ parsedInput }) => {
    try {
      // parsedInput은 이미 검증됨
      const validatedFilters = parsedInput

      // 쿼리 파라미터 구성
      const params = new URLSearchParams()
      if (validatedFilters?.dateRange?.start) {
        params.append('startDate', validatedFilters.dateRange.start.toISOString())
      }
      if (validatedFilters?.dateRange?.end) {
        params.append('endDate', validatedFilters.dateRange.end.toISOString())
      }
      if (validatedFilters?.searchKeyword) {
        params.append('search', validatedFilters.searchKeyword)
      }

      // 외부 API 호출
      const users = await api.get<ApiUser[]>(`/users?${params.toString()}`)

      const userList: UserListItem[] = users.map((user) => ({
        id: user.id,
        name: user.name || '-',
        nickname: user.profileNickname || '-',
        email: '-',
        phone: user.phoneNumber || '-',
        lastLogin: '-',
        totalAmount: '0원',
        points: '0P',
        createdAt: new Date(user.createdAt).toLocaleDateString('ko-KR'),
      }))

      return actionSuccess({ users: userList }, 'OK')
    } catch (error) {
      if (error instanceof ApiError) {
        return actionError(error.code, error)
      }
      console.error('Failed to fetch users:', error)
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
```

**참고:** Server Component에서 직접 호출할 때는 `unwrapAll` 사용:

```typescript
// page.tsx에서 사용
import { unwrapAll } from '@/lib/action/unwrapAll'

export default async function UsersPage() {
  // ✅ unwrapAll로 간단하게 (에러 처리 자동)
  const [usersData] = await unwrapAll([getUsersAction()])

  return <UsersPageClient initialData={usersData.users} />
}
```

**폴더 구조:**
```
users/
├── page.tsx                    (서버 - 초기 데이터 로딩)
├── layout.tsx                  (클라이언트 - Provider)
├── _actions/
│   └── getUsers.ts            (서버 액션)
├── _components/
│   └── UsersPageClient.tsx    (클라이언트 - 탭 전환)
├── _context/
│   ├── types.ts               (Context 타입)
│   └── UsersContext.tsx       (Context + Hook)
├── _types/
│   └── user.types.ts          (페이지 타입)
└── _tabs/
    ├── all_tab/
    │   ├── index.tsx          (서버 - Props 전달)
    │   ├── filter/
    │   │   └── UserFilters.tsx (클라이언트 - 필터 입력)
    │   └── table/
    │       └── UsersTable.tsx  (클라이언트 - 데이터 표시 & 재로딩)
    └── blocked_tab/
```

---

## ❌ 잘못된 패턴

### Anti-pattern 1: page.tsx에 'use client' (초기 데이터 있는 경우)

```tsx
// ❌ 나쁜 예: 초기 데이터가 있는데 클라이언트 컴포넌트
'use client'

import { useState, useEffect } from 'react'

export default function UsersPage() {
  const [data, setData] = useState([])

  useEffect(() => {
    getUsers().then(result => setData(result.data))
  }, [])

  return <div>Users: {data.length}</div>  // 초기에 0이 깜빡임
}
```

**문제점:**
- 초기 로딩 시 빈 데이터 보임 (깜빡임)
- SEO에 데이터가 잡히지 않음
- 불필요한 클라이언트 요청

---

### Anti-pattern 2: Context에 서버 데이터 저장

```tsx
// ❌ 나쁜 예: Context에 data 저장
interface UsersState {
  filters: FilterState
  data: User[]        // ❌ 서버 데이터를 Context에
  loading: boolean
}

const [state, setState] = useState({ data: [] })

useEffect(() => {
  getUsers().then(result => {
    setState({ data: result.data })  // ❌ Context에 저장
  })
}, [])
```

**문제점:**
- Context가 복잡해짐
- 데이터 관리 책임이 불명확
- 초기 데이터 전달의 장점 상실

**해결:**
```tsx
// ✅ 좋은 예: 데이터는 컴포넌트에서 관리
function UsersTable({ initialData }) {
  const [data, setData] = useState(initialData)  // ✅ 로컬 상태

  useEffect(() => {
    getUsers(filters).then(result => setData(result.data))
  }, [filters])
}
```

---

### Anti-pattern 3: 모든 탭 내용을 Server Component로

```tsx
// ❌ 나쁜 예: AllTabContent가 async인데 page.tsx가 'use client'
// page.tsx
'use client'
export default function UsersPage() {
  return (
    <PageTab>
      <AllTabContent />  {/* async Server Component */}
    </PageTab>
  )
}

// all_tab/index.tsx
export async function AllTabContent() {  // ❌ 에러!
  const data = await getUsers()
  return <UsersTable data={data} />
}
```

**에러:**
```
<AllTabContent> is an async Client Component. Only Server Components can be async.
```

**해결:**
```tsx
// ✅ page.tsx에서 데이터 로딩
import { unwrapAll } from '@/lib/action/unwrapAll'

export default async function UsersPage() {
  const [data] = await unwrapAll([getUsers()])
  return <UsersPageClient initialData={data} />
}

// AllTabContent는 props로 받기
export function AllTabContent({ initialData }) {
  return <UsersTable initialData={initialData} />
}
```

---

## 🎯 데이터 흐름

```
1. page.tsx (Server)
   → getUsers() 호출 → DB 조회
   ↓
2. UsersPageClient (Client)
   → initialData 전달
   ↓
3. AllTabContent (Server)
   → Props 전달
   ↓
4. UsersTable (Client)
   → useState(initialData) 초기값 설정
   → useEffect로 필터 변경 감지
   → getUsers(filters) 재호출
```

---

## 💡 Best Practices

### 1. 'use client' 경계 최소화

```tsx
✅ Server Component:
- page.tsx (초기 데이터 로딩)
- all_tab/index.tsx (Props 전달)

✅ Client Component:
- UsersPageClient (탭 전환, Context 사용)
- UserFilters (입력 처리)
- UsersTable (필터 변경 감지)
```

### 2. Props 전달 vs Context

```typescript
// Props: 단방향 데이터 전달
page.tsx → UsersPageClient → AllTabContent → UsersTable

// Context: 상태 공유
UserFilters ↔ Context ↔ UsersTable
```

### 3. Zod 검증은 /validators에

```typescript
// ✅ /validators/user.ts
export const getUsersFiltersSchema = z.object({
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).optional(),
  // ...
}).optional()

// ✅ actions에서 import
import { getUsersFiltersSchema } from '@/validators/user'
```

### 4. API 응답 타입 활용

```typescript
// ✅ API 응답에 맞는 타입 정의
interface ApiUserResponse {
  id: string
  name: string | null
  profileNickname: string | null
  phoneNumber: string | null
  createdAt: string
}

// ✅ 제네릭으로 타입 안전하게 사용
const users = await api.get<ApiUserResponse[]>('/users')
```

---

## 📝 체크리스트

구현 완료 후 확인:

- [ ] page.tsx는 서버 컴포넌트 ('use client' 없음)
- [ ] 초기 데이터는 page.tsx에서 로딩
- [ ] Client 로직은 별도 파일로 분리 (UsersPageClient)
- [ ] Context는 UI 상태만 관리 (data 저장 X)
- [ ] 필터 변경 시 Client에서 재로딩
- [ ] Zod 스키마는 /validators에 정의
- [ ] API 응답 타입 정의 및 활용
- [ ] 타입 체크 통과 (`npm run type-check`)

---

## 참고 예제

프로젝트 내 참고할 구현:
- `/app/(admin)/admin/(protected)/users/` - 필터 + 테이블 패턴 (완전 구현)
- `/app/(admin)/admin/(public)/signup/` - 초기 데이터 없는 경우
- `/app/(client)/(public)/login/` - 순수 클라이언트 로직
