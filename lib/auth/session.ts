import { cookies } from 'next/headers'
import prisma from '@/lib/db/prisma'

export type SessionUser = {
  id: string
  email: string
  name: string
  department: string | null
  roles: string[]
}

// 세션에서 현재 사용자 가져오기
export async function getCurrentUser(): Promise<SessionUser | null> {
  // TODO: 실제 세션/JWT 구현
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value
  
  if (!sessionToken) return null
  
  // TODO: 토큰 검증 및 사용자 조회
  return null
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
