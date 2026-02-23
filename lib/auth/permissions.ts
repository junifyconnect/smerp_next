import { SessionUser } from './session'

export type DocType = 'SALES_QUOTE' | 'SALES_APPROVAL' | 'SALES_ORDER' | 'MA_QUOTE' | 'MA_APPROVAL'

type Permission = 'create' | 'read' | 'update' | 'delete' | 'approve'

// 특수 Role - 모든 권한 bypass
export const SUPER_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const

// 서명 권한용 Role 매트릭스 (품의서 결재 단계에서 사용)
export const SIGN_ROLES = {
  SALES_MANAGER: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'],
  TEAM_LEADER: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER'],
  CEO: ['SUPER_ADMIN', 'ADMIN', 'CEO'],
} as const

// 문서 타입별 권한 매트릭스 (레거시 - 하위 호환용)
const permissionMatrix: Record<DocType, Record<Permission, string[]>> = {
  SALES_QUOTE: {
    create: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    read: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF', 'FINANCE'],
    update: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    delete: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'],
    approve: [],
  },
  SALES_APPROVAL: {
    create: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    read: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF', 'FINANCE'],
    update: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    delete: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'],
    approve: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'],
  },
  SALES_ORDER: {
    create: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    read: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF', 'FINANCE'],
    update: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    delete: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'],
    approve: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'],
  },
  MA_QUOTE: {
    create: ['SUPER_ADMIN', 'ADMIN', 'MA_MANAGER', 'MA_STAFF'],
    read: ['SUPER_ADMIN', 'ADMIN', 'MA_MANAGER', 'MA_STAFF', 'FINANCE'],
    update: ['SUPER_ADMIN', 'ADMIN', 'MA_MANAGER', 'MA_STAFF'],
    delete: ['SUPER_ADMIN', 'ADMIN', 'MA_MANAGER'],
    approve: [],
  },
  MA_APPROVAL: {
    create: ['SUPER_ADMIN', 'ADMIN', 'MA_MANAGER', 'MA_STAFF'],
    read: ['SUPER_ADMIN', 'ADMIN', 'MA_MANAGER', 'MA_STAFF', 'FINANCE'],
    update: ['SUPER_ADMIN', 'ADMIN', 'MA_MANAGER', 'MA_STAFF'],
    delete: ['SUPER_ADMIN', 'ADMIN', 'MA_MANAGER'],
    approve: ['SUPER_ADMIN', 'ADMIN', 'MA_MANAGER'],
  },
}

/**
 * SUPER_ADMIN 또는 ADMIN Role 체크ㅁㄴㅇㅁㄴㅇ
 */
export function isSuperRole(user: SessionUser | null): boolean {
  if (!user) return false
  return user.roles.some((role) =>
    SUPER_ROLES.includes(role as (typeof SUPER_ROLES)[number])
  )
}

/**
 * 서명 권한 체크 (품의서 결재용)
 */
export function canSign(
  user: SessionUser | null,
  signRole: keyof typeof SIGN_ROLES
): boolean {
  if (!user) return false
  return user.roles.some((role) => (SIGN_ROLES[signRole] as readonly string[]).includes(role))
}

// 권한 체크 (레거시 - 하위 호환)
export function canAccess(
  user: SessionUser | null,
  docType: DocType,
  permission: Permission
): boolean {
  if (!user) return false

  const allowedRoles = permissionMatrix[docType]?.[permission] ?? []
  return user.roles.some((role) => allowedRoles.includes(role))
}

// 작성자 또는 권한 체크
export function canAccessOrOwner(
  user: SessionUser | null,
  docType: DocType,
  permission: Permission,
  createdById: string
): boolean {
  if (!user) return false
  if (user.id === createdById) return true
  return canAccess(user, docType, permission)
}

// API 라우트용 권한 체크 (에러 throw)
export function requirePermission(
  user: SessionUser | null,
  docType: DocType,
  permission: Permission
): void {
  if (!canAccess(user, docType, permission)) {
    throw new Error('권한이 없습니다.')
  }
}
