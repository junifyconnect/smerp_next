import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
// TODO: DB 준비 후 Prisma 사용
// import prisma from '@/lib/db/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// 더미 사용자 정보
const DUMMY_USER = {
  id: 'dummy-user-id',
  email: 'kkakkuro0@naver.com',
  name: '홍길동',
  department: 'SALES',
  roles: ['ADMIN', 'SALES_MANAGER'],
}

export type SessionUser = {
  id: string
  email: string
  name: string
  department: string | null
  roles: string[]
}

// 세션에서 현재 사용자 가져오기
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return null
    }

    // JWT 토큰 검증
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string
      email: string
      name: string
      department: string | null
      roles: string[]
    }

    // 더미 사용자 체크
    if (decoded.id === DUMMY_USER.id) {
      return {
        id: DUMMY_USER.id,
        email: DUMMY_USER.email,
        name: DUMMY_USER.name,
        department: DUMMY_USER.department,
        roles: DUMMY_USER.roles,
      }
    }

    // TODO: DB 준비 후 실제 사용자 조회 로직 추가
    // 현재는 더미 사용자만 지원
    return null
  } catch (error) {
    // 토큰 검증 실패
    return null
  }
}

// 권한 체크 헬퍼
export function hasRole(user: SessionUser | null, roles: string[]): boolean {
  if (!user) return false
  return user.roles.some(role => roles.includes(role))
}

export function hasAnyRole(user: SessionUser | null, roles: string[]): boolean {
  return hasRole(user, roles)
}

// 부서 체크
export function isDepartment(user: SessionUser | null, dept: string): boolean {
  if (!user) return false
  return user.department === dept
}

// 관리자 체크
export function isAdmin(user: SessionUser | null): boolean {
  return hasRole(user, ['ADMIN'])
}

// 매니저 이상 체크
export function isManager(user: SessionUser | null): boolean {
  return hasRole(user, ['ADMIN', 'SALES_MANAGER', 'MA_MANAGER'])
}
