import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/users/[id]/leave - 휴가 부여
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { type, amount, reason } = body

    // 필수 파라미터 검증
    if (!type || !amount) {
      return NextResponse.json(
        { error: '휴가 종류와 일수는 필수입니다' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: '부여 일수는 0보다 커야 합니다' },
        { status: 400 }
      )
    }

    // 대상 사용자 확인
    const user = await prisma.user.findUnique({
      where: { id },
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

    // 휴가 부여
    const updateData: { annualLeave?: { increment: number }; additionalLeave?: { increment: number } } = {}

    if (type === 'annual') {
      updateData.annualLeave = { increment: amount }
    } else if (type === 'additional') {
      updateData.additionalLeave = { increment: amount }
    } else {
      return NextResponse.json(
        { error: '유효하지 않은 휴가 종류입니다' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        annualLeave: true,
        additionalLeave: true,
      },
    })

    // 로그 기록 (선택적)
    console.log(
      `[휴가 부여] ${session.user.name || session.user.email}님이 ${user.name}님에게 ${
        type === 'annual' ? '연차' : '추가휴가'
      } ${amount}일 부여 (사유: ${reason || '없음'})`
    )

    return NextResponse.json({
      message: '휴가가 부여되었습니다',
      user: updatedUser,
    })
  } catch (error) {
    console.error('휴가 부여 오류:', error)
    return NextResponse.json(
      { error: '휴가 부여에 실패했습니다' },
      { status: 500 }
    )
  }
}
