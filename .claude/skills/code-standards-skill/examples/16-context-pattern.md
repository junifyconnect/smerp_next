---
alwaysApply: true
---

# Context 패턴 (상태 공유)

React Context를 사용한 **상태 공유 패턴**입니다.

---

## 📌 핵심 원칙

### URL 상태 vs Context 상태 구분

| 상태 타입 | 관리 방법 | 이유 |
|----------|----------|------|
| 필터 (filters) | ✅ **nuqs (URL)** | 북마크/공유 가능, 새로고침 시 유지 |
| 페이지네이션 (page, limit) | ✅ **nuqs (URL)** | 현재 위치 공유 가능 |
| 탭 (activeTab) | ✅ **nuqs (URL)** | 어느 탭인지 명확히 표시 |
| 선택된 행 (selectedRows) | ✅ **Context** | UI 전용 상태, 공유 불필요 |
| 새로고침 트리거 (refreshTrigger) | ✅ **Context** | UI 전용 상태 |
| 탭별 카운트 (tabCounts) | ✅ **Context** | UI 전용 상태 |
| 서버 데이터 (data) | ❌ **컴포넌트 로컬** | useState로 관리 |

> **필터 관리는 [19-nuqs-url-state-management.md](./19-nuqs-url-state-management.md) 참고**

---

### Context는 언제 사용하나?

✅ **사용해야 할 때:**
- 여러 컴포넌트가 같은 **UI 상태**를 공유할 때
- Props drilling이 3단계 이상일 때
- 선택 상태, 새로고침 트리거 등

❌ **사용하지 말아야 할 때:**
- 필터 상태 → nuqs 사용
- 서버 데이터 (data fetching 결과)
- 단순히 props 전달만 필요할 때

---

## ✅ 올바른 패턴

### 실제 구현 예제: Campaign 리스트 페이지

#### 1. Context 타입 정의

```typescript
// _context/types.ts
export type TabType = 'active' | 'hidden'

// ⭐ filters는 없음! nuqs로 URL에서 관리
export interface CampaignListState {
  active: {
    selectedRows: string[]
  }
  hidden: {
    selectedRows: string[]
  }
  tabCounts: {
    active: number
    hidden: number
  }
}

export interface CampaignListContextValue {
  state: CampaignListState
  setSelectedRows: (tab: TabType, rows: string[]) => void
  getSelectedRows: (tab: TabType) => string[]
  updateTabCounts: (counts: { active: number; hidden: number }) => void
  refreshTrigger: number
  triggerRefresh: () => void
}
```

#### 2. Context Provider 구현

```typescript
// _context/CampaignListContext.tsx
'use client'

import { createContext, ReactNode, useState, useContext } from 'react'
import type { CampaignListContextValue, CampaignListState, TabType } from './types'

const initialState: CampaignListState = {
  active: {
    selectedRows: [],
  },
  hidden: {
    selectedRows: [],
  },
  tabCounts: {
    active: 0,
    hidden: 0,
  },
}

const CampaignListContext = createContext<CampaignListContextValue | null>(null)

export function CampaignListProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CampaignListState>(initialState)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const setSelectedRows = (tab: TabType, rows: string[]) => {
    setState((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        selectedRows: rows,
      },
    }))
  }

  const getSelectedRows = (tab: TabType) => state[tab].selectedRows

  const updateTabCounts = (counts: { active: number; hidden: number }) => {
    setState((prev) => ({
      ...prev,
      tabCounts: counts,
    }))
  }

  // ⭐ 데이터 새로고침 트리거 (CRUD 후 테이블 갱신용)
  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <CampaignListContext.Provider
      value={{
        state,
        setSelectedRows,
        getSelectedRows,
        updateTabCounts,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </CampaignListContext.Provider>
  )
}

export function useCampaignList() {
  const context = useContext(CampaignListContext)

  if (!context) {
    throw new Error('useCampaignList must be used within CampaignListProvider')
  }

  return context
}
```

#### 3. 필터 Hook (nuqs 사용)

