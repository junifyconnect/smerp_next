---
alwaysApply: true
---

# 17. 서버 사이드 페이지네이션 패턴

관리자 페이지에서 대량의 데이터를 효율적으로 처리하기 위한 서버 사이드 페이지네이션 표준 패턴입니다.

---

## ✅ 올바른 패턴

### 1. Zod Validator에 페이지네이션 파라미터 추가

```typescript
// src/validators/user.ts
export const getUsersFiltersSchema = z.object({
  // ... 기존 필터들
  searchKeyword: z.string().optional(),
  phoneKeyword: z.string().optional(),

  // 페이지네이션 파라미터 (optional)
  page: z.number().int().positive().optional(), // 1부터 시작
  limit: z.number().int().positive().max(100).optional(), // 최대 100개
}).optional()

export type GetUsersFilters = z.infer<typeof getUsersFiltersSchema>
```

**핵심:**
- `page`, `limit` 모두 optional
- 기본값은 액션에서 처리
- `limit`에 max 제한 (100)

---

### 2. Server Action에서 페이지네이션 구현

```typescript
// src/app/(admin)/admin/(protected)/users/_actions/getUsers.ts
'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { api, ApiError } from '@/lib/api/client'
import { getUsersFiltersSchema, type GetUsersFilters } from '@/validators/user'

interface ApiUser {
  id: string
  name: string | null
}

interface UsersApiResponse {
  users: ApiUser[]
  total: number
}

export const getUsers = actionAuth
  .inputSchema(getUsersFiltersSchema)
  .action(async ({ parsedInput }) => {
    try {
      const validatedFilters = parsedInput

      // 페이지네이션 파라미터 (기본값 설정)
      const page = validatedFilters?.page ?? 1
      const limit = validatedFilters?.limit ?? 10

      // 쿼리 파라미터 구성
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })

      // 외부 API 호출 (total은 API 응답에 포함)
      const result = await api.get<UsersApiResponse>(`/users?${params.toString()}`)

      const userList: UserListItem[] = result.users.map((user) => ({
        id: user.id,
        name: user.name || '-',
        // ... mapping
      }))

      // ✅ SuccessResponse 구조로 반환
      // { success: true, code: ResponseCode, data: T[], pagination: PaginationMeta }
      return actionSuccess(userList, 'OK', {
        page,
        pageSize: limit,
        total: result.total,
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

**핵심:**
- `skip = (page - 1) * limit` 계산
- `count()` 쿼리로 total 조회
- ✅ **`actionSuccess`의 3번째 인자로 `pagination` 전달**
- ✅ **반환 타입: `SuccessResponse<T[]>` (data + pagination)**

---

### 3. Context에 페이지네이션 상태 추가

```typescript
// src/app/(admin)/admin/(protected)/users/_context/types.ts
export interface PaginationState {
  currentPage: number
  rowsPerPage: number
  total: number
}

export interface UsersState {
  all: {
    filters: AllTabFilterState
    selectedRows: (string | number)[]
    pagination: PaginationState  // 추가!
  }
  blocked: {
    filters: BlockedTabFilterState
    selectedRows: (string | number)[]
    pagination: PaginationState  // 추가!
  }
  activeTab: TabType
}

export interface UsersContextValue {
  state: UsersState
  // ... 기존 함수들
  setPagination: (tab: TabType, pagination: Partial<PaginationState>) => void
  getCurrentPagination: () => PaginationState
}
```

```typescript
// src/app/(admin)/admin/(protected)/users/_context/UsersContext.tsx
const initialState: UsersState = {
  all: {
    filters: {},
    selectedRows: [],
    pagination: {
      currentPage: 1,
      rowsPerPage: 5,  // 기본값
      total: 0,
    },
  },
  blocked: {
    filters: {},
    selectedRows: [],
    pagination: {
      currentPage: 1,
      rowsPerPage: 5,  // 기본값
      total: 0,
    },
  },
  activeTab: 'all',
}

// useCallback으로 메모이제이션 (중요!)
const setPagination = useCallback((tab: TabType, pagination: Partial<PaginationState>) => {
  setState((prev) => {
    const tabState = prev[tab]
    return {
      ...prev,
      [tab]: {
        ...tabState,
        pagination: {
          ...tabState.pagination,
          ...pagination,
        },
      },
    }
  })
}, [])
```

**핵심:**
- 각 탭마다 독립적인 `pagination` 상태
- `setPagination`은 **반드시 `useCallback`으로 메모이제이션**
- 탭 전환해도 페이지 상태 유지

---

### 4. 테이블 컴포넌트에서 Context 사용

```typescript
// src/app/(admin)/admin/(protected)/users/_tabs/all_tab/table/UsersTable.tsx
"use client"

