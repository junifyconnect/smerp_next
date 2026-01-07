import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
// TODO: DB 준비 후 Prisma 사용
// import prisma from '@/lib/db'
// import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// 더미 사용자 정보
const DUMMY_USER = {
  id: 'dummy-user-id',
  email: 'kkakkuro0@naver.com',
  password: '09k09k',
  name: '홍길동',
  department: 'SALES',
  position: '팀장',
  roles: ['ADMIN', 'SALES_MANAGER'],
}

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

    // 더미 사용자 체크
    if (email === DUMMY_USER.email && password === DUMMY_USER.password) {
      // JWT 토큰 생성
      const token = jwt.sign(
        {
          id: DUMMY_USER.id,
          email: DUMMY_USER.email,
          name: DUMMY_USER.name,
          department: DUMMY_USER.department,
          roles: DUMMY_USER.roles,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      // 응답
      const response = NextResponse.json({
        user: {
          id: DUMMY_USER.id,
          email: DUMMY_USER.email,
          name: DUMMY_USER.name,
          department: DUMMY_USER.department,
          position: DUMMY_USER.position,
          roles: DUMMY_USER.roles,
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
    }

    // TODO: DB 준비 후 실제 사용자 조회 로직 추가
    // 현재는 더미 사용자만 지원
    return NextResponse.json(
      { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
      { status: 401 }
    )
  } catch (error) {
    console.error('로그인 오류:', error)
    return NextResponse.json(
      { error: '로그인에 실패했습니다' },
      { status: 500 }
    )
  }
}
