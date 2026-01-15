import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

// GET /api/notifications - 내 알림 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const where = {
      userId: session.user.id,
      ...(unreadOnly && { isRead: false }),
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
        },
      }),
    ])

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('알림 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '알림 목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - 알림 생성 (시스템/관리자용)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const body = await request.json()
    const {
      userId,
      type,
      title,
      message,
      linkUrl,
      linkType,
      relatedId,
      relatedType,
    } = body

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        linkUrl,
        linkType,
        relatedId,
        relatedType,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('알림 생성 오류:', error)
    return NextResponse.json(
      { error: '알림 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
