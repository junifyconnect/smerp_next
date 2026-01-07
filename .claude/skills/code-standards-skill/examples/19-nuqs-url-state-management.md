---
alwaysApply: true
---

# nuqs를 사용한 URL 상태 관리 패턴

## 📌 개요

**nuqs**는 URL SearchParams를 React State처럼 관리할 수 있는 라이브러리입니다.
필터, 페이지네이션, 탭 상태 등을 URL로 관리하여 **북마크 가능**, **공유 가능**, **히스토리 지원**을 제공합니다.

---

## ✅ 핵심 원칙

### 1. **URL로 관리할 상태 vs Context로 관리할 상태**

| 상태 타입 | 관리 방법 | 이유 |
|----------|----------|------|
| 필터 (filters) | ✅ URL (nuqs) | 북마크/공유 가능, 새로고침 시 유지 |
| 페이지네이션 (page, limit) | ✅ URL (nuqs) | 현재 위치 공유 가능 |
| 탭 (activeTab) | ✅ URL (nuqs) | 어느 탭인지 명확히 표시 |
| 선택된 행 (selectedRows) | ❌ Context | UI 전용 상태, 공유 불필요 |
| 모달 열림/닫힘 | ❌ Local State | 임시 UI 상태 |

### 2. **탭별 파라미터 분리**

**같은 페이지에서 여러 탭을 사용할 경우, URL 파라미터에 prefix를 추가**하여 각 탭의 상태를 독립적으로 관리합니다.

```
❌ 나쁜 예: ?tab=all&p=3        (탭 변경 시 3페이지 그대로 유지됨)
✅ 좋은 예: ?tab=all&all_p=3    (탭별 독립적인 페이지 관리)
```

---

## 🏗️ 구조

```
src/app/(admin)/admin/(protected)/users/list/
├── _hooks/
│   ├── useAllTabFilters.ts      # All 탭용 nuqs 훅
│   └── useBlockedTabFilters.ts  # Blocked 탭용 nuqs 훅
├── _context/
│   ├── types.ts                 # selectedRows만 관리
│   └── UsersContext.tsx         # UI 상태만 Context로 관리
├── _tabs/
│   ├── all_tab/
│   │   ├── filter/
│   │   │   └── UserFilters.tsx  # useAllTabFilters 사용
│   │   └── table/
│   │       └── UsersTable.tsx   # useAllTabFilters 사용
│   └── blocked_tab/
│       ├── filter/
│       │   └── BlockedUserFilters.tsx  # useBlockedTabFilters 사용
│       └── table/
│           └── BlockedUsersTable.tsx   # useBlockedTabFilters 사용
├── _components/
│   └── UsersPageClient.tsx      # activeTab도 nuqs로 관리
└── layout.tsx                   # NuqsAdapter 추가
```

---

## 📦 설치

```bash
npm install nuqs
```

---

## 🔧 구현 단계

### 1. NuqsAdapter 추가 (최상위 layout)

**위치**: `/app/(admin)/admin/(protected)/layout-client.tsx`

```tsx
'use client'

import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { SidebarProvider } from '@/components/ui/sidebar'
// ...

export function ProtectedAdminLayoutClient({ children }) {
  return (
    <NuqsAdapter>  {/* ← 최상위에 추가 */}
      <SidebarProvider>
        {/* ... */}
      </SidebarProvider>
    </NuqsAdapter>
  )
}
```

**⚠️ 중요**:
- Admin 전체 또는 앱 전체 layout에 **한 번만** 추가
- 하위 페이지마다 추가하지 않음

---

### 2. nuqs 훅 생성

#### ✅ All 탭용 훅 (`useAllTabFilters.ts`)

