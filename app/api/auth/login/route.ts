import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
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
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      )
    }

    // 비밀번호 확인
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      )
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        department: user.department,
        roles: user.roles.map((r) => r.role.name),
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
        department: user.department,
        position: user.position,
        roles: user.roles.map((r) => r.role.name),
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
