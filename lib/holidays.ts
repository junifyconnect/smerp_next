/**
 * 한국 공휴일 관리
 *
 * 매년 초에 updateYearlyHolidays()를 실행하여 공휴일을 캘린더에 등록합니다.
 * 대체공휴일은 확정 후 수동으로 추가하거나 여기서 관리합니다.
 */

import prisma from '@/lib/db'

interface Holiday {
  name: string
  date: string // YYYY-MM-DD 형식
}

/**
 * 연도별 고정 공휴일 (양력)
 */
function getFixedHolidays(year: number): Holiday[] {
  return [
    { name: '신정', date: `${year}-01-01` },
    { name: '삼일절', date: `${year}-03-01` },
    { name: '어린이날', date: `${year}-05-05` },
    { name: '현충일', date: `${year}-06-06` },
    { name: '광복절', date: `${year}-08-15` },
    { name: '개천절', date: `${year}-10-03` },
    { name: '한글날', date: `${year}-10-09` },
    { name: '크리스마스', date: `${year}-12-25` },
  ]
}

/**
 * 연도별 음력 공휴일 (매년 날짜 다름)
 * 실제 운영 시 매년 업데이트 필요
 */
function getLunarHolidays(year: number): Holiday[] {
  const lunarHolidaysByYear: Record<number, Holiday[]> = {
    2025: [
      { name: '설날 연휴', date: '2025-01-28' },
      { name: '설날', date: '2025-01-29' },
      { name: '설날 연휴', date: '2025-01-30' },
      { name: '부처님오신날', date: '2025-05-05' }, // 어린이날과 겹침
      { name: '추석 연휴', date: '2025-10-05' },
      { name: '추석', date: '2025-10-06' },
      { name: '추석 연휴', date: '2025-10-07' },
    ],
    2026: [
      { name: '설날 연휴', date: '2026-02-16' },
      { name: '설날', date: '2026-02-17' },
      { name: '설날 연휴', date: '2026-02-18' },
      { name: '부처님오신날', date: '2026-05-24' },
      { name: '추석 연휴', date: '2026-09-24' },
      { name: '추석', date: '2026-09-25' },
      { name: '추석 연휴', date: '2026-09-26' },
    ],
    2027: [
      { name: '설날 연휴', date: '2027-02-05' },
      { name: '설날', date: '2027-02-06' },
      { name: '설날 연휴', date: '2027-02-07' },
      { name: '부처님오신날', date: '2027-05-13' },
      { name: '추석 연휴', date: '2027-09-14' },
      { name: '추석', date: '2027-09-15' },
      { name: '추석 연휴', date: '2027-09-16' },
    ],
  }

  return lunarHolidaysByYear[year] || []
}

/**
 * 대체공휴일 (확정 시 추가)
 */
function getSubstituteHolidays(year: number): Holiday[] {
  const substituteHolidaysByYear: Record<number, Holiday[]> = {
    2025: [
      // 2025년 대체공휴일 예시 (확정 시 추가)
    ],
    2026: [],
    2027: [],
  }

  return substituteHolidaysByYear[year] || []
}

/**
 * 특정 연도의 모든 공휴일 가져오기
 */
export function getAllHolidays(year: number): Holiday[] {
  return [
    ...getFixedHolidays(year),
    ...getLunarHolidays(year),
    ...getSubstituteHolidays(year),
  ].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 특정 연도의 공휴일을 캘린더 DB에 등록
 */
export async function registerHolidaysToCalendar(year: number) {
  const holidays = getAllHolidays(year)

  console.log(`[Holiday] ${year}년 공휴일 ${holidays.length}개 등록 시작`)

  let created = 0
  let skipped = 0

  for (const holiday of holidays) {
    // 이미 등록된 공휴일인지 확인
    const existing = await prisma.calendarEvent.findFirst({
      where: {
        title: holiday.name,
        startDate: new Date(holiday.date),
        eventType: 'HOLIDAY',
        isCompanyWide: true,
      },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.calendarEvent.create({
      data: {
        title: holiday.name,
        eventType: 'HOLIDAY',
        startDate: new Date(holiday.date),
        endDate: new Date(holiday.date),
        isAllDay: true,
        isCompanyWide: true,
        color: '#F97316', // 주황색
      },
    })
    created++
  }

  console.log(`[Holiday] 등록 완료: 신규 ${created}개, 중복 ${skipped}개`)

  return { created, skipped, total: holidays.length }
}

/**
 * 특정 날짜가 공휴일인지 확인
 */
export function isHoliday(date: Date, year?: number): boolean {
  const y = year || date.getFullYear()
  const holidays = getAllHolidays(y)
  const dateStr = date.toISOString().split('T')[0]

  return holidays.some((h) => h.date === dateStr)
}

/**
 * 특정 날짜의 공휴일 이름 가져오기
 */
export function getHolidayName(date: Date): string | null {
  const holidays = getAllHolidays(date.getFullYear())
  const dateStr = date.toISOString().split('T')[0]

  const holiday = holidays.find((h) => h.date === dateStr)
  return holiday?.name || null
}