import { useState, useEffect } from "react"
import { AdminTable } from "@/components/admin/table"
import { useUsers } from "../../../_context/UsersContext"
import { useExecuteAction } from "@/hooks/useExecuteAction"
import { getUsers } from "../../../_actions/getUsers"
import { SuccessResponse } from "@/types/responseType"
import { UserListItem } from "../../../_types/user.types"

interface UsersTableProps {
  initialData: SuccessResponse<UserListItem[]>
}

export function UsersTable({ initialData }: UsersTableProps) {
  const { state, setSelectedRows } = useUsers()
  const executeAction = useExecuteAction()

  // ✅ SuccessResponse에서 data와 pagination 추출
  const [data, setData] = useState<UserListItem[]>(initialData.data)
  const [total, setTotal] = useState(initialData.pagination?.total ?? 0)
  const [loading, setLoading] = useState(false)

  // Context에서 pagination 가져오기 (필요시)
  const { filters, setPage, setLimit } = useAllTabFilters()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // ✅ useExecuteAction으로 자동 에러 처리
      // executeAction은 SuccessResponse를 반환
      const result = await executeAction(() => getUsers({
        ...filters,
        page: filters.page,
        limit: filters.limit,
      }))

      // ✅ SuccessResponse 체크 및 데이터 추출
      if (result?.success && result.data && result.pagination) {
        setData(result.data)
        setTotal(result.pagination.total)
      }
      // 에러는 자동으로 toast 표시됨

      setLoading(false)
    }

    fetchData()
  }, [filters, executeAction])

  const handlePageChange = (page: number) => {
    setPage(page)
  }

  const handleRowsPerPageChange = (rows: number) => {
    setLimit(rows)
  }

  const handleRowSelect = (ids: (string | number)[]) => {
    setSelectedRows('all', ids)
  }

  return (
    <AdminTable
      data={data}
      currentPage={filters.page}
      totalItems={total}
      rowsPerPage={filters.limit}
      onPageChange={handlePageChange}
      onRowsPerPageChange={handleRowsPerPageChange}
      onRowSelect={handleRowSelect}
      loading={loading}
      // ... 기타 props
    />
  )
}
```

**핵심:**
- ✅ **`initialData`는 `SuccessResponse<T[]>` 타입**
- ✅ **`initialData.data`, `initialData.pagination.total`로 초기화**
- ✅ **`executeAction`으로 Server Action 호출 (자동 에러 처리)**
- ✅ **`result?.success` 체크 후 `result.data`, `result.pagination` 사용**
- URL 기반 페이지네이션 (nuqs) 사용 권장

---

### 5. 서버 컴포넌트 초기 로딩

```typescript
// src/app/(admin)/admin/(protected)/users/page.tsx
export default async function UsersPage() {
  const [allUsersResult, blockedUsersResult, countsResult] = await Promise.all([
    getUsers({ page: 1, limit: 5 }), // Context 기본값과 일치
    getUsers({ isBlocked: true, page: 1, limit: 5 }),
    getUserCounts(),
  ])

  // ...
}
```

**핵심:**
- 서버 초기 로딩의 `limit`과 Context의 `rowsPerPage` **반드시 일치**
- 불일치 시 사용자가 다른 개수를 보게 됨

---

### 6. AdminTable 컴포넌트 (서버 사이드 전용)

```typescript
// src/components/admin/table/AdminTable.tsx
interface AdminTableProps {
  columns: AdminTableColumn[]
  data: AdminTableRowData[]
  // 서버 사이드 페이지네이션 (필수)
  currentPage: number
  totalItems: number
  rowsPerPage: number
  rowsPerPageOptions?: number[]
  onPageChange: (page: number) => void
  onRowsPerPageChange?: (rows: number) => void
  // ...
}

