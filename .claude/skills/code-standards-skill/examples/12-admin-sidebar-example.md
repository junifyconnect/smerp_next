---
alwaysApply: true
---

# AdminSidebar 컴포넌트 가이드

Figma 디자인을 바탕으로 구현된 관리자 사이드바 컴포넌트입니다.

---

## 📋 컴포넌트 개요

**파일**: `AdminSidebar.tsx`  
**타입**: Client Component (`'use client'`)  
**주요 기능**: 
- 계층적 메뉴 구조 (부모 → 자식)
- 메뉴 확장/축소 기능
- 활성 항목 하이라이트
- 상태 관리 (selected item, expanded items)

---

## 🎨 주요 구조

### 1. 데이터 구조

```typescript
interface SubMenuItem {
  id: string
  label: string
}

interface NavItem {
  id: string
  label: string
  hasArrow: boolean          // 펼침 화살표 표시 여부
  subItems?: SubMenuItem[]   // 하위 메뉴 항목
}
```

### 2. 메뉴 데이터

```typescript
const navItems: NavItem[] = [
  {
    id: 'users',
    label: '회원관리',
    hasArrow: true,
    subItems: [
      { id: 'users-list', label: '회원 목록' },
      { id: 'users-detail', label: '회원 상세' },
      { id: 'users-grade', label: '회원 등급' },
    ],
  },
  {
    id: 'reviews',
    label: '리뷰관리',
    hasArrow: false,
  },
  // ... 더 많은 메뉴
]
```

---

## 🎯 핵심 기능

### 메뉴 확장/축소

```typescript
const toggleExpand = (itemId: string) => {
  const newExpanded = new Set(expandedItems)
  if (newExpanded.has(itemId)) {
    newExpanded.delete(itemId)
  } else {
    newExpanded.add(itemId)
  }
  setExpandedItems(newExpanded)
}
```

- `expandedItems`: 현재 열려있는 메뉴의 ID들을 Set으로 관리
- 토글 방식으로 열기/닫기 처리

### 하위 메뉴 선택

```typescript
const handleSelectSubItem = (itemId: string, parentId: string) => {
  setSelectedItem(itemId)
  // 부모 메뉴는 자동으로 열림
  const newExpanded = new Set(expandedItems)
  newExpanded.add(parentId)
  setExpandedItems(newExpanded)
}
```

- 하위 메뉴 선택 시 부모 메뉴도 자동 확장
- `selectedItem` 상태로 현재 선택 항목 추적

### 활성 상태 판정

```typescript
const isParentActive = (item: NavItem): boolean => {
  if (!item.subItems) return false
  return item.subItems.some((subItem) => selectedItem === subItem.id)
}
```

- 부모 메뉴는 자신의 하위 메뉴 중 하나가 선택되었을 때 활성 상태
- 부모 메뉴 자체가 직접 선택될 수는 없음

---

## 🎨 스타일링

### 부모 메뉴 (활성/비활성)

```typescript
// 활성 상태 (하위 메뉴 선택됨)
isActive
  ? 'bg-[rgba(0,167,111,0.08)] text-[#00a76f] font-semibold hover:bg-[rgba(0,167,111,0.12)]'
  : 'text-[#637381] hover:bg-[#f5f6f7] hover:text-[#1f2937]'
```

**색상 체계**:
- 활성: 초록색 배경 + 초록색 텍스트 (`#00a76f`)
- 비활성: 그레이 텍스트 (`#637381`)

### 하위 메뉴

```typescript
isSubSelected
  ? 'text-[#212b36] font-semibold'
  : 'text-[#637381] font-medium hover:bg-[#f5f6f7]'
```

**bullet 스타일**:
- 활성: 채워진 원 (`#00a76f`)
- 비활성: 미세한 점 (`#919eab`)

---

## 🔧 주요 컴포넌트

### AdminIcon

