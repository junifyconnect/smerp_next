import { SessionUser } from './session'

export type DocType = 'SALES_QUOTE' | 'SALES_APPROVAL' | 'SALES_ORDER' | 'MA_QUOTE' | 'MA_APPROVAL'

type Permission = 'create' | 'read' | 'update' | 'delete' | 'approve'

// 문서 타입별 권한 매트릭스
const permissionMatrix: Record<DocType, Record<Permission, string[]>> = {
  SALES_QUOTE: {
    create: ['ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    read: ['ADMIN', 'SALES_MANAGER', 'SALES_STAFF', 'FINANCE'],
    update: ['ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    delete: ['ADMIN', 'SALES_MANAGER'],
    approve: [],
  },
  SALES_APPROVAL: {
    create: ['ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    read: ['ADMIN', 'SALES_MANAGER', 'SALES_STAFF', 'FINANCE'],
    update: ['ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    delete: ['ADMIN', 'SALES_MANAGER'],
    approve: ['ADMIN', 'SALES_MANAGER'],
  },
  SALES_ORDER: {
    create: ['ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    read: ['ADMIN', 'SALES_MANAGER', 'SALES_STAFF', 'FINANCE'],
    update: ['ADMIN', 'SALES_MANAGER', 'SALES_STAFF'],
    delete: ['ADMIN', 'SALES_MANAGER'],
    approve: ['ADMIN', 'SALES_MANAGER'],
  },
  MA_QUOTE: {
    create: ['ADMIN', 'MA_MANAGER', 'MA_STAFF'],
    read: ['ADMIN', 'MA_MANAGER', 'MA_STAFF', 'FINANCE'],
    update: ['ADMIN', 'MA_MANAGER', 'MA_STAFF'],
    delete: ['ADMIN', 'MA_MANAGER'],
    approve: [],
  },
  MA_APPROVAL: {
    create: ['ADMIN', 'MA_MANAGER', 'MA_STAFF'],
    read: ['ADMIN', 'MA_MANAGER', 'MA_STAFF', 'FINANCE'],
    update: ['ADMIN', 'MA_MANAGER', 'MA_STAFF'],
    delete: ['ADMIN', 'MA_MANAGER'],
    approve: ['ADMIN', 'MA_MANAGER'],
  },
}

// 권한 체크
export function canAccess(
  user: SessionUser | null,
  docType: DocType,
  permission: Permission
): boolean {
  if (!user) return false
  
  const allowedRoles = permissionMatrix[docType]?.[permission] ?? []
  return user.roles.some(role => allowedRoles.includes(role))
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
