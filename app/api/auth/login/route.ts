import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요' },
        { status: 400 }
      )
    }

    // 사용자 조회 (Role, 메뉴 권한 포함)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        menuPermissions: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      )
    }

    // 비활성화된 사용자 체크
    if (!user.isActive) {
      return NextResponse.json(
        { error: '비활성화된 계정입니다. 관리자에게 문의하세요' },
        { status: 401 }
      )
    }

    // 비밀번호 검증
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: '비밀번호가 설정되지 않은 계정입니다' },
        { status: 401 }
      )
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
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

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        roles,
        menuPermissions,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // 응답
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        department: user.department,
        position: user.position,
        signatureUrl: user.signatureUrl,
        roles,
        menuPermissions,
      },
      token,
    })

    // 쿠키 설정
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
    })

    return response
  } catch (error) {
    console.error('로그인 오류:', error)
    return NextResponse.json(
      { error: '로그인에 실패했습니다' },
      { status: 500 }
    )
  }
}
