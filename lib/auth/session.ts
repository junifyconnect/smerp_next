import { auth } from '@/lib/auth'

export type SessionUser = {
  id: string
  email: string
  name: string
  department: string | null
  roles: string[]
}

// 세션에서 현재 사용자 가져오기 (NextAuth 사용)
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const session = await auth()

    if (!session?.user) {
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.name || '',
      department: session.user.department || null,
      roles: session.user.roles || [],
    }
  } catch (error) {
    console.error('[getCurrentUser] Error:', error)
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