```typescript
const AdminIcon = ({ isActive = false }: { isActive?: boolean }) => {
  const iconPath = isActive 
    ? '/admin-icon/sidebar/active/icon.svg'
    : '/admin-icon/sidebar/inactive/icon.svg'
  
  return (
    <Image
      src={iconPath}
      alt="admin icon"
      width={isActive ? 28 : 24}
      height={isActive ? 28 : 24}
      className={cn('transition-all duration-200')}
    />
  )
}
```

- 활성/비활성 상태에 따라 다른 SVG 아이콘 표시
- 크기도 동적으로 변함 (비활성: 24px, 활성: 28px)

### SubMenuBullet

```typescript
const SubMenuBullet = ({ isActive = false }: { isActive?: boolean }) => (
  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
    <Circle
      className={cn(
        'transition-colors duration-200',
        isActive ? 'w-2 h-2 fill-[#00a76f] text-[#00a76f]' : 'w-1.5 h-1.5 fill-[#919eab] text-[#919eab]'
      )}
    />
  </div>
)
```

- 하위 메뉴 앞의 bullet point 표시
- 활성/비활성에 따라 색상 및 크기 변경

---

## 📱 레이아웃 구조

```
┌─────────────────────────┐
│  Header (Logo)          │
├─────────────────────────┤
│  MANAGEMENT             │
├─────────────────────────┤
│  ┌─ 회원관리       ▼    │
│  ├─ ● 회원 목록        │
│  ├─ ● 회원 상세        │
│  └─ ● 회원 등급        │
│                         │
│  ┌─ 리뷰관리           │
│                         │
│  ┌─ 포인트관리     ▼    │
│  └─ ● 포인트 히스토리   │
└─────────────────────────┘
```

---

## 🔌 shadcn/ui 컴포넌트 활용

```typescript
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { 
  Collapsible, 
  CollapsibleTrigger, 
  CollapsibleContent 
} from '@/components/ui/collapsible'
```

- `Sidebar`: 전체 사이드바 레이아웃
- `Collapsible`: 메뉴 확장/축소 기능
- `SidebarMenu/MenuItem/Button`: 메뉴 구조화

---

## 💡 사용 예시

### 기본 렌더링

```typescript
export function AdminSidebar() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  return (
    <Sidebar>
      {/* Header */}
      {/* Navigation Content */}
    </Sidebar>
  )
}
```

### 메뉴 추가/수정

`navItems` 배열에 새 항목 추가:

```typescript
const navItems: NavItem[] = [
  // ... 기존 항목
  {
    id: 'products',
    label: '상품관리',
    hasArrow: true,
    subItems: [
      { id: 'products-list', label: '상품 목록' },
      { id: 'products-upload', label: '상품 업로드' },
    ],
  },
]
```

---

## 🎨 커스터마이징 포인트

### 색상 변경

```typescript
// 활성 색상
'bg-[rgba(0,167,111,0.08)] text-[#00a76f]'  // → 다른 색상으로 변경

// 마우스 오버 색상
'hover:bg-[#f5f6f7]'  // → 다른 색상으로 변경
```

### 아이콘 경로 수정

```typescript
const iconPath = isActive 
  ? '/your-icon-path/active.svg'
  : '/your-icon-path/inactive.svg'
```

### 애니메이션 조정

```typescript
className={cn(
  'transition-all duration-200'  // → duration 값 변경
)}
```

---

## ⚠️ 주의사항

1. **상태 관리**: 부모 메뉴는 직접 선택될 수 없음 (하위 메뉴만 선택 가능)
2. **아이콘 경로**: SVG 파일이 정확한 경로에 존재해야 함
3. **Next.js Image**: `Image` 컴포넌트 사용 시 next.config.js에서 이미지 도메인 설정 확인
4. **Responsive**: 현재는 고정 너비 사이드바 (반응형 필요 시 수정 필요)

---

## 🔗 관련 파일

- `components/ui/sidebar` - shadcn/ui Sidebar 컴포넌트
- `components/ui/collapsible` - shadcn/ui Collapsible 컴포넌트
- `lib/tailwind/utils` - cn 유틸리티 함수
- `/admin-icon/sidebar/` - 아이콘 SVG 파일들
