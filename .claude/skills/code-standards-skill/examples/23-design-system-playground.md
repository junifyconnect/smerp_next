---
alwaysApply: false
---

# Design System Playground 가이드

## 🎯 개요

`/design-system` 페이지는 공통 컴포넌트를 테스트하고 문서화하는 플레이그라운드입니다.
새 공통 컴포넌트를 만들면 이 페이지에 데모 섹션을 추가해야 합니다.

---

## 📁 파일 구조

```
src/app/(client)/design-system/
├── page.tsx                              ← 메인 페이지 (네비게이션 + 라우팅)
└── _components/
    ├── index.ts                          ← 배럴 파일 (모든 섹션 export)
    ├── common.tsx                        ← 공통 UI (SectionHeader, PreviewBox)
    └── sections/
        ├── ColorsSection.tsx             ← 색상 팔레트
        ├── FormSections.tsx              ← 폼 컴포넌트들 (Button, Input 등)
        ├── UISections.tsx                ← UI 컴포넌트들 (ProgressBar, DataTable 등)
        ├── NotificationSections.tsx      ← 알림톡 템플릿들
        └── TemplatePreviewSection.tsx    ← 템플릿 미리보기
```

---

## 🆕 새 컴포넌트 섹션 추가 방법

### Step 1: 섹션 파일 선택

컴포넌트 종류에 따라 적절한 파일에 추가:

| 컴포넌트 종류 | 파일 |
|--------------|------|
| 폼 관련 (Input, Select 등) | `FormSections.tsx` |
| UI 관련 (Card, Table 등) | `UISections.tsx` |
| 알림톡/메시지 템플릿 | `NotificationSections.tsx` |
| 독립적인 큰 기능 | 새 파일 생성 (`XxxSection.tsx`) |

### Step 2: 섹션 컴포넌트 작성

```tsx
// FormSections.tsx에 추가하는 경우
import { NewComponent } from '@/components/common/NewComponent'
import { SectionHeader, PreviewBox } from '@/app/(client)/design-system/_components/common'

export function NewComponentSection() {
  // 1. 상태 관리 (컨트롤 패널용)
  const [value, setValue] = useState('default')
  const [variant, setVariant] = useState<'primary' | 'secondary'>('primary')

  return (
    <div className="space-y-8">
      {/* 2. 헤더 */}
      <SectionHeader
        title="NewComponent"
        description="컴포넌트에 대한 간단한 설명"
      />

      {/* 3. 컨트롤 패널 (선택) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">value</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">variant</label>
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value as 'primary' | 'secondary')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="primary">primary</option>
              <option value="secondary">secondary</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. 프리뷰 */}
      <PreviewBox>
        <NewComponent value={value} variant={variant} />
      </PreviewBox>
    </div>
  )
}
```

### Step 3: Export 추가

```tsx
// _components/index.ts
export { NewComponentSection } from './sections/FormSections'
// 또는 새 파일인 경우
export { NewComponentSection } from './sections/NewComponentSection'
```

### Step 4: 네비게이션 등록

```tsx
// page.tsx
import { NewComponentSection } from './_components'

// 1. 타입에 추가
type ComponentType =
  | 'Colors'
  | 'Button'
  // ...
  | 'NewComponent'  // ← 추가

// 2. 네비게이션 목록에 추가
const COMPONENTS: { id: ComponentType; label: string }[] = [
  // ...
  { id: 'NewComponent', label: 'NewComponent' },  // ← 추가
]

// 3. 섹션 맵에 추가
const SECTION_MAP: Record<ComponentType, React.FC> = {
  // ...
  NewComponent: NewComponentSection,  // ← 추가
}
```

---

## 🎨 공통 UI 컴포넌트

### SectionHeader

섹션 상단의 제목과 설명을 표시합니다.

```tsx
<SectionHeader
  title="Button"
  description="다양한 스타일과 크기를 지원하는 버튼 컴포넌트"
/>
```

### PreviewBox

컴포넌트 미리보기 영역입니다. 중앙 정렬된 회색 배경 박스.

```tsx
<PreviewBox>
  <Button>클릭</Button>
</PreviewBox>
```

---

## 📝 컨트롤 패널 패턴

### 기본 입력

```tsx
<div>
  <label className="block text-xs font-medium text-gray-500 mb-2">propName</label>
  <input
    type="text"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
  />
</div>
```

### 셀렉트

```tsx
<div>
  <label className="block text-xs font-medium text-gray-500 mb-2">variant</label>
  <select
    value={variant}
    onChange={(e) => setVariant(e.target.value)}
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
  >
    <option value="primary">primary</option>
    <option value="secondary">secondary</option>
  </select>
</div>
```

### Switch (토글)

```tsx
import { Switch } from '@/components/common/form/Switch'

<div>
  <label className="block text-xs font-medium text-gray-500 mb-2">disabled</label>
  <Switch checked={disabled} onCheckedChange={setDisabled} />
</div>
```

### 그리드 레이아웃

```tsx
<div className="bg-white rounded-xl border border-gray-200 p-6">
  <div className="grid grid-cols-3 gap-6">
    {/* 컨트롤들 */}
  </div>
</div>
```

---

## ✅ 체크리스트

새 컴포넌트 섹션 추가 시:

- [ ] 적절한 섹션 파일에 컴포넌트 추가 (또는 새 파일 생성)
- [ ] `SectionHeader`로 제목/설명 추가
- [ ] 주요 props를 조작할 수 있는 컨트롤 패널 추가
- [ ] `PreviewBox`로 미리보기 영역 구성
- [ ] `_components/index.ts`에 export 추가
- [ ] `page.tsx`에 타입, 네비게이션, 섹션맵 추가
- [ ] `npm run type-check` 통과 확인

---

## 💡 팁

1. **컨트롤 패널 생략 가능**: 간단한 컴포넌트는 PreviewBox만으로 충분
2. **여러 변형 보여주기**: 한 섹션에서 여러 variant/size를 나란히 보여줘도 됨
3. **그룹핑**: 관련 컴포넌트는 같은 파일에 모아두기 (FormSections처럼)
