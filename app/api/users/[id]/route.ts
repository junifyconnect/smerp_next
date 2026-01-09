import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/users/[id] - 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        department: true,
        position: true,
        signatureUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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

    return NextResponse.json(user)
  } catch (error) {
    console.error('사용자 조회 오류:', error)
    return NextResponse.json(
      { error: '사용자 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[id] - 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, phone, department, position, password, isActive } = body

    // 사용자 존재 확인
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone || null
    if (department !== undefined) updateData.department = department || null
    if (position !== undefined) updateData.position = position || null
    if (isActive !== undefined) updateData.isActive = isActive

    // 비밀번호 변경
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: '비밀번호는 6자 이상이어야 합니다' },
          { status: 400 }
        )
      }
      updateData.passwordHash = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        department: true,
        position: true,
        signatureUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('사용자 수정 오류:', error)
    return NextResponse.json(
      { error: '사용자 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 사용자 존재 확인
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 시스템 사용자 삭제 방지
    if (existingUser.email === 'system@smerp.local') {
      return NextResponse.json(
        { error: '시스템 사용자는 삭제할 수 없습니다' },
        { status: 400 }
      )
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ message: '삭제되었습니다' })
  } catch (error) {
    console.error('사용자 삭제 오류:', error)
    return NextResponse.json(
      { error: '사용자 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
