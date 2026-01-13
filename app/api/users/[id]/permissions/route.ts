import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { MENUS } from '@/lib/auth/menu-permissions'
import { PermissionLevel } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/users/[id]/permissions - 메뉴 권한 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        roles: {
          include: { role: true },
        },
        menuPermissions: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 모든 메뉴에 대해 권한 맵 생성 (설정 안된 메뉴는 NONE)
    const permissionMap: Record<string, PermissionLevel> = {}
    MENUS.forEach((menu) => {
      permissionMap[menu] = 'NONE'
    })

    // DB에 저장된 권한으로 덮어쓰기
    user.menuPermissions.forEach((p) => {
      permissionMap[p.menu] = p.level
    })

    return NextResponse.json({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      roles: user.roles.map((ur) => ur.role.name),
      permissions: permissionMap,
    })
  } catch (error) {
    console.error('메뉴 권한 조회 오류:', error)
    return NextResponse.json(
      { error: '메뉴 권한 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id]/permissions - 메뉴 권한 일괄 설정
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { permissions } = body as {
      permissions: Record<string, PermissionLevel>
    }

    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json(
        { error: 'permissions 객체가 필요합니다' },
        { status: 400 }
      )
    }

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 유효한 메뉴만 필터링
    const validPermissions = Object.entries(permissions).filter(
      ([menu, level]) =>
        MENUS.includes(menu as (typeof MENUS)[number]) &&
        ['NONE', 'READ', 'FULL'].includes(level)
    )

    // 트랜잭션으로 일괄 업데이트 (upsert)
    await prisma.$transaction(
      validPermissions.map(([menu, level]) =>
        prisma.userMenuPermission.upsert({
          where: {
            userId_menu: {
              userId: id,
              menu,
            },
          },
          update: { level },
          create: {
            userId: id,
            menu,
            level,
          },
        })
      )
    )

    // 업데이트된 권한 조회
    const updatedPermissions = await prisma.userMenuPermission.findMany({
      where: { userId: id },
    })

    const permissionMap: Record<string, PermissionLevel> = {}
    MENUS.forEach((menu) => {
      permissionMap[menu] = 'NONE'
    })
    updatedPermissions.forEach((p) => {
      permissionMap[p.menu] = p.level
    })

    return NextResponse.json({
      message: '메뉴 권한이 설정되었습니다',
      userId: id,
      permissions: permissionMap,
    })
  } catch (error) {
    console.error('메뉴 권한 설정 오류:', error)
    return NextResponse.json(
      { error: '메뉴 권한 설정에 실패했습니다' },
      { status: 500 }
    )
  }
}
