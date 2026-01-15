import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { registerHolidaysToCalendar, getAllHolidays } from '@/lib/holidays'

// GET /api/calendar/holidays?year=2025 - 공휴일 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    const holidays = getAllHolidays(year)

    return NextResponse.json({ year, holidays })
  } catch (error) {
    console.error('공휴일 조회 오류:', error)
    return NextResponse.json(
      { error: '공휴일 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/calendar/holidays - 공휴일 DB 등록 (관리자용)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 관리자 권한 체크 (선택)
    // if (!session.user.roles?.includes('ADMIN')) {
    //   return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    // }

    const body = await request.json()
    const year = body.year || new Date().getFullYear()

    const result = await registerHolidaysToCalendar(year)

    return NextResponse.json({
      message: `${year}년 공휴일 등록 완료`,
      ...result,
    })
  } catch (error) {
    console.error('공휴일 등록 오류:', error)
    return NextResponse.json(
      { error: '공휴일 등록에 실패했습니다' },
      { status: 500 }
    )
  }
}
