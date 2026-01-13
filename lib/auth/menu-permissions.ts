import { PermissionLevel } from '@prisma/client'

// 메뉴 타입 정의
export const MENUS = [
  'SALES_QUOTE',
  'SALES_APPROVAL',
  'SALES_ORDER',
  'MA_QUOTE',
  'MA_APPROVAL',
  'CLOUD',
  'USER_MANAGEMENT',
] as const

export type Menu = (typeof MENUS)[number]

// 메뉴 그룹 정의
export const MENU_GROUPS = {
  SALES: ['SALES_QUOTE', 'SALES_APPROVAL', 'SALES_ORDER'] as Menu[],
  MA: ['MA_QUOTE', 'MA_APPROVAL'] as Menu[],
  ADMIN: ['USER_MANAGEMENT', 'CLOUD'] as Menu[],
} as const

export type MenuGroup = keyof typeof MENU_GROUPS

// 메뉴 라벨 (UI용)
export const MENU_LABELS: Record<Menu, string> = {
  SALES_QUOTE: '영업 견적서',
  SALES_APPROVAL: '영업 품의서',
  SALES_ORDER: '영업 발주서',
  MA_QUOTE: 'MA 견적서',
  MA_APPROVAL: 'MA 품의서',
  CLOUD: '클라우드 스토리지',
  USER_MANAGEMENT: '사용자 관리',
}

export const MENU_GROUP_LABELS: Record<MenuGroup, string> = {
  SALES: '영업',
  MA: 'MA',
  ADMIN: '관리',
}

// 특수 Role (메뉴 권한 bypass)
export const BYPASS_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const

// 사용자 메뉴 권한 타입
export interface UserMenuPermission {
  menu: Menu
  level: PermissionLevel
}

// 세션 사용자 타입 (권한 체크용)
export interface MenuPermissionUser {
  id: string
  roles: string[]
  menuPermissions?: UserMenuPermission[]
}

/**
 * 메뉴 접근 권한 체크
 * @param user 사용자 정보
 * @param menu 체크할 메뉴
 * @param requiredLevel 필요한 권한 레벨 (READ 또는 FULL)
 */
export function canAccessMenu(
  user: MenuPermissionUser | null,
  menu: Menu,
  requiredLevel: 'READ' | 'FULL' = 'READ'
): boolean {
  if (!user) return false

  // SUPER_ADMIN, ADMIN은 무조건 통과
  if (user.roles.some((role) => BYPASS_ROLES.includes(role as (typeof BYPASS_ROLES)[number]))) {
    return true
  }

  // 메뉴 권한 확인
  const permission = user.menuPermissions?.find((p) => p.menu === menu)

  if (!permission || permission.level === 'NONE') {
    return false
  }

  if (requiredLevel === 'READ') {
    return permission.level === 'READ' || permission.level === 'FULL'
  }

  if (requiredLevel === 'FULL') {
    return permission.level === 'FULL'
  }

  return false
}

/**
 * 사용자의 접근 가능한 메뉴 목록 반환
 */
export function getAccessibleMenus(user: MenuPermissionUser | null): Menu[] {
  if (!user) return []

  // SUPER_ADMIN, ADMIN은 모든 메뉴 접근 가능
  if (user.roles.some((role) => BYPASS_ROLES.includes(role as (typeof BYPASS_ROLES)[number]))) {
    return [...MENUS]
  }

  return (
    user.menuPermissions
      ?.filter((p) => p.level !== 'NONE')
      .map((p) => p.menu) || []
  )
}

/**
 * 메뉴 그룹의 모든 메뉴에 동일한 권한 적용을 위한 헬퍼
 */
export function getMenusInGroup(group: MenuGroup): Menu[] {
  return MENU_GROUPS[group]
}

/**
 * HTTP 메서드에 따른 필요 권한 레벨 결정
 */
export function getRequiredLevelForMethod(
  method: string
): 'READ' | 'FULL' {
  const readMethods = ['GET', 'HEAD', 'OPTIONS']
  return readMethods.includes(method.toUpperCase()) ? 'READ' : 'FULL'
}

/**
 * API 경로에서 메뉴 추출
 */
export function getMenuFromPath(pathname: string): Menu | null {
  if (pathname.includes('/sales-quotes')) return 'SALES_QUOTE'
  if (pathname.includes('/sales-approvals')) return 'SALES_APPROVAL'
  if (pathname.includes('/sales-orders')) return 'SALES_ORDER'
  if (pathname.includes('/ma-quotes')) return 'MA_QUOTE'
  if (pathname.includes('/ma-approvals')) return 'MA_APPROVAL'
  if (pathname.includes('/cloud')) return 'CLOUD'
  if (pathname.includes('/users')) return 'USER_MANAGEMENT'
  return null
}