```tsx
'use client'

import { useQueryStates, parseAsString, parseAsInteger, parseAsIsoDateTime } from 'nuqs'

export function useAllTabFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      // Date Range
      startDate: parseAsIsoDateTime,
      endDate: parseAsIsoDateTime,

      // Purchase Type
      purchaseType: parseAsString,

      // Search Keywords
      search: parseAsString,
      phone: parseAsString,

      // Pagination
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(5),
    },
    {
      // Batching으로 여러 파라미터 한번에 업데이트
      history: 'push',
      // shallow routing으로 리렌더링 최소화
      shallow: false,
      // ⭐ URL 키에 all_ prefix 추가하여 탭별 파라미터 분리
      urlKeys: {
        startDate: 'all_start',
        endDate: 'all_end',
        purchaseType: 'all_type',
        search: 'all_q',
        phone: 'all_ph',
        page: 'all_p',
        limit: 'all_l',
      },
    }
  )

  return {
    filters,
    setFilters,
    // 편의 함수들
    setPage: (page: number) => setFilters({ page }),
    setLimit: (limit: number) => setFilters({ limit, page: 1 }), // limit 변경 시 페이지 1로 리셋
    resetFilters: () => setFilters({
      startDate: null,
      endDate: null,
      purchaseType: null,
      search: null,
      phone: null,
      page: 1,
      limit: 5,
    }),
  }
}
```

#### ✅ Blocked 탭용 훅 (`useBlockedTabFilters.ts`)

```tsx
'use client'

import { useQueryStates, parseAsString, parseAsInteger, parseAsIsoDateTime } from 'nuqs'

export function useBlockedTabFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      // Date Range
      startDate: parseAsIsoDateTime,
      endDate: parseAsIsoDateTime,

      // Block Reason
      blockReason: parseAsString,

      // Search Keywords
      search: parseAsString,
      phone: parseAsString,

      // Pagination
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(5),
    },
    {
      history: 'push',
      shallow: false,
      // ⭐ URL 키에 blocked_ prefix 추가
      urlKeys: {
        startDate: 'blocked_start',
        endDate: 'blocked_end',
        blockReason: 'blocked_reason',
        search: 'blocked_q',
        phone: 'blocked_ph',
        page: 'blocked_p',
        limit: 'blocked_l',
      },
    }
  )

  return {
    filters,
    setFilters,
    setPage: (page: number) => setFilters({ page }),
    setLimit: (limit: number) => setFilters({ limit, page: 1 }),
    resetFilters: () => setFilters({
      startDate: null,
      endDate: null,
      blockReason: null,
      search: null,
      phone: null,
      page: 1,
      limit: 5,
    }),
  }
}
```

---

### 3. Context 단순화 (selectedRows만 관리)

#### ✅ `types.ts`

```tsx
export type TabType = 'all' | 'blocked'

export interface UsersState {
  all: {
    selectedRows: (string | number)[]
  }
  blocked: {
    selectedRows: (string | number)[]
  }
}

export interface UsersContextValue {
  state: UsersState
  setSelectedRows: (tab: TabType, rows: (string | number)[]) => void
  getSelectedRows: (tab: TabType) => (string | number)[]
}
```

#### ✅ `UsersContext.tsx`

```tsx
'use client'

import { createContext, ReactNode, useState, useContext } from 'react'
import { UsersContextValue, UsersState, TabType } from './types'

const initialState: UsersState = {
  all: { selectedRows: [] },
  blocked: { selectedRows: [] },
}

const UsersContext = createContext<UsersContextValue | null>(null)

export function UsersProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UsersState>(initialState)

  const setSelectedRows = (tab: TabType, rows: (string | number)[]) => {
    setState((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], selectedRows: rows },
    }))
  }

  const getSelectedRows = (tab: TabType) => state[tab].selectedRows

  return (
    <UsersContext.Provider value={{ state, setSelectedRows, getSelectedRows }}>
      {children}
    </UsersContext.Provider>
  )
}

export function useUsers() {
  const context = useContext(UsersContext)
  if (!context) throw new Error('useUsers must be used within UsersProvider')
  return context
}
```