```typescript
// _hooks/useActiveTabFilters.ts
'use client'

import { useQueryStates } from 'nuqs'
import { activeTabSearchParams, activeTabOptions } from '../_lib/searchParams'

// ⭐ 필터는 nuqs로 URL에서 관리!
export function useActiveTabFilters() {
  const [filters, setFilters] = useQueryStates(activeTabSearchParams, activeTabOptions)

  return {
    filters,
    setFilters,
    setPage: (page: number) => setFilters({ page }),
    setLimit: (limit: number) => setFilters({ limit, page: 1 }),
    setSearch: (search: string) => setFilters({ search }),
    resetFilters: () => setFilters({
      page: 1,
      limit: 10,
      search: null,
      // ... 기타 필터 초기화
    }),
  }
}
```

#### 4. Layout에서 Provider 적용

```typescript
// layout.tsx
import { ReactNode } from 'react'
import { CampaignListProvider } from './_context/CampaignListContext'

export default function CampaignListLayout({ children }: { children: ReactNode }) {
  return (
    <CampaignListProvider>
      {children}
    </CampaignListProvider>
  )
}
```

#### 5. 테이블 컴포넌트에서 사용

```typescript
// _components/CampaignTable.tsx
'use client'

import { useState } from 'react'
import { DataTable } from '@/components/common/table'
import { useCampaignList } from '../_context/CampaignListContext'
import { useActiveTabFilters } from '../_hooks/useActiveTabFilters'
import { useUpdateEffect } from '@/hooks/useUpdateEffect'
import { useExecuteAction } from '@/hooks/useExecuteAction'
import { getCampaigns } from '../_actions/getCampaigns'

interface CampaignTableProps {
  initialData: SuccessResponse<CampaignListItem[]>
}

export function CampaignTable({ initialData }: CampaignTableProps) {
  const executeAction = useExecuteAction()

  // ⭐ Context: 선택 상태, 새로고침 트리거
  const { setSelectedRows, getSelectedRows, refreshTrigger } = useCampaignList()

  // ⭐ nuqs: 필터 상태 (URL)
  const { filters } = useActiveTabFilters()

  const [data, setData] = useState<CampaignListItem[]>(initialData.data)
  const [loading, setLoading] = useState(false)

  const selectedRows = getSelectedRows('active')

  const fetchData = async () => {
    setLoading(true)
    const result = await executeAction(() => getCampaigns(filters))
    if (result?.success && result.data) {
      setData(result.data)
    }
    setLoading(false)
  }

  // ⭐ 필터(nuqs) 변경 시 재로딩
  useUpdateEffect(() => {
    void fetchData()
  }, [filters])

  // ⭐ refreshTrigger(Context) 변경 시 재로딩 (CRUD 후)
  useUpdateEffect(() => {
    void fetchData()
  }, [refreshTrigger])

  const handleRowSelect = (selection: Record<string, boolean>) => {
    const ids = Object.keys(selection).filter((id) => selection[id])
    setSelectedRows('active', ids)
  }

  return (
    <DataTable
      data={data}
      onRowSelectionChange={handleRowSelect}
      isLoading={loading}
    />
  )
}
```

#### 6. CRUD 후 새로고침 (Dialog에서)

```typescript
// _dialogs/CampaignDeleteDialog.tsx
'use client'

import { useCampaignList } from '../_context/CampaignListContext'

export function CampaignDeleteDialog({ onSuccess }: Props) {
  const { triggerRefresh, setSelectedRows } = useCampaignList()

  const handleDelete = async () => {
    const result = await executeAction(() => deleteCampaigns({ ids }))

    if (result) {
      toast.success('삭제되었습니다')
      setSelectedRows('active', [])  // 선택 해제
      triggerRefresh()  // ⭐ 테이블 새로고침 트리거
      onClose()
    }
  }
}
```

---

## 📁 폴더 구조

