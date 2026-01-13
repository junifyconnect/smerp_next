import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// 더미 사용자 정보
const DUMMY_USER = {
  id: 'dummy-user-id',
  email: 'kkakkuro0@naver.com',
  name: '홍길동',
  department: 'SALES',
  position: '팀장',
  roles: ['ADMIN', 'SALES_MANAGER'],
}

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
      name: string
      department: string | null
      roles: string[]
    }

    // 더미 사용자 체크
    if (decoded.id === DUMMY_USER.id) {
      return NextResponse.json({
        id: DUMMY_USER.id,
        email: DUMMY_USER.email,
        name: DUMMY_USER.name,
        department: DUMMY_USER.department,
        position: DUMMY_USER.position,
        roles: DUMMY_USER.roles,
      })
    }

    // 실제 DB에서 사용자 조회
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

    // Role 이름 배열로 변환
    const roles = user.roles.map((ur) => ur.role.name)

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      position: user.position,
      roles,
    })
  } catch (error) {
    console.error('인증 확인 오류:', error)
    return NextResponse.json(
      { error: '인증에 실패했습니다' },
      { status: 401 }
    )
  }
}
