---
alwaysApply: true
---

# Server Action Unwrap 패턴

Server Component (page.tsx)에서 Server Action을 호출할 때 사용하는 간편한 에러 처리 패턴입니다.

---

## 📌 핵심 원칙

Server Action의 result는 복잡한 구조를 가지고 있습니다:
```typescript
{
  data?: ActionResponse<T>,        // SuccessResponse<T> | ErrorResponse
  serverError?: string,            // 예상치 못한 에러
  validationErrors?: ValidationErrors  // 입력값 검증 실패
}
```

**`unwrapAll`은 이 복잡한 구조를 자동으로 처리하고 `SuccessResponse<T>`를 반환합니다.**

```typescript
// SuccessResponse 구조
interface SuccessResponse<T> {
  success: true
  code: ResponseCode
  data: T
  pagination?: PaginationMeta
}
```

---

## ✅ 올바른 패턴

### 기본 사용법

#### 단일 액션
```typescript
import { unwrapAll } from '@/lib/action/unwrapAll'
import { getUserById } from './actions'

export default async function UserDetailPage({ params }: RouteParams<{ userId: string }>) {
  const { userId } = await params;

  // ✅ unwrapAll 사용 - SuccessResponse<T>를 자동으로 반환
  const [userData] = await unwrapAll([getUserById({ userId })])

  // userData는 SuccessResponse<UserDetailData> 타입
  return <UserDetailPageClient initialData={userData} />
}
```

#### 여러 액션 병렬 실행
```typescript
import { unwrapAll } from '@/lib/action/unwrapAll'
import { getUsers } from './_actions/getUsers'
import { getUserCounts } from './_actions/getUserCounts'

export default async function UsersPage() {
  // ✅ 여러 액션 동시 실행 - 각각 SuccessResponse<T> 반환
  const [usersResponse, counts] = await unwrapAll([
    getUsers(allFilters),      // SuccessResponse<UserListItem[]>
    getUserCounts(),           // SuccessResponse<CountData>
  ])

  return (
    <UsersPageClient
      initialData={usersResponse}  // SuccessResponse 전달
      counts={counts}
    />
  )
}
```

---

## ❌ 잘못된 패턴 (수동 에러 처리)

### Anti-pattern 1: 복잡한 수동 에러 체크

```typescript
// ❌ 나쁜 예: 수동으로 에러 체크
export default async function UserDetailPage({ params }: RouteParams<{ userId: string }>) {
  const { userId } = await params;

  const result = await getUserById({ userId })

  // 복잡한 에러 처리
  if (result.validationErrors || result.serverError || !result.data) {
    throw new Error('사용자 정보를 불러올 수 없습니다')
  }

  if (!result.data.success) {
    throw new Error(getResponseInfo(result.data.code).message)
  }

  const userData = result.data.data

  return <UserDetailPageClient initialData={userData} />
}
```

**문제점:**
- 에러 처리 코드가 길고 복잡
- 반복적인 코드
- 실수하기 쉬움

### Anti-pattern 2: fallback으로 빈 데이터 반환

```typescript
// ❌ 나쁜 예: 에러를 숨기고 빈 데이터 반환
export default async function UsersPage() {
  const result = await getUsers()
  const initialData = result.data?.success && result.data.data
    ? result.data.data.users
    : []  // 에러를 숨김

  return <UsersPageClient initialData={initialData} />
}
```

**문제점:**
- 에러가 발생해도 사용자가 모름
- 빈 화면만 보임
- 디버깅 어려움

---

## 🎯 unwrapAll의 동작 방식

```typescript
const [usersResponse] = await unwrapAll([getUsers()])
```

**내부적으로 이런 처리를 자동으로 해줍니다:**

1. **validationErrors 체크** → 에러 throw
2. **serverError 체크** → 에러 throw
3. **data 존재 여부 체크** → 에러 throw
4. **data.success 체크** → 에러 throw (ResponseCode 메시지 사용)
5. **모두 통과** → `SuccessResponse<T>` 반환 (data.data가 아님!)

**✅ 중요: `unwrapAll`은 `SuccessResponse<T>` 전체를 반환합니다**

```typescript
// unwrapAll 반환값
const [usersResponse] = await unwrapAll([getUsers()])

// usersResponse는 SuccessResponse<UserListItem[]> 타입
// {
//   success: true,
//   code: 'OK',
//   data: UserListItem[],
//   pagination?: PaginationMeta
// }

// 따라서 컴포넌트에서 이렇게 사용
<UsersPageClient initialData={usersResponse} />

// Client Component에서
function UsersPageClient({ initialData }: { initialData: SuccessResponse<UserListItem[]> }) {
  const [data, setData] = useState(initialData.data)
  const [total, setTotal] = useState(initialData.pagination?.total ?? 0)
  // ...
}
```

