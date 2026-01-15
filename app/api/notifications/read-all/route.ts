import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

// POST /api/notifications/read-all - 모든 알림 읽음 처리
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('알림 전체 읽음 처리 오류:', error)
    return NextResponse.json(
      { error: '알림 읽음 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}