export function AdminTable({
  columns,
  data,
  currentPage,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  // ...
}: AdminTableProps) {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([])

  // 페이지네이션 계산
  const totalPages = Math.ceil(totalItems / rowsPerPage)

  // 서버에서 이미 잘려온 데이터를 그대로 사용
  const paginatedData = data

  const handlePageChange = (page: number) => {
    onPageChange(page)
    setSelectedIds([])
  }

  const handleRowsPerPageChange = (rows: number) => {
    onRowsPerPageChange?.(rows)
    setSelectedIds([])
  }

  // ...
}
```

**핵심:**
- `currentPage`, `totalItems`, `rowsPerPage` 모두 **필수 props**
- 서버에서 이미 잘려온 데이터를 그대로 표시 (슬라이싱 안함)
- 페이지 변경 시 `onPageChange` 호출 → 부모가 서버 재요청
- **클라이언트 사이드 페이지네이션은 사용하지 않음** (전체 데이터를 받아서 자르는 방식 금지)

---

---

## ❌ 잘못된 패턴

### 1. 클라이언트 사이드 페이지네이션 사용 (절대 금지!)

```typescript
// ❌ 절대 이렇게 하지 마세요!
// 1000개를 전부 받아서 클라이언트에서 자르기
const allUsers = await getUsers() // 1000개 전부 가져옴
const page1 = allUsers.slice(0, 10)  // 클라이언트에서 슬라이싱
const page2 = allUsers.slice(10, 20)

// ✅ 올바른 방법: 서버에서 필요한 만큼만
const page1 = await getUsers({ page: 1, limit: 10 }) // 10개만
const page2 = await getUsers({ page: 2, limit: 10 }) // 11-20번만
```

**왜 안되나요?**
- 초기 로딩이 너무 느림 (1000개 다운로드)
- 메모리 낭비
- 사용자가 2페이지만 봐도 1000개를 모두 로딩
- 데이터 많으면 브라우저 죽음

**우리는 항상 서버 사이드 페이지네이션만 사용합니다!**

---

### 2. useEffect 무한 루프

```typescript
// ❌ 잘못된 예
const setPagination = (tab, pagination) => {
  setState(...)
}

useEffect(() => {
  fetchData()
}, [setPagination])  // setPagination이 매번 새로 생성됨 → 무한 루프
```

```typescript
// ✅ 올바른 예
const setPagination = useCallback((tab, pagination) => {
  setState(...)
}, [])  // 의존성 없음 → 참조 안정화
```

---

### 2. 서버-클라이언트 불일치

```typescript
// ❌ 잘못된 예
// Server: getUsers() → 기본 10개
// Client: rowsPerPage: 5
// 결과: 처음엔 10개 보이고, 페이지 변경하면 5개 보임

// ✅ 올바른 예
// Server: getUsers({ page: 1, limit: 5 })
// Client: rowsPerPage: 5
```

---

### 3. total count 누락

```typescript
// ❌ 잘못된 예
const result = await api.get('/users')
return actionSuccess(result.users)  // total 없음

// ✅ 올바른 예
// API가 total을 응답에 포함해야 함
const result = await api.get<{ users: User[]; total: number }>('/users')
return actionSuccess(result.users, 'OK', {
  total: result.total,
  page,
  pageSize: limit,
  totalPages: Math.ceil(result.total / limit),
})
```

---

## 📋 체크리스트

페이지네이션 구현 시 확인사항:

- [ ] Validator에 `page`, `limit` optional 파라미터 추가
- [ ] Server Action에서 `skip`, `take` 계산
- [ ] `count()` 쿼리로 total 조회
- [ ] 응답에 `pagination` 객체 포함
- [ ] Context에 `PaginationState` 추가
- [ ] `setPagination` useCallback으로 메모이제이션
- [ ] 각 탭마다 독립적인 pagination 상태
- [ ] 서버 초기 로딩과 클라이언트 기본값 일치
- [ ] AdminTable에 서버 사이드 props 전달
- [ ] 무한 루프 발생하지 않는지 확인

---

## 🎯 성능 최적화

1. **인덱스 추가**: `createdAt` 등 정렬 컬럼에 인덱스
2. **Count 최적화**: 필터 조건과 동일한 where 사용
3. **캐싱**: React Query나 SWR로 데이터 캐싱 (선택사항)
4. **Debounce**: 검색 필터에 debounce 적용

---

## 📌 참고

- 실제 구현 예시: `/users` 페이지
- Context 패턴: `16-context-pattern.md`
- Server Actions: `01-server-actions.md`