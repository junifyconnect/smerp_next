# Hooks 테스트 예제

커스텀 훅 테스트 예제입니다. `@testing-library/react`의 `renderHook`을 사용합니다.

---

## 기본 구조

```ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCustomHook } from '@/hooks/useCustomHook'
```

---

## useDebounce 테스트

```ts
// __tests__/unit/hooks/useDebounce.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('초기값을 즉시 반환한다', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))

    expect(result.current).toBe('initial')
  })

  it('지연 시간 전에는 이전 값을 유지한다', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    // 500ms 전
    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(result.current).toBe('initial')
  })

  it('지연 시간 후에 새 값을 반환한다', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    // 500ms 후
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('updated')
  })
})
```

---

## useToggle 테스트

```ts
// __tests__/unit/hooks/useToggle.test.ts

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToggle } from '@/hooks/useToggle'

describe('useToggle', () => {
  it('초기값 false를 반환한다', () => {
    const { result } = renderHook(() => useToggle())

    expect(result.current[0]).toBe(false)
  })

  it('초기값을 설정할 수 있다', () => {
    const { result } = renderHook(() => useToggle(true))

    expect(result.current[0]).toBe(true)
  })

  it('toggle 호출 시 값이 반전된다', () => {
    const { result } = renderHook(() => useToggle(false))

    act(() => {
      result.current[1]() // toggle()
    })

    expect(result.current[0]).toBe(true)

    act(() => {
      result.current[1]() // toggle()
    })

    expect(result.current[0]).toBe(false)
  })
})
```

---

## useLocalStorage 테스트

```ts
// __tests__/unit/hooks/useLocalStorage.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '@/hooks/useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('초기값을 반환한다', () => {
    const { result } = renderHook(() =>
      useLocalStorage('key', 'initial')
    )

    expect(result.current[0]).toBe('initial')
  })

  it('localStorage에 저장된 값을 반환한다', () => {
    localStorage.setItem('key', JSON.stringify('saved'))

    const { result } = renderHook(() =>
      useLocalStorage('key', 'initial')
    )

    expect(result.current[0]).toBe('saved')
  })

  it('setValue로 값을 변경하면 localStorage에 저장된다', () => {
    const { result } = renderHook(() =>
      useLocalStorage('key', 'initial')
    )

    act(() => {
      result.current[1]('new value')
    })

    expect(result.current[0]).toBe('new value')
    expect(localStorage.getItem('key')).toBe(JSON.stringify('new value'))
  })

  it('객체도 저장할 수 있다', () => {
    const { result } = renderHook(() =>
      useLocalStorage('user', { name: '', age: 0 })
    )

    act(() => {
      result.current[1]({ name: 'John', age: 30 })
    })

    expect(result.current[0]).toEqual({ name: 'John', age: 30 })
  })
})
```

---

## 비동기 Hook 테스트

```ts
// __tests__/unit/hooks/useFetch.test.ts

import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFetch } from '@/hooks/useFetch'

describe('useFetch', () => {
  it('초기 상태는 loading이다', () => {
    const { result } = renderHook(() => useFetch('/api/data'))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('성공하면 data를 반환한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: 'Test' }),
    })

    const { result } = renderHook(() => useFetch('/api/data'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual({ id: 1, name: 'Test' })
    expect(result.current.error).toBeNull()
  })

  it('실패하면 error를 반환한다', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useFetch('/api/data'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Network error')
  })
})
```

---

## 테스트 작성 팁

### 1. act()로 상태 변경 감싸기

```ts
// 상태를 변경하는 모든 동작은 act()로 감싸야 함
act(() => {
  result.current.increment()
})
```

### 2. 타이머 테스트 (vi.useFakeTimers)

```ts
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('1초 후 실행된다', () => {
  // ...
  act(() => {
    vi.advanceTimersByTime(1000)
  })
})
```

### 3. 비동기 테스트 (waitFor)

```ts
await waitFor(() => {
  expect(result.current.data).not.toBeNull()
})
```

### 4. rerender로 props 변경

```ts
const { result, rerender } = renderHook(
  ({ value }) => useDebounce(value, 500),
  { initialProps: { value: 'initial' } }
)

rerender({ value: 'updated' })
```