**에러 발생 시:**
- 자동으로 `error.tsx`로 이동
- 사용자에게 에러 메시지 표시

---

## 💡 장점

### 1. 코드 간결화

**Before:**
```typescript
const result = await getUserById({ userId })

if (result.validationErrors || result.serverError || !result.data) {
  throw new Error('사용자 정보를 불러올 수 없습니다')
}

if (!result.data.success) {
  throw new Error(getResponseInfo(result.data.code).message)
}

const userData = result.data  // SuccessResponse<UserDetailData>
```

**After:**
```typescript
const [userData] = await unwrapAll([getUserById({ userId })])
// userData는 SuccessResponse<UserDetailData> 타입
```

### 2. 타입 안전

```typescript
const [usersResponse, counts] = await unwrapAll([
  getUsers(allFilters),    // usersResponse: SuccessResponse<UserListItem[]>
  getUserCounts(),         // counts: SuccessResponse<CountData>
])

// ✅ SuccessResponse 구조로 접근
// usersResponse.data ← UserListItem[]
// usersResponse.pagination?.total ← number
// counts.data.total ← 자동완성 완벽 작동
```

### 3. 일관된 에러 처리

- 모든 페이지에서 동일한 에러 처리 로직
- error.tsx로 자동 이동
- 에러 메시지 일관성

---

## 📝 사용 시나리오

### 시나리오 1: 초기 데이터 로딩

```typescript
// users/list/page.tsx
export default async function UsersPage() {
  const [usersResponse, counts] = await unwrapAll([
    getUsers(filters),      // SuccessResponse<UserListItem[]>
    getUserCounts(),        // SuccessResponse<CountData>
  ])

  // ✅ SuccessResponse 전달
  return <UsersPageClient initialData={usersResponse} counts={counts} />
}
```

### 시나리오 2: Dynamic Route

```typescript
// users/[id]/page.tsx
export default async function UserDetailPage({ params }: RouteParams<{ userId: string }>) {
  const { userId } = await params;

  const [userData] = await unwrapAll([getUserById({ userId })])
  // userData: SuccessResponse<UserDetailData>

  // ✅ SuccessResponse 전달
  return <UserDetailPageClient initialData={userData} />
}
```

### 시나리오 3: 여러 관련 데이터 로딩

```typescript
// dashboard/page.tsx
export default async function DashboardPage() {
  const [stats, recentOrders, topProducts] = await unwrapAll([
    getDashboardStats(),           // SuccessResponse<StatsData>
    getRecentOrders({ limit: 10 }),  // SuccessResponse<Order[]>
    getTopProducts({ limit: 5 }),    // SuccessResponse<Product[]>
  ])

  // ✅ SuccessResponse 전달
  return (
    <DashboardClient
      stats={stats}
      recentOrders={recentOrders}
      topProducts={topProducts}
    />
  )
}
```

---

## 🚨 주의사항

### 1. Server Component에서만 사용

```typescript
// ✅ page.tsx (Server Component)
export default async function Page() {
  const [data] = await unwrapAll([getUsers()])
  return <Client initialData={data} />
}

// ❌ Client Component에서 사용 불가
'use client'
export default function ClientPage() {
  const [data] = await unwrapAll([getUsers()])  // 에러!
  return <div>{data}</div>
}
```

**Client Component에서는:**
- `useExecuteAction()` 훅 사용
- 또는 `useExecuteAction()` 훅 사용

### 2. error.tsx 필수

`unwrapAll`은 에러 발생 시 throw하므로, 상위 폴더에 `error.tsx`가 있어야 합니다.

```typescript
// app/(admin)/admin/(protected)/error.tsx
'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>오류가 발생했습니다</h2>
      <p>{error.message}</p>
      <button onClick={reset}>다시 시도</button>
    </div>
  )
}
```

---

## 📋 체크리스트

- [ ] Server Component (page.tsx)에서 사용
- [ ] `import { unwrapAll } from '@/lib/action/unwrapAll'` 추가
- [ ] 배열로 액션 전달: `await unwrapAll([action()])`
- [ ] destructuring으로 결과 받기: `const [data] = await ...`
- [ ] error.tsx 존재 확인
- [ ] 타입 자동 추론 확인 (IDE에서 확인)

---

## 🔗 관련 문서

- [Server Actions](./01-server-actions.md) - Server Action 기본
- [초기 데이터 패턴](./15-initial-data-pattern.md) - Server Component 데이터 로딩
- [에러 처리](./05-error-handling.md) - 에러 처리 전략