---

### 4. Filter 컴포넌트에서 nuqs 사용

#### ✅ `UserFilters.tsx`

```tsx
"use client"

import { DatePickerBetween } from "@/components/admin/input/datePickerBetween"
import { SelectBox } from "@/components/admin/input/selectbox"
import { TextField } from "@/components/admin/input/textfield"
import { useAllTabFilters } from "../../../_hooks/useAllTabFilters"

export function UserFilters() {
  const { filters, setFilters } = useAllTabFilters()

  const handleDateChange = (start?: Date, end?: Date) => {
    setFilters({
      startDate: start ?? null,
      endDate: end ?? null,
    })
  }

  const handlePurchaseTypeChange = (value: string) => {
    setFilters({ purchaseType: value || null })
  }

  const handleSearchKeywordChange = (value: string) => {
    setFilters({ search: value || null })
  }

  return (
    <InputWrapper>
      <InputRow>
        <DatePickerBetween
          startDate={filters.startDate ?? undefined}
          endDate={filters.endDate ?? undefined}
          onStartDateChange={(start) => handleDateChange(start, filters.endDate ?? undefined)}
          onEndDateChange={(end) => handleDateChange(filters.startDate ?? undefined, end)}
        />
        <SelectBox
          value={filters.purchaseType ?? ""}
          onValueChange={handlePurchaseTypeChange}
          options={[
            { value: "buyer", label: "구매자" },
            { value: "non-buyer", label: "비구매자" },
          ]}
        />
      </InputRow>
      <InputRow>
        <TextField
          value={filters.search ?? ""}
          onChange={(e) => handleSearchKeywordChange(e.target.value)}
        />
      </InputRow>
    </InputWrapper>
  )
}
```

---

### 5. Table 컴포넌트에서 nuqs 사용

#### ✅ `UsersTable.tsx`

```tsx
"use client"

import { useState, useEffect } from "react"
import { AdminTable } from "@/components/admin/table"
import { useUsers } from "../../../_context/UsersContext"
import { useAllTabFilters } from "../../../_hooks/useAllTabFilters"
import { getUsers } from "../../../_actions/getUsers"

export function UsersTable({ initialData }) {
  const { state, setSelectedRows } = useUsers()
  const { filters, setPage, setLimit } = useAllTabFilters()
  const [data, setData] = useState(initialData)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // ⭐ filters가 변경될 때마다 데이터 fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await getUsers({
        dateRange: filters.startDate && filters.endDate
          ? { start: filters.startDate, end: filters.endDate }
          : undefined,
        purchaseType: filters.purchaseType ?? undefined,
        searchKeyword: filters.search ?? undefined,
        phoneKeyword: filters.phone ?? undefined,
        page: filters.page,
        limit: filters.limit,
      })

      if (result.success && result.data) {
        setData(result.data.users)
        setTotal(result.data.pagination.total)
      }
      setLoading(false)
    }

    fetchData()
  }, [filters]) // ⭐ filters 전체를 dependency로

  const handlePageChange = (page: number) => {
    setPage(page) // ⭐ URL 업데이트 → useEffect 트리거
  }

  const handleRowsPerPageChange = (rows: number) => {
    setLimit(rows) // ⭐ URL 업데이트 → useEffect 트리거
  }

  return (
    <AdminTable
      data={data}
      currentPage={filters.page}
      totalItems={total}
      rowsPerPage={filters.limit}
      selectedIds={state.all.selectedRows}
      onPageChange={handlePageChange}
      onRowsPerPageChange={handleRowsPerPageChange}
      onRowSelect={(ids) => setSelectedRows('all', ids)}
      loading={loading}
    />
  )
}
```

---

### 6. activeTab도 URL로 관리

#### ✅ `UsersPageClient.tsx`

