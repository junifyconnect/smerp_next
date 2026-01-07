# 단위 테스트 예제

utils 함수, validators (Zod 스키마) 테스트 예제입니다.

---

## Utils 함수 테스트

### 예제: formatPhoneNumber

```ts
// __tests__/unit/lib/formatPhoneNumber.test.ts

import { describe, it, expect } from 'vitest'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/utils/formatPhoneNumber'

describe('formatPhoneNumber', () => {
  describe('정상적인 전화번호 변환', () => {
    it('하이픈 없는 번호를 포맷팅한다', () => {
      expect(formatPhoneNumber('01054509864')).toBe('010-5450-9864')
    })

    it('이미 포맷된 번호는 그대로 반환한다', () => {
      expect(formatPhoneNumber('010-5450-9864')).toBe('010-5450-9864')
    })

    it('국제번호 +82를 0으로 변환한다', () => {
      expect(formatPhoneNumber('+82 10-5450-9864')).toBe('010-5450-9864')
    })
  })

  describe('잘못된 입력 처리', () => {
    it('null이면 null 반환', () => {
      expect(formatPhoneNumber(null)).toBeNull()
    })

    it('undefined면 null 반환', () => {
      expect(formatPhoneNumber(undefined)).toBeNull()
    })

    it('9자리 미만이면 null 반환', () => {
      expect(formatPhoneNumber('12345678')).toBeNull()
    })
  })
})
```

---

## Zod 스키마 테스트

### 예제: campaignSchema

```ts
// __tests__/unit/validators/campaign.test.ts

import { describe, it, expect } from 'vitest'
import { campaignSchema } from '@/validators/campaign'

describe('campaignSchema', () => {
  // 테스트용 기본 데이터
  const validCampaign = {
    name: '테스트 캠페인',
    budget: 50000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
  }

  describe('유효한 데이터', () => {
    it('모든 필드가 유효하면 통과', () => {
      const result = campaignSchema.safeParse(validCampaign)

      expect(result.success).toBe(true)
    })
  })

  describe('name 필드', () => {
    it('빈 문자열이면 실패', () => {
      const result = campaignSchema.safeParse({
        ...validCampaign,
        name: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name')
      }
    })

    it('100자 초과면 실패', () => {
      const result = campaignSchema.safeParse({
        ...validCampaign,
        name: 'a'.repeat(101),
      })

      expect(result.success).toBe(false)
    })
  })

  describe('budget 필드', () => {
    it('1000원 이상이면 통과', () => {
      const result = campaignSchema.safeParse({
        ...validCampaign,
        budget: 1000,
      })

      expect(result.success).toBe(true)
    })

    it('1000원 미만이면 실패', () => {
      const result = campaignSchema.safeParse({
        ...validCampaign,
        budget: 999,
      })

      expect(result.success).toBe(false)
    })

    it('음수면 실패', () => {
      const result = campaignSchema.safeParse({
        ...validCampaign,
        budget: -1000,
      })

      expect(result.success).toBe(false)
    })
  })

  describe('날짜 검증', () => {
    it('종료일이 시작일보다 빠르면 실패', () => {
      const result = campaignSchema.safeParse({
        ...validCampaign,
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'),
      })

      expect(result.success).toBe(false)
    })
  })
})
```

---

## 테스트 작성 팁

### 1. 경계값 테스트

```ts
describe('budget 경계값', () => {
  it('최소값 1000은 통과', () => { ... })
  it('최소값-1인 999는 실패', () => { ... })
  it('0은 실패', () => { ... })
  it('음수는 실패', () => { ... })
})
```

### 2. 에러 메시지 확인

```ts
it('에러 메시지가 올바른지 확인', () => {
  const result = schema.safeParse({ budget: -1 })

  if (!result.success) {
    expect(result.error.issues[0].message).toBe('예산은 0 이상이어야 합니다')
  }
})
```

### 3. 타입 변환 테스트 (coerce)

```ts
describe('coerce 동작', () => {
  it('문자열 숫자를 number로 변환', () => {
    const result = schema.safeParse({ budget: '10000' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.budget).toBe(10000)
    }
  })
})
```
