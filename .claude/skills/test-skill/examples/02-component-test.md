# 컴포넌트 테스트 예제

React Testing Library를 사용한 컴포넌트 테스트 예제입니다.

---

## 기본 구조

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/common/Button'
```

---

## Button 컴포넌트 테스트

```tsx
// __tests__/components/common/Button.test.tsx

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/common/Button'

describe('Button', () => {
  describe('클릭 동작', () => {
    it('클릭하면 onClick이 호출된다', () => {
      const handleClick = vi.fn()

      render(<Button onClick={handleClick}>클릭</Button>)
      fireEvent.click(screen.getByText('클릭'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('disabled면 클릭해도 onClick이 호출되지 않는다', () => {
      const handleClick = vi.fn()

      render(<Button onClick={handleClick} disabled>클릭</Button>)
      fireEvent.click(screen.getByText('클릭'))

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('로딩 상태', () => {
    it('loading이면 스피너를 표시한다', () => {
      render(<Button loading>저장</Button>)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('loading이면 버튼 텍스트가 숨겨진다', () => {
      render(<Button loading>저장</Button>)

      expect(screen.queryByText('저장')).not.toBeVisible()
    })

    it('loading이면 클릭이 비활성화된다', () => {
      const handleClick = vi.fn()

      render(<Button onClick={handleClick} loading>저장</Button>)
      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })
  })
})
```

---

## Input 컴포넌트 테스트

```tsx
// __tests__/components/common/Input.test.tsx

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/common/Input'

describe('Input', () => {
  describe('값 입력', () => {
    it('입력하면 onChange가 호출된다', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(<Input onChange={handleChange} />)
      await user.type(screen.getByRole('textbox'), 'hello')

      expect(handleChange).toHaveBeenCalled()
    })

    it('입력값이 표시된다', () => {
      render(<Input value="테스트" readOnly />)

      expect(screen.getByRole('textbox')).toHaveValue('테스트')
    })
  })

  describe('에러 상태', () => {
    it('에러 메시지가 있으면 표시한다', () => {
      render(<Input error="필수 입력입니다" />)

      expect(screen.getByText('필수 입력입니다')).toBeInTheDocument()
    })

    it('에러가 있으면 input에 에러 스타일이 적용된다', () => {
      render(<Input error="에러" />)

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('비활성화 상태', () => {
    it('disabled면 입력할 수 없다', () => {
      render(<Input disabled />)

      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })
})
```

---

## 조건부 렌더링 테스트

```tsx
// __tests__/components/campaign/CampaignStatus.test.tsx

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CampaignStatus } from '@/components/campaign/CampaignStatus'

describe('CampaignStatus', () => {
  it('active면 "진행중" 뱃지를 표시한다', () => {
    render(<CampaignStatus status="active" />)

    expect(screen.getByText('진행중')).toBeInTheDocument()
  })

  it('paused면 "일시정지" 뱃지를 표시한다', () => {
    render(<CampaignStatus status="paused" />)

    expect(screen.getByText('일시정지')).toBeInTheDocument()
  })

  it('ended면 "종료" 뱃지를 표시한다', () => {
    render(<CampaignStatus status="ended" />)

    expect(screen.getByText('종료')).toBeInTheDocument()
  })

  it('알 수 없는 status면 아무것도 표시하지 않는다', () => {
    render(<CampaignStatus status={'unknown' as any} />)

    expect(screen.queryByRole('status')).toBeNull()
  })
})
```

---

## Modal/Dialog 테스트

```tsx
// __tests__/components/common/Modal.test.tsx

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '@/components/common/Modal'

describe('Modal', () => {
  it('open이 true면 내용을 표시한다', () => {
    render(
      <Modal open onClose={() => {}}>
        <p>모달 내용</p>
      </Modal>
    )

    expect(screen.getByText('모달 내용')).toBeInTheDocument()
  })

  it('open이 false면 내용을 표시하지 않는다', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>모달 내용</p>
      </Modal>
    )

    expect(screen.queryByText('모달 내용')).not.toBeInTheDocument()
  })

  it('닫기 버튼 클릭 시 onClose가 호출된다', () => {
    const handleClose = vi.fn()

    render(
      <Modal open onClose={handleClose}>
        <p>모달 내용</p>
      </Modal>
    )

    fireEvent.click(screen.getByRole('button', { name: /닫기/ }))

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('ESC 키 누르면 onClose가 호출된다', () => {
    const handleClose = vi.fn()

    render(
      <Modal open onClose={handleClose}>
        <p>모달 내용</p>
      </Modal>
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
```

---

## 테스트 작성 팁

### 1. userEvent vs fireEvent

```ts
// fireEvent: 동기적, 빠름
fireEvent.click(button)

// userEvent: 비동기적, 실제 사용자 동작에 가까움
const user = userEvent.setup()
await user.click(button)

// 추천: 간단한 클릭은 fireEvent, 타이핑은 userEvent
```

### 2. 요소 찾기 우선순위

```ts
// 1순위: 접근성 역할
screen.getByRole('button')
screen.getByRole('textbox')

// 2순위: 레이블
screen.getByLabelText('이메일')

// 3순위: 텍스트
screen.getByText('저장')

// 마지막: data-testid (다른 방법 없을 때만)
screen.getByTestId('submit-button')
```

### 3. 없는 요소 확인

```ts
// queryBy는 없으면 null 반환 (에러 안 남)
expect(screen.queryByText('에러')).not.toBeInTheDocument()

// getBy는 없으면 에러 발생
screen.getByText('에러')  // 없으면 테스트 실패
```