```tsx
'use client'

import { useQueryState, parseAsStringLiteral } from 'nuqs'
import { PageTab } from '@/components/admin/pageTab'

export function UsersPageClient({ tabs, allInitialData, blockedInitialData }) {
  // ⭐ activeTab을 URL로 관리
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsStringLiteral(['all', 'blocked'] as const).withDefault('all')
  )

  const handleTabChange = (tab: string | number) => {
    void setActiveTab(tab as 'all' | 'blocked')
  }

  return (
    <PageTab
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <AllTabContent initialData={allInitialData} />
      <BlockedTabContent initialData={blockedInitialData} />
    </PageTab>
  )
}
```

---

### 7. Server/Client 동기화 (필수)

> **중요**: Server Component에서도 URL 파라미터를 읽어야 새로고침 시 깜빡임이 없습니다!

#### ❌ 잘못된 패턴 (깜빡임 발생)

```tsx
// ❌ 항상 고정된 초기값만 사용
export default async function UsersPage() {
  // URL에 ?all_p=3이 있어도 무시하고 항상 page=1만 로드
  const result = await getUsers({ page: 1, limit: 5 })

  return <UsersPageClient initialData={result.data} />
}

// 결과: 새로고침 시
// 1. 서버: page=1 데이터 렌더링
// 2. 클라이언트 마운트: URL에서 page=3 읽고 다시 fetch
// 3. 깜빡임 발생! 🔥
```

#### ✅ 올바른 패턴 (Server/Client 동기화)

##### Step 1: 공통 파서 정의 (`_lib/searchParams.ts`)

```tsx
import {
  parseAsString,
  parseAsInteger,
  parseAsIsoDateTime,
  createSearchParamsCache,
  createLoader
} from 'nuqs/server'

// ⭐ 필터 파서 정의 (Client/Server 공통)
export const allTabSearchParams = {
  startDate: parseAsIsoDateTime,
  endDate: parseAsIsoDateTime,
  purchaseType: parseAsString,
  search: parseAsString,
  phone: parseAsString,
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(5),
}

// ⭐ URL 키 매핑 옵션 (Client/Server 공통)
export const allTabOptions = {
  history: 'push' as const,
  shallow: false,
  urlKeys: {
    startDate: 'all_start',
    endDate: 'all_end',
    purchaseType: 'all_type',
    search: 'all_q',
    phone: 'all_ph',
    page: 'all_p',
    limit: 'all_l',
  },
}

// ⭐ Server Component용 로더 생성
export const loadAllTabParams = createLoader(allTabSearchParams, allTabOptions)

// ⭐ 변환 함수 (nuqs 필터 → Server Action 형태)
// Server/Client 공통 사용 가능
export function convertAllTabFilters(filters: {
  startDate: Date | null
  endDate: Date | null
  purchaseType: string | null
  search: string | null
  phone: string | null
  page: number
  limit: number
}) {
  return {
    page: filters.page,
    limit: filters.limit,
    dateRange: (filters.startDate || filters.endDate) ? {
      start: filters.startDate ?? undefined,
      end: filters.endDate ?? undefined,
    } : undefined,
    purchaseType: filters.purchaseType ?? undefined,
    searchKeyword: filters.search ?? undefined,
    phoneKeyword: filters.phone ?? undefined,
  }
}
```

##### Step 2: Client Hook에서 재사용

```tsx
// ✅ useAllTabFilters.ts
'use client'

import { useQueryStates } from 'nuqs'
import { allTabSearchParams, allTabOptions } from '../_lib/searchParams'

export function useAllTabFilters() {
  // ⭐ 동일한 파서/옵션 사용
  const [filters, setFilters] = useQueryStates(allTabSearchParams, allTabOptions)

  return { filters, setFilters, /* ... */ }
}
```

##### Step 3: Server Component에서 URL 파싱 및 변환

