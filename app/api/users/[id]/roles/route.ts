import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/users/[id]/roles - 사용자 Role 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 사용 가능한 모든 Role 목록도 함께 반환
    const allRoles = await prisma.role.findMany({
      orderBy: { id: 'asc' },
    })

    return NextResponse.json({
      userId: user.id,
      userName: user.name,
      assignedRoles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      availableRoles: allRoles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
      })),
    })
  } catch (error) {
    console.error('Role 조회 오류:', error)
    return NextResponse.json(
      { error: 'Role 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/users/[id]/roles - Role 부여
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { roleId, roleName } = body as { roleId?: number; roleName?: string }

    if (!roleId && !roleName) {
      return NextResponse.json(
        { error: 'roleId 또는 roleName이 필요합니다' },
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

    // Role 조회
    const role = await prisma.role.findFirst({
      where: roleId ? { id: roleId } : { name: roleName },
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Role을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 이미 부여된 Role인지 확인
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: id,
          roleId: role.id,
        },
      },
    })

    if (existingUserRole) {
      return NextResponse.json(
        { error: '이미 부여된 Role입니다' },
        { status: 400 }
      )
    }

    // Role 부여
    await prisma.userRole.create({
      data: {
        userId: id,
        roleId: role.id,
      },
    })

    // 업데이트된 Role 목록 조회
    const updatedRoles = await prisma.userRole.findMany({
      where: { userId: id },
      include: { role: true },
    })

    return NextResponse.json({
      message: 'Role이 부여되었습니다',
      userId: id,
      assignedRoles: updatedRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
    })
  } catch (error) {
    console.error('Role 부여 오류:', error)
    return NextResponse.json(
      { error: 'Role 부여에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id]/roles - Role 제거
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('roleId')
    const roleName = searchParams.get('roleName')

    if (!roleId && !roleName) {
      return NextResponse.json(
        { error: 'roleId 또는 roleName 쿼리 파라미터가 필요합니다' },
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

    // Role 조회
    const role = await prisma.role.findFirst({
      where: roleId ? { id: parseInt(roleId) } : { name: roleName! },
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Role을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // UserRole 삭제
    await prisma.userRole.deleteMany({
      where: {
        userId: id,
        roleId: role.id,
      },
    })

    // 업데이트된 Role 목록 조회
    const updatedRoles = await prisma.userRole.findMany({
      where: { userId: id },
      include: { role: true },
    })

    return NextResponse.json({
      message: 'Role이 제거되었습니다',
      userId: id,
      assignedRoles: updatedRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
    })
  } catch (error) {
    console.error('Role 제거 오류:', error)
    return NextResponse.json(
      { error: 'Role 제거에 실패했습니다' },
      { status: 500 }
    )
  }
}
