import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// GET /api/auth/me - 현재 사용자 정보
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 토큰 검증
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string
      email: string
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      position: user.position,
      roles: user.roles.map((r) => r.role.name),
    })
  } catch (error) {
    console.error('인증 확인 오류:', error)
    return NextResponse.json(
      { error: '인증에 실패했습니다' },
      { status: 401 }
    )
  }
}