```tsx
// ✅ page.tsx
import { loadAllTabParams, convertAllTabFilters } from './_lib/searchParams'
import type { SearchParams } from '@/types/route'

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams

  // ⭐ nuqs의 createLoader로 타입-안전하게 파싱
  const parsed = loadAllTabParams(sp)

  // ⭐ 변환 함수로 Server Action 형태로 변환
  const allFilters = convertAllTabFilters(parsed)

  // ⭐ 서버에서 URL 파라미터에 맞는 초기 데이터 로드
  const [allUsersResult, countsResult] = await Promise.all([
    getUsers(allFilters), // URL 파라미터 반영! 🎯
    getUserCounts(),
  ])

  const allInitialData = (allUsersResult.success && allUsersResult.data?.users) || []
  const counts = (countsResult.success && countsResult.data) || { total: 0, blocked: 0 }

  const tabs = [
    { id: 'all', label: 'All', count: counts.total },
    { id: 'blocked', label: '차단회원', count: counts.blocked, badgeVariant: 'error' },
  ]

  return (
    <UsersPageClient
      tabs={tabs}
      allInitialData={allInitialData}
      blockedInitialData={[]}
    />
  )
}
```

##### Step 4: Client Component에서 변환 함수 사용

```tsx
// ✅ UsersTable.tsx
import { convertAllTabFilters } from '../../../_lib/searchParams'
import { useAllTabFilters } from '../../../_hooks/useAllTabFilters'

export function UsersTable({ initialData }) {
  const { filters } = useAllTabFilters()
  const [data, setData] = useState(initialData)

  useEffect(() => {
    const fetchData = async () => {
      // ⭐ 변환 함수 사용 - Server와 동일한 로직
      const result = await getUsers(convertAllTabFilters(filters))

      if (result.success && result.data) {
        setData(result.data.users)
        setTotal(result.data.pagination.total)
      }
    }
    fetchData()
  }, [filters])

  // ⭐ updateUser에서도 동일한 변환 함수 사용
  const handleModalSubmit = () => {
    updateUser(
      { id, name, email, phoneNumber: phone },
      convertAllTabFilters(filters) // ✅ 중복 로직 제거
    )
  }

  return <AdminTable data={data} />
}
```

#### 🎯 동작 흐름

```
사용자가 ?all_p=3&all_q=keyword 접속
    ↓
Server Component
  - loadAllTabParams로 URL 파싱
  - page=3, search=keyword 파라미터로 데이터 fetch
  - Client로 초기 데이터 전달
    ↓
Client Component 마운트
  - useAllTabFilters가 동일한 URL 읽음
  - 서버와 동일한 필터 상태
  - ✅ 깜빡임 없이 일관된 데이터 표시!
```

#### 📁 파일 구조

```
users/list/
├── _lib/
│   └── searchParams.ts          # ⭐ 공통 파서/옵션/로더 정의
├── _hooks/
│   ├── useAllTabFilters.ts      # Client Hook (공통 파서 재사용)
│   └── useBlockedTabFilters.ts
├── page.tsx                     # Server Component (loadXxxParams 사용)
└── _components/
    └── UsersPageClient.tsx
```

---

## 🎯 URL 구조 예시

### All 탭 (3페이지, 검색어 "test", 구매자)
```
?tab=all&all_p=3&all_q=test&all_type=buyer
```

### Blocked 탭 (1페이지, 스팸 사유)
```
?tab=blocked&blocked_p=1&blocked_reason=spam
```

### 탭 전환 시
```
All → Blocked: 각 탭의 파라미터가 독립적으로 유지됨
?tab=blocked&all_p=3&all_q=test&blocked_p=1
```

---

## 🔥 Built-in Parsers

nuqs는 다양한 타입의 파서를 제공합니다:

```tsx
import {
  parseAsString,
  parseAsInteger,
  parseAsFloat,
  parseAsBoolean,
  parseAsIsoDateTime,
  parseAsStringLiteral,
  parseAsArrayOf,
} from 'nuqs'

// 예제
parseAsString.withDefault('') // 문자열
parseAsInteger.withDefault(1) // 정수
parseAsIsoDateTime            // ISO 8601 날짜
parseAsStringLiteral(['all', 'blocked']) // 특정 값만 허용
parseAsArrayOf(parseAsInteger) // 정수 배열
```

