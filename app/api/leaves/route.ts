import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

// 휴가 유형별 연차 차감 여부
const DEDUCT_FROM_ANNUAL: Record<string, boolean> = {
  ANNUAL: true,
  HALF_AM: true,
  HALF_PM: true,
  SICK: false,     // 병가는 연차 미차감
  FAMILY: false,   // 경조사는 연차 미차감
  OFFICIAL: false, // 공가는 연차 미차감
  OTHER: false,
}

// 휴가 유형별 사용 일수
const LEAVE_DAYS: Record<string, number> = {
  ANNUAL: 1,
  HALF_AM: 0.5,
  HALF_PM: 0.5,
  SICK: 1,
  FAMILY: 1,
  OFFICIAL: 1,
  OTHER: 1,
}

// GET /api/leaves - 휴가 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const userId = searchParams.get('userId') // 특정 사용자 필터
    const year = searchParams.get('year') // 연도 필터
    const status = searchParams.get('status')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // 특정 사용자 필터 또는 본인 것만
    if (userId) {
      where.userId = userId
    }

    // 연도 필터
    if (year) {
      const startOfYear = new Date(`${year}-01-01`)
      const endOfYear = new Date(`${year}-12-31`)
      where.startDate = {
        gte: startOfYear,
        lte: endOfYear,
      }
    }

    if (status) {
      where.status = status
    }

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              position: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ])

    return NextResponse.json({
      items: leaves,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    })
  } catch (error) {
    console.error('휴가 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '휴가 목록 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/leaves - 휴가 신청 (자동 승인)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, leaveType, startDate, endDate, reason } = body

    // 신청 대상 사용자 (관리자가 다른 사용자 대신 신청 가능)
    const targetUserId = userId || session.user.id

    // 필수 필드 검증
    if (!leaveType || !startDate) {
      return NextResponse.json(
        { error: '휴가 유형과 시작일은 필수입니다' },
        { status: 400 }
      )
    }

    // 사용자 조회 (잔여 연차 확인)
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        annualLeave: true,
        additionalLeave: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 휴가 일수 계산
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : start

    let days = LEAVE_DAYS[leaveType] || 1

    // 연차인 경우 날짜 차이로 계산
    if (leaveType === 'ANNUAL' && endDate) {
      const diffTime = Math.abs(end.getTime() - start.getTime())
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    }

    // 연차 차감 여부
    const deductFromAnnual = DEDUCT_FROM_ANNUAL[leaveType] ?? false

    // 연차 차감이 필요한 경우 잔여 연차 확인
    if (deductFromAnnual) {
      const totalAvailable = (user.annualLeave || 0) + (user.additionalLeave || 0)
      if (days > totalAvailable) {
        return NextResponse.json(
          { error: `잔여 연차가 부족합니다. (잔여: ${totalAvailable}일, 신청: ${days}일)` },
          { status: 400 }
        )
      }
    }

    // 트랜잭션으로 휴가 생성 + 연차 차감
    const leave = await prisma.$transaction(async (tx) => {
      // 1. 휴가 신청 생성
      const newLeave = await tx.leaveRequest.create({
        data: {
          userId: targetUserId,
          leaveType: leaveType as 'ANNUAL' | 'HALF_AM' | 'HALF_PM' | 'SICK' | 'FAMILY' | 'OFFICIAL' | 'OTHER',
          startDate: start,
          endDate: end,
          days,
          reason: reason || null,
          status: 'APPROVED',
          deductFromAnnual,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      // 2. 연차 차감 (연차 차감이 필요한 경우)
      if (deductFromAnnual) {
        // 추가휴가부터 차감, 그 다음 연차 차감
        let remainingToDeduct = days
        let newAdditionalLeave = user.additionalLeave || 0
        let newAnnualLeave = user.annualLeave || 0

        if (newAdditionalLeave >= remainingToDeduct) {
          newAdditionalLeave -= remainingToDeduct
        } else {
          remainingToDeduct -= newAdditionalLeave
          newAdditionalLeave = 0
          newAnnualLeave -= remainingToDeduct
        }

        await tx.user.update({
          where: { id: targetUserId },
          data: {
            annualLeave: newAnnualLeave,
            additionalLeave: newAdditionalLeave,
          },
        })
      }

      // 3. 캘린더에 일정 추가
      await tx.calendarEvent.create({
        data: {
          title: `[휴가] ${user.name}`,
          description: reason || `${getLeaveTypeName(leaveType)} 사용`,
          eventType: 'HOLIDAY',
          startDate: start,
          endDate: end,
          isAllDay: true,
          isCompanyWide: true,
          userId: targetUserId,
          relatedId: newLeave.id,
          relatedType: 'LeaveRequest',
          color: '#F97316', // 주황색
        },
      })

      return newLeave
    })

    return NextResponse.json(leave, { status: 201 })
  } catch (error) {
    console.error('휴가 신청 오류:', error)
    return NextResponse.json(
      { error: '휴가 신청에 실패했습니다' },
      { status: 500 }
    )
  }
}

function getLeaveTypeName(type: string): string {
  const names: Record<string, string> = {
    ANNUAL: '연차',
    HALF_AM: '오전 반차',
    HALF_PM: '오후 반차',
    SICK: '병가',
    FAMILY: '경조사',
    OFFICIAL: '공가',
    OTHER: '기타',
  }
  return names[type] || type
}
