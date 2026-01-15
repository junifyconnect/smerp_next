import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

// GET /api/calendar - 캘린더 이벤트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') // personal, company, all

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate와 endDate는 필수입니다' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // 조회 조건 구성
    const whereCondition: Record<string, unknown> = {
      OR: [
        // 시작일이 범위 내
        { startDate: { gte: start, lte: end } },
        // 종료일이 범위 내
        { endDate: { gte: start, lte: end } },
        // 범위를 포함하는 이벤트
        { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
      ],
    }

    // 타입별 필터
    if (type === 'personal') {
      // 내 개인 일정만
      whereCondition.userId = session.user.id
      whereCondition.isCompanyWide = false
    } else if (type === 'company') {
      // 사내 전체 일정만
      whereCondition.isCompanyWide = true
    } else {
      // 전체 (내 일정 + 사내 전체 + 내가 참여하는 일정)
      whereCondition.OR = [
        { userId: session.user.id },
        { isCompanyWide: true },
        { participants: { some: { userId: session.user.id } } },
      ]
      // 날짜 조건은 AND로
      whereCondition.AND = [
        {
          OR: [
            { startDate: { gte: start, lte: end } },
            { endDate: { gte: start, lte: end } },
            { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
          ],
        },
      ]
      delete whereCondition.OR
      whereCondition.OR = [
        { userId: session.user.id },
        { isCompanyWide: true },
        { participants: { some: { userId: session.user.id } } },
      ]
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        AND: [
          {
            OR: [
              { startDate: { gte: start, lte: end } },
              { endDate: { gte: start, lte: end } },
              { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
            ],
          },
          type === 'personal'
            ? { userId: session.user.id, isCompanyWide: false }
            : type === 'company'
              ? { isCompanyWide: true }
              : {
                  OR: [
                    { userId: session.user.id },
                    { isCompanyWide: true },
                    { participants: { some: { userId: session.user.id } } },
                  ],
                },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, department: true },
        },
        participants: {
          include: {
            user: { select: { id: true, name: true, department: true } },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('캘린더 조회 오류:', error)
    return NextResponse.json(
      { error: '캘린더를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/calendar - 새 이벤트 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()
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

    if (!title || !startDate) {
      return NextResponse.json(
        { error: '제목과 시작일은 필수입니다' },
        { status: 400 }
      )
    }

    // 사내 전체 일정은 관리자만 생성 가능 (선택적)
    // if (isCompanyWide && !session.user.roles?.includes('ADMIN')) {
    //   return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    // }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        eventType: eventType || 'PERSONAL',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isAllDay: isAllDay || false,
        isCompanyWide: isCompanyWide || false,
        userId: isCompanyWide ? null : session.user.id,
        color,
        reminderMinutes,
        participants: participantIds?.length
          ? {
              create: participantIds.map((userId: string) => ({
                userId,
                status: 'pending',
              })),
            }
          : undefined,
      },
      include: {
        user: { select: { id: true, name: true } },
        participants: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('캘린더 이벤트 생성 오류:', error)
    return NextResponse.json(
      { error: '이벤트 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