---

## ✅ Validator 업데이트

Server Action에서 받는 필터에 새로운 필드가 추가되면 validator도 업데이트해야 합니다.

#### ✅ `src/validators/user.ts`

```tsx
export const getUsersFiltersSchema = z.object({
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).optional(),
  purchaseType: z.string().optional(),
  blockReason: z.string().optional(), // ⭐ 추가
  searchKeyword: z.string().optional(),
  phoneKeyword: z.string().optional(),
  isBlocked: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
}).optional()
```

---

## 📌 체크리스트

구현 완료 후 확인사항:

- [ ] `NuqsAdapter`를 최상위 layout에 추가했는가?
- [ ] 탭별로 URL prefix를 다르게 설정했는가? (`all_`, `blocked_`)
- [ ] Context는 UI 상태(selectedRows)만 관리하는가?
- [ ] 필터/페이지네이션은 모두 nuqs로 관리하는가?
- [ ] `useEffect`의 dependency에 `filters`를 포함했는가?
- [ ] **`_lib/searchParams.ts`에 공통 파서/옵션/로더 정의했는가?** ⭐
- [ ] **`_lib/searchParams.ts`에 변환 함수(convertXxxFilters) 정의했는가?** ⭐
- [ ] **변환 함수가 Server/Client 공통으로 사용 가능한가?** ⭐
- [ ] **Server Component에서 `loadXxxParams`로 URL 파싱하는가?** ⭐
- [ ] **Server Component에서 `convertXxxFilters(parsed)`로 변환하는가?** ⭐
- [ ] **Client Component에서 `convertXxxFilters(filters)`로 변환하는가?** ⭐
- [ ] **Client Hook이 동일한 파서/옵션을 재사용하는가?** ⭐
- [ ] **Server/Client의 urlKeys 매핑이 동일한가?** ⭐
- [ ] **새로고침 시 깜빡임 없이 필터링된 데이터가 표시되는가?** ⭐
- [ ] **중복된 필터 변환 로직이 제거되었는가?** ⭐
- [ ] Validator에 새 필터 필드를 추가했는가?
- [ ] `npm run type-check` 통과했는가?

---

## 🎁 장점

1. ✅ **북마크/공유 가능** - URL만 복사하면 동일한 필터 상태 공유
2. ✅ **브라우저 히스토리 지원** - 뒤로가기/앞으로가기 작동
3. ✅ **새로고침 시 상태 유지** - F5 눌러도 필터 유지
4. ✅ **타입 안전** - TypeScript로 완벽한 타입 지원
5. ✅ **성능 최적화** - Batching으로 여러 파라미터 한번에 업데이트
6. ✅ **책임 분리** - Context는 UI 상태, URL은 데이터 상태

---

## ⚠️ 주의사항

### 1. activeTab vs filters 분리 이유

```tsx
// ❓ 왜 activeTab은 따로 관리하나요?
const [activeTab, setActiveTab] = useQueryState('tab', ...)  // 전역 상태
const { filters } = useAllTabFilters()                        // 탭별 상태

// ✅ 이유:
// - tab: UI 레벨 (어느 탭을 표시할지)
// - filters: 데이터 레벨 (각 탭의 필터/페이지네이션)
// - 역할이 다르므로 분리하는 것이 맞음
```

---

## 🔗 참고 자료

- [nuqs 공식 문서](https://nuqs.dev)
- [nuqs GitHub](https://github.com/47ng/nuqs)
- [Built-in Parsers](https://nuqs.dev/docs/parsers/built-in)
- [Batching](https://nuqs.dev/docs/batching)
- [Server-Side](https://nuqs.dev/docs/server-side)