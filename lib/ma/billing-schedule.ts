import type { BillingCycle } from '@prisma/client'
import { cycleToIntervalMonths } from './billing-cycle'

/**
 * 계약 기간 내에서 주기에 맞춰 MABilling을 생성할 "청구 월 목록"을 반환.
 *
 * BUSINESS_RULES §10.3 기준:
 * - 월 단위로 1건씩 생성 (시작 월 ~ 종료 월)
 * - 일할 계산 없음 (양 끝 월도 통째로 1개월치)
 * - 주기에 따라 특정 월만 청구 (매월/격월/분기/반기/연간/일시불)
 * - 청구 기준일(billingDayOfMonth)로 dueDate 계산, 해당 월 말일을 넘지 않음
 */
export interface BillingScheduleEntry {
  billingMonth: Date // 해당 월 1일 (2026-04-01 00:00)
  dueDate: Date // billingMonth + (billingDayOfMonth - 1), 말일 clamp
}

// 모든 날짜 연산은 UTC 기준으로 수행 (Prisma @db.Date 컬럼이 타임존 보정 없이 날짜 부분만 저장하므로,
// KST 로컬로 생성한 Date를 저장하면 UTC 변환 시 전날로 밀리는 문제 발생).

function firstOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function monthsBetween(start: Date, end: Date): number {
  const s = firstOfMonthUTC(start)
  const e = firstOfMonthUTC(end)
  return (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1
}

function lastDayOfMonthUTC(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate()
}

function computeDueDate(billingMonth: Date, billingDayOfMonth: number): Date {
  const y = billingMonth.getUTCFullYear()
  const m = billingMonth.getUTCMonth()
  const lastDay = lastDayOfMonthUTC(y, m)
  const day = Math.min(Math.max(1, billingDayOfMonth), lastDay)
  return new Date(Date.UTC(y, m, day))
}

/**
 * 주어진 주기/계약 기간으로 MABilling 청구 월 목록을 생성.
 * 빈 배열이 반환되면 "이 품목으로는 청구가 발생하지 않음" (주기/기간 엇갈림).
 *
 * 주기/기간 엣지 케이스는 MVP 기준 단순 규칙:
 * - 시작 월을 i=0으로 하고, i % interval === 0 일 때마다 청구
 * - 일시불은 첫 달(시작 월) 1건만
 * - 종료 월을 넘어가지 않음
 */
export function buildBillingSchedule(params: {
  startDate: Date
  endDate: Date
  cycle: BillingCycle
  billingDayOfMonth: number
}): BillingScheduleEntry[] {
  const { startDate, endDate, cycle, billingDayOfMonth } = params

  if (endDate < startDate) return []

  const start = firstOfMonthUTC(startDate)
  const totalMonths = monthsBetween(start, endDate)
  if (totalMonths <= 0) return []

  const interval = cycleToIntervalMonths(cycle)

  if (interval === 'once') {
    // 일시불: 시작 월에 1건만
    const billingMonth = start
    return [
      {
        billingMonth,
        dueDate: computeDueDate(billingMonth, billingDayOfMonth),
      },
    ]
  }

  const entries: BillingScheduleEntry[] = []
  for (let i = 0; i < totalMonths; i++) {
    if (i % interval !== 0) continue
    const billingMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
    entries.push({
      billingMonth,
      dueDate: computeDueDate(billingMonth, billingDayOfMonth),
    })
  }
  return entries
}
