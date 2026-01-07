---
name: test-skill
description: 테스트 코드 작성 가이드입니다. 단위 테스트, 컴포넌트 테스트 작성 시 참고하세요. Vitest + React Testing Library 기반입니다.
---

# test-skill

이 스킬은 **테스트 코드 작성 가이드**를 안내합니다.

**Stack**: Vitest + React Testing Library + jsdom

---

## 📌 3가지 핵심 원칙

1. **의미 있는 테스트만** - 단순 렌더링 확인은 가치 없음
2. **동작을 테스트** - 구현 디테일이 아닌 사용자 관점
3. **한 테스트 = 한 가지** - 여러 개 검증 금지

---

## 🚫 하지 말 것 (중요)

```ts
// ❌ 단순 렌더링 테스트 - 가치 없음
it('renders correctly', () => {
  render(<Button>클릭</Button>)
  expect(screen.getByText('클릭')).toBeInTheDocument()
})

// ❌ className 확인 - 구현 디테일
it('has correct className', () => {
  render(<Button variant="primary" />)
  expect(screen.getByRole('button')).toHaveClass('btn-primary')
})

// ❌ 내부 state 직접 검증 - 구현 디테일
it('updates internal state', () => {
  const { result } = renderHook(() => useState(0))
  expect(result.current[0]).toBe(0)  // 이게 왜 중요?
})

// ❌ 스냅샷 테스트 - 유지보수 어려움
it('matches snapshot', () => {
  const { container } = render(<Component />)
  expect(container).toMatchSnapshot()
})
```

---

## ✅ 할 것

```ts
// ✅ 사용자 인터랙션 테스트
it('클릭하면 onSubmit이 호출된다', () => {
  const onSubmit = vi.fn()
  render(<Button onClick={onSubmit}>제출</Button>)

  fireEvent.click(screen.getByText('제출'))

  expect(onSubmit).toHaveBeenCalledTimes(1)
})

// ✅ 조건부 렌더링 테스트
it('에러가 있으면 에러 메시지를 표시한다', () => {
  render(<Input error="필수 입력입니다" />)

  expect(screen.getByText('필수 입력입니다')).toBeInTheDocument()
})

// ✅ 비즈니스 로직 테스트
it('10% 할인을 적용한다', () => {
  const result = applyDiscount(10000, 0.1)

  expect(result).toBe(9000)
})

// ✅ Edge case 테스트
it('빈 배열이면 빈 문자열을 반환한다', () => {
  expect(formatList([])).toBe('')
})
```

---

## 📝 테스트 작성 패턴

### Given-When-Then (AAA 패턴)

```ts
it('예산이 1000원 미만이면 validation 에러를 반환한다', () => {
  // Given (Arrange) - 준비
  const input = { name: '캠페인', budget: 500 }

  // When (Act) - 실행
  const result = campaignSchema.safeParse(input)

  // Then (Assert) - 검증
  expect(result.success).toBe(false)
})
```

### describe로 그룹화

```ts
describe('CampaignSchema', () => {
  describe('name 필드', () => {
    it('1자 이상이면 통과', () => { ... })
    it('빈 문자열이면 실패', () => { ... })
  })

  describe('budget 필드', () => {
    it('1000원 이상이면 통과', () => { ... })
    it('1000원 미만이면 실패', () => { ... })
  })
})
```

### 테스트 이름 컨벤션

```ts
// ✅ 좋은 예 - "~하면 ~한다" 형식
it('예산이 음수면 에러를 반환한다', () => {})
it('로그인 성공 시 토큰을 저장한다', () => {})
it('disabled 상태면 클릭해도 동작하지 않는다', () => {})

// ❌ 나쁜 예 - 모호함
it('테스트 1', () => {})
it('에러 처리', () => {})
it('작동함', () => {})
```

---

## 📁 파일 구조

```
__tests__/
├── setup.ts                          ← 공통 설정
├── vitest.d.ts                       ← 타입 정의
├── unit/                             ← 단위 테스트
│   ├── lib/
│   │   └── formatPhoneNumber.test.ts
│   ├── hooks/
│   │   └── useDebounce.test.ts
│   └── validators/
│       └── campaign.test.ts
├── components/                       ← 컴포넌트 테스트
│   ├── common/
│   │   └── Button.test.tsx
│   └── campaign/
│       └── CampaignCard.test.tsx
└── integration/                      ← 통합 테스트 (나중에)
    └── campaign-actions.test.ts
```

### 파일 경로 매핑 규칙

| 소스 파일 | 테스트 파일 |
|----------|------------|
| `src/lib/utils/format.ts` | `__tests__/unit/lib/format.test.ts` |
| `src/validators/campaign.ts` | `__tests__/unit/validators/campaign.test.ts` |
| `src/hooks/useDebounce.ts` | `__tests__/unit/hooks/useDebounce.test.ts` |
| `src/components/common/Button.tsx` | `__tests__/components/common/Button.test.tsx` |

---

## 🎯 테스트 효용 판단 기준

테스트를 작성할지 고민될 때 이 기준으로 판단:

| 질문 | 예 → 테스트 작성 |
|------|-----------------|
| 이 코드가 깨지면 사용자에게 영향이 큰가? | ✅ |
| 이 로직이 복잡해서 실수하기 쉬운가? | ✅ |
| 이 코드가 자주 변경되는가? | ✅ |
| 과거에 버그가 발생한 적 있는가? | ✅ |

**하나라도 "예"면 테스트 작성**

---

## 🔧 테스트 명령어

```bash
npm run test          # Watch 모드
npm run test:run      # 한 번 실행
npm run test:ui       # 브라우저 UI
npm run test:coverage # 커버리지
```

---

## 📚 예제 가이드

- **[단위 테스트](./examples/01-unit-test.md)** - utils, validators 테스트
- **[컴포넌트 테스트](./examples/02-component-test.md)** - React 컴포넌트 테스트
- **[Hooks 테스트](./examples/03-hooks-test.md)** - 커스텀 훅 테스트
