import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

// GET /api/calendar/[id] - 이벤트 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { id } = await params

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, department: true } },
        participants: {
          include: { user: { select: { id: true, name: true, department: true } } },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: '이벤트를 찾을 수 없습니다' }, { status: 404 })
    }

    // 권한 체크: 사내 전체 이벤트이거나, 본인 이벤트이거나, 참여자인 경우
    const isParticipant = event.participants.some(p => p.userId === session.user.id)
    if (!event.isCompanyWide && event.userId !== session.user.id && !isParticipant) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('이벤트 조회 오류:', error)
    return NextResponse.json(
      { error: '이벤트를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/calendar/[id] - 이벤트 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // 기존 이벤트 확인
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: '이벤트를 찾을 수 없습니다' }, { status: 404 })
    }

    // 권한 체크: 본인 이벤트이거나 사내 전체 이벤트인 경우(관리자)
    if (!existingEvent.isCompanyWide && existingEvent.userId !== session.user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      isAllDay,
      isCompanyWide,
      participantIds,
      color,
      reminderMinutes,
    } = body

    // 참여자 업데이트가 있는 경우
    if (participantIds !== undefined) {
      // 기존 참여자 삭제 후 새로 추가
      await prisma.calendarEventParticipant.deleteMany({
        where: { eventId: id },
      })
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(eventType !== undefined && { eventType }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isAllDay !== undefined && { isAllDay }),
        ...(isCompanyWide !== undefined && { isCompanyWide }),
        ...(color !== undefined && { color }),
        ...(reminderMinutes !== undefined && { reminderMinutes }),
        ...(participantIds !== undefined && {
          participants: {
            create: participantIds.map((userId: string) => ({
              userId,
              status: 'pending',
            })),
          },
        }),
      },
      include: {
        user: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('이벤트 수정 오류:', error)
    return NextResponse.json(
      { error: '이벤트 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/calendar/[id] - 이벤트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { id } = await params

    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: '이벤트를 찾을 수 없습니다' }, { status: 404 })
    }

    // 권한 체크
    if (!existingEvent.isCompanyWide && existingEvent.userId !== session.user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    await prisma.calendarEvent.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('이벤트 삭제 오류:', error)
    return NextResponse.json(
      { error: '이벤트 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
