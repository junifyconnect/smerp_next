---
alwaysApply: true
---

# 공통 컴포넌트 사용 가이드

## 🎯 핵심 원칙

**Figma MCP로 디자인을 구현할 때, 기존 공통 컴포넌트와 유사하면 공통 컴포넌트를 우선 사용합니다.**

Figma 디자인과 1~3px 차이가 나더라도 공통 컴포넌트를 사용하세요. 이렇게 하면:
- 일관된 UI/UX 유지
- 코드 중복 방지
- 유지보수 용이

---

## 📍 공통 컴포넌트 위치

```
src/components/common/
├── Button.tsx          # 버튼
├── Input.tsx           # 텍스트 입력 (한 줄)
├── Textarea.tsx        # 텍스트 영역 (여러 줄)
├── Select.tsx          # 드롭다운 셀렉트
├── Label.tsx           # 폼 라벨
├── Switch.tsx          # 토글 스위치
├── ProgressBar.tsx     # 진행률 바
└── MessageTypeCard.tsx # 메시지 타입 선택 카드
```

---

## 🔍 구현 전 확인 절차

Figma 디자인을 구현하기 전에 **반드시** 다음을 확인하세요:

### 1. 공통 컴포넌트 폴더 스캔
```bash
# 먼저 이 폴더의 컴포넌트들을 확인
src/components/common/
```

### 2. 각 컴포넌트의 JSDoc 확인
각 컴포넌트 파일 상단에 다음 정보가 있습니다:
- `@figmaTolerance` - 허용 오차 (예: 3px)
- `@usage` - 사용 케이스
- `@specs` - 디자인 스펙
- `@sizes` / `@variants` - 사이즈/변형 옵션
- `@example` - 사용 예시

### 3. 매칭 여부 판단
Figma 디자인이 공통 컴포넌트와 **@figmaTolerance 범위 내**로 유사하면 → 공통 컴포넌트 사용

---

## 📋 컴포넌트별 매칭 가이드

| Figma 요소 | 공통 컴포넌트 | 허용 오차 | 판단 기준 |
|------------|---------------|-----------|-----------|
| 버튼 | `Button` | ±3px | 클릭 가능한 버튼 형태 |
| 텍스트 입력창 | `Input` | ±3px | 한 줄 텍스트 입력 필드 |
| 텍스트 영역 | `Textarea` | ±3px | 여러 줄 텍스트 입력 (메세지, 설명 등) |
| 드롭다운/셀렉트 | `Select` | ±3px | 옵션 선택 드롭다운 |
| 폼 라벨 | `Label` | ±2px | 입력 필드 위의 라벨 |
| 토글 스위치 | `Switch` | ±2px | on/off 토글 |
| 진행률 바 | `ProgressBar` | ±2px | 단계별 진행 표시 |
| 메시지 타입 카드 | `MessageTypeCard` | ±3px | 알림톡/브랜드메세지/일반문자 선택 |

---

## ✅ 올바른 패턴

### Figma에서 버튼 발견 시
```tsx
// ❌ 틀린 예 - Figma 스펙 그대로 구현
<button className="px-[12px] py-[11px] bg-[#6d36f7] rounded-[12px]">
  버튼
</button>

// ✅ 올바른 예 - 공통 컴포넌트 사용 (padding 1px 차이는 무시)
import { Button } from '@/components/common/Button'

<Button variant="fill" size="md">버튼</Button>
```

### Figma에서 입력창 발견 시
```tsx
// ❌ 틀린 예 - Figma 스펙 그대로 구현
<input className="h-[56px] px-[20px] border border-[#8e8ca4] rounded-[10px]" />

// ✅ 올바른 예 - 공통 컴포넌트 사용 (height 1px 차이는 무시)
import { Input } from '@/components/common/Input'

<Input placeholder="입력하세요" />
```

### Figma에서 텍스트 영역 발견 시
```tsx
// ❌ 틀린 예 - Figma 스펙 그대로 구현
<textarea className="h-[200px] px-[20px] py-[24px] border border-[#8e8ca4] rounded-[10px]" />

// ✅ 올바른 예 - 공통 컴포넌트 사용 (height는 className으로 설정)
import { Textarea } from '@/components/common/Textarea'

<Textarea placeholder="메세지를 입력하세요" className="h-[200px]" />
```

---

## 🆕 새 공통 컴포넌트 추가 시

새로운 공통 컴포넌트를 만들 때는 **반드시** 다음 형식의 JSDoc을 포함하세요:

```tsx
/**
 * @component ComponentName
 * @description 컴포넌트 설명
 *
 * @figmaTolerance Npx - Figma와 ±Npx 차이나면 이 컴포넌트 사용
 *
 * @usage
 * - 사용 케이스 1
 * - 사용 케이스 2
 *
 * @specs
 * | 속성 | 값 |
 * |------|-----|
 * | 속성명 | 값 |
 *
 * @sizes (선택)
 * | size | 스펙 |
 * |------|------|
 *
 * @variants (선택)
 * | variant | 설명 |
 * |---------|------|
 *
 * @example
 * ```tsx
 * import { ComponentName } from '@/components/common/ComponentName'
 * <ComponentName />
 * ```
 */
```

---

## ⚠️ 공통 컴포넌트 수정 시 주의사항

1. **기존 사용처 확인**: 수정 전에 해당 컴포넌트를 사용하는 모든 곳 확인
2. **JSDoc 동기화**: 스펙 변경 시 JSDoc도 반드시 업데이트
3. **Breaking Change 주의**: variant/size 제거 시 사용처 마이그레이션 필요
4. **사용자 확인**: 대규모 변경은 사용자에게 먼저 확인

---

## 🔄 공통 컴포넌트로 승격 기준

다음 조건을 만족하면 공통 컴포넌트로 만드는 것을 고려하세요:

1. **3곳 이상에서 재사용** 예상
2. **일관된 스타일** 유지 필요
3. **Figma 디자인 시스템**에 정의된 컴포넌트

승격 시 반드시 사용자에게 확인:
```
"이 컴포넌트를 공통 컴포넌트로 만들면 좋을 것 같습니다.
- 위치: src/components/common/NewComponent.tsx
- 용도: [설명]
이렇게 진행해도 될까요?"
```

---

## 🎮 Design System Playground

새 공통 컴포넌트를 만들면 `/design-system` 플레이그라운드에 데모 섹션을 추가하세요.

**상세 가이드**: [23-design-system-playground.md](./23-design-system-playground.md)