```
feature/
├── page.tsx                    (Server Component - 초기 데이터)
├── layout.tsx                  (Provider 적용)
├── _client/
│   └── FeaturePageClient.tsx   (탭 전환 등)
├── _context/
│   ├── types.ts                (Context 타입 - selectedRows, refreshTrigger)
│   └── FeatureContext.tsx      (Provider + Hook)
├── _hooks/
│   └── useActiveTabFilters.ts  (nuqs 필터 Hook)
├── _lib/
│   └── searchParams.ts         (nuqs 파라미터 정의)
├── _components/
│   └── FeatureTable.tsx
├── _dialogs/
│   └── FeatureDeleteDialog.tsx
└── _actions/
    └── getFeatures.ts
```

---

## ❌ 잘못된 패턴

### Anti-pattern 1: Context에 filters 저장

```typescript
// ❌ BAD - filters를 Context에 저장
export interface UsersState {
  all: {
    filters: FilterState  // ❌ URL로 관리해야 함
    selectedRows: string[]
  }
}

// ✅ GOOD - filters는 nuqs로
export interface UsersState {
  all: {
    selectedRows: string[]  // ✅ Context는 UI 상태만
  }
}

// filters는 별도 Hook으로
const { filters } = useActiveTabFilters()  // nuqs
```

**문제점:**
- 새로고침하면 필터 초기화됨
- URL 공유 불가
- 뒤로가기 동작 안함

### Anti-pattern 2: Context에 data 저장

```typescript
// ❌ BAD - 서버 데이터를 Context에
interface UsersState {
  data: User[]  // ❌
  loading: boolean  // ❌
}

// ✅ GOOD - 컴포넌트 로컬 상태로
function UsersTable({ initialData }) {
  const [data, setData] = useState(initialData)  // ✅
  const [loading, setLoading] = useState(false)  // ✅
}
```

### Anti-pattern 3: Props drilling 피하려고 불필요한 Context

```typescript
// ❌ BAD - 2단계만 전달하는데 Context 사용
<ThemeContext.Provider value={theme}>
  <Header />  {/* theme 사용 */}
</ThemeContext.Provider>

// ✅ GOOD - 그냥 props
<Header theme={theme} />
```

---

## 💡 Best Practices

### 1. Context는 UI 상태만 저장

```typescript
✅ Context에 저장:
- selectedRows (선택된 행)
- refreshTrigger (새로고침 트리거)
- tabCounts (탭별 카운트)
- 사이드바 열림/닫힘

❌ Context에 저장하지 말 것:
- filters → nuqs 사용
- 서버 데이터 → 컴포넌트 로컬 상태
- 로딩/에러 상태 → 컴포넌트 로컬 상태
```

### 2. Provider는 Layout에 배치

```typescript
// ✅ layout.tsx에 Provider
export default function FeatureLayout({ children }) {
  return (
    <FeatureProvider>
      {children}
    </FeatureProvider>
  )
}
```

### 3. Context + nuqs 조합

```typescript
// Context: UI 상태
const { selectedRows, triggerRefresh } = useFeatureContext()

// nuqs: URL 상태 (필터, 페이지네이션)
const { filters, setPage } = useFeatureFilters()
```

### 4. refreshTrigger 패턴

```typescript
// Context에 refreshTrigger 정의
const [refreshTrigger, setRefreshTrigger] = useState(0)
const triggerRefresh = () => setRefreshTrigger(prev => prev + 1)

// 테이블에서 감지
useUpdateEffect(() => {
  void fetchData()
}, [refreshTrigger])

// CRUD 후 트리거
const handleDelete = async () => {
  await deleteItem()
  triggerRefresh()  // 테이블 새로고침
}
```

---

## 📝 체크리스트

Context 구현 완료 후 확인:

- [ ] filters는 nuqs로 URL 관리 (Context 아님!)
- [ ] Context는 selectedRows, refreshTrigger 등 UI 상태만
- [ ] 서버 데이터는 컴포넌트 로컬 상태로 관리
- [ ] Provider는 layout.tsx에 배치
- [ ] Hook에 에러 처리 (`useContext` null 체크)
- [ ] Context와 Hook을 한 파일에 통합

---

## 🔗 관련 문서

- [nuqs URL 상태 관리](./19-nuqs-url-state-management.md) - 필터/페이지네이션 관리
- [초기 데이터 패턴](./15-initial-data-pattern.md) - initialData + useUpdateEffect
