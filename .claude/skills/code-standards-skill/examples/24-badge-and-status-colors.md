# Badge 컴포넌트 및 상태 색상 컨벤션

## 공통 Badge 컴포넌트

테이블, 카드, 리스트 등에서 상태나 분류를 표시할 때는 공통 Badge 컴포넌트를 사용한다.

### 기본 사용법

```tsx
import { Badge } from '@/components/common/Badge'

// 상태 배지 (pill 형태 - 기본값)
<Badge variant="success">승인완료</Badge>
<Badge variant="warning">승인대기</Badge>
<Badge variant="error">반려</Badge>
<Badge variant="info">발송중</Badge>
<Badge variant="neutral">미발행</Badge>

// 트리거/태그 배지 (rounded 형태)
<Badge variant="info" shape="rounded">WEB</Badge>
<Badge variant="error" shape="rounded">API</Badge>
```

### Variant 의미

| variant | 의미 | 사용 예시 |
|---------|------|-----------|
| `success` | 완료/성공/승인 | 승인완료, 발행완료, 성공, 처리완료 |
| `warning` | 대기/진행중 | 승인대기, 발행대기, 진행중 |
| `error` | 실패/반려/거절 | 반려, 실패, 오류 |
| `info` | 정보/요청/활성 | 발송중, 요청, 작동중 |
| `neutral` | 비활성/미처리/기타 | 미발행, 임시저장, - |

### Shape 의미

| shape | 용도 | border-radius |
|-------|------|---------------|
| `pill` (기본) | 상태 표시 | `rounded-full` |
| `rounded` | 트리거/태그 | `rounded-[6px]` |

---

## 상태 색상 정의 컨벤션

### 색상은 도메인별 `_types/*.ts`에서 정의

각 도메인의 상태 라벨과 variant 매핑은 해당 도메인의 타입 파일에서 정의한다.

```ts
// ✅ 좋은 예: _types/sender.ts
import type { BadgeVariant } from '@/components/common/Badge'

export type SenderStatus = 'approved' | 'pending' | 'rejected'

export const SENDER_STATUS_LABEL: Record<SenderStatus, string> = {
  approved: '승인완료',
  pending: '승인대기',
  rejected: '반려',
}

export const SENDER_STATUS_VARIANT: Record<SenderStatus, BadgeVariant> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'error',
}
```

### 도메인별 배지 컴포넌트

복잡한 로직이 필요한 경우 도메인별 배지 컴포넌트를 만들되, 내부에서 공통 Badge를 사용한다.

```tsx
// ✅ 좋은 예: _components/SenderStatusBadge.tsx
import { Badge } from '@/components/common/Badge'
import { SENDER_STATUS_LABEL, SENDER_STATUS_VARIANT } from '../_types/sender'
import type { SenderStatus } from '../_types/sender'

interface SenderStatusBadgeProps {
  status: SenderStatus
}

export function SenderStatusBadge({ status }: SenderStatusBadgeProps) {
  return (
    <Badge variant={SENDER_STATUS_VARIANT[status]}>
      {SENDER_STATUS_LABEL[status]}
    </Badge>
  )
}
```

---

## 금지: 하드코딩된 색상 사용

```ts
// ❌ 나쁜 예: 하드코딩된 rgba, hex
export const STATUS_STYLE = {
  success: 'bg-[rgba(6,204,122,0.1)] text-[#06cc7a]',
  pending: 'bg-[rgba(45,133,255,0.1)] text-[#388cff]',
}

// ✅ 좋은 예: Tailwind 시맨틱 클래스 (또는 Badge variant 사용)
export const STATUS_STYLE = {
  success: 'bg-success-bg text-success',
  pending: 'bg-info-bg text-info',
}
```

---

## 사용 가능한 시맨틱 색상 (globals.css)

| 색상 | 변수 | 배경 변수 | 용도 |
|------|------|-----------|------|
| 녹색 | `text-success` | `bg-success-bg` | 성공/완료/승인 |
| 주황 | `text-warning` | `bg-warning-bg` | 경고/대기 |
| 빨강 | `text-red` | `bg-red-bg` | 에러/실패/반려 |
| 파랑 | `text-info` | `bg-info-bg` | 정보/진행중 |
| 회색 | `text-gray-500` | `bg-gray-100` | 비활성/미처리 |

---

## 테이블 컬럼에서 배지 사용

```tsx
// columns.tsx
import { Badge } from '@/components/common/Badge'
import { defineColumns } from '@/components/common/table'
import { STATUS_LABEL, STATUS_VARIANT } from '../_types/myDomain'

export const columns = defineColumns<MyItem>([
  {
    key: 'status',
    header: '상태',
    width: 100,
    align: 'center',
    render: (row) => (
      <Badge variant={STATUS_VARIANT[row.status]}>
        {STATUS_LABEL[row.status]}
      </Badge>
    ),
  },
])
```

---

## 커스텀 색상이 필요한 경우

동적 색상(예: 채널별 고유 색상)이 필요한 경우에만 className prop을 사용한다.

```tsx
// 채널 색상은 서버에서 받아오므로 동적 스타일 필요
<Badge
  variant="neutral"
  className="!bg-transparent"
  style={{
    backgroundColor: `${channel.color}1A`, // 10% opacity
    color: channel.color,
  }}
>
  {channel.name}
</Badge>
```
