import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/leaves/[id] - 휴가 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { id } = await params

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            position: true,
            annualLeave: true,
            additionalLeave: true,
          },
        },
      },
    })

    if (!leave) {
      return NextResponse.json(
        { error: '휴가 신청을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(leave)
  } catch (error) {
    console.error('휴가 조회 오류:', error)
    return NextResponse.json(
      { error: '휴가 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/leaves/[id] - 휴가 취소
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { reason } = body

    // 휴가 조회
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            annualLeave: true,
            additionalLeave: true,
          },
        },
      },
    })

    if (!leave) {
      return NextResponse.json(
        { error: '휴가 신청을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (leave.status === 'CANCELLED') {
      return NextResponse.json(
        { error: '이미 취소된 휴가입니다' },
        { status: 400 }
      )
    }

    // 이미 지난 휴가는 취소 불가
    if (new Date(leave.startDate) < new Date()) {
      return NextResponse.json(
        { error: '이미 시작된 휴가는 취소할 수 없습니다' },
        { status: 400 }
      )
    }

    // 트랜잭션으로 휴가 취소 + 연차 복구
    const updatedLeave = await prisma.$transaction(async (tx) => {
      // 1. 휴가 취소 상태로 변경
      const cancelled = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledReason: reason || null,
        },
      })

      // 2. 연차 복구 (연차 차감되었던 경우)
      if (leave.deductFromAnnual) {
        await tx.user.update({
          where: { id: leave.userId },
          data: {
            annualLeave: {
              increment: leave.days,
            },
          },
        })
      }

      // 3. 캘린더 일정 삭제
      await tx.calendarEvent.deleteMany({
        where: {
          relatedId: id,
          relatedType: 'LeaveRequest',
        },
      })

      return cancelled
    })

    return NextResponse.json({
      message: '휴가가 취소되었습니다',
      leave: updatedLeave,
    })
  } catch (error) {
    console.error('휴가 취소 오류:', error)
    return NextResponse.json(
      { error: '휴가 취소에 실패했습니다' },
      { status: 500 }
    )
  }
}
