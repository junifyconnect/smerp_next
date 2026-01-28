import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

// GET /api/auth/me - 현재 사용자 정보 (NextAuth 세션 기반)
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // DB에서 사용자 조회 (최신 정보)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        menuPermissions: true,
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 401 }
      )
    }

    // Role 이름 배열로 변환
    const roles = user.roles.map((ur) => ur.role.name)

    // 메뉴 권한 변환
    const menuPermissions = user.menuPermissions.map((mp) => ({
      menu: mp.menu,
      level: mp.level,
    }))

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      department: user.department,
      position: user.position,
      signatureUrl: user.signatureUrl,
      roles,
      menuPermissions,
    })
  } catch (error) {
    console.error('인증 확인 오류:', error)
    return NextResponse.json(
      { error: '인증에 실패했습니다' },
      { status: 500 }
    )
  }
}
