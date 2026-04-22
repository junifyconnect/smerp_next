import type { BillingCycle } from '@prisma/client'

/**
 * 사용자가 엑셀/UI에서 입력한 자유 문자열 → BillingCycle enum 매핑.
 * 매칭 안 되는 값은 null (사용자가 UI에서 수동 선택하도록 유도).
 *
 * 과거 호환:
 * - "월간" → 매월
 * - "총(월간)" → 매월 (총액 의미는 폐기, 단순 월 청구로 해석)
 */
const BILLING_CYCLE_ALIASES: Record<string, BillingCycle> = {
  // enum 값 자체
  매월: '매월',
  격월: '격월',
  분기: '분기',
  반기: '반기',
  연간: '연간',
  일시불: '일시불',
  // 과거/구어체 별칭
  월간: '매월',
  '총(월간)': '매월',
  월: '매월',
  연: '연간',
  년: '연간',
  년간: '연간',
}

export function normalizeBillingCycle(raw: string | null | undefined): BillingCycle | null {
  if (!raw) return null
  const cleaned = raw.trim()
  if (!cleaned) return null
  // 대괄호 접두사 제거 ([MA] 등)
  const stripped = cleaned.replace(/^\[.*?\]\s*/, '').trim()
  return BILLING_CYCLE_ALIASES[stripped] ?? null
}

export const BILLING_CYCLE_OPTIONS: BillingCycle[] = [
  '매월',
  '격월',
  '분기',
  '반기',
  '연간',
  '일시불',
]

/**
 * 주기를 개월 간격으로 변환 (MABilling 생성 시 "이 달에 청구하는가" 판단용).
 * 일시불은 특수 처리 — 계약 시작 월에만 청구.
 */
export function cycleToIntervalMonths(cycle: BillingCycle): number | 'once' {
  switch (cycle) {
    case '매월':
      return 1
    case '격월':
      return 2
    case '분기':
      return 3
    case '반기':
      return 6
    case '연간':
      return 12
    case '일시불':
      return 'once'
  }
}
