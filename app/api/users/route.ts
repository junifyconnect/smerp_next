import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'

// GET /api/users - 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const department = searchParams.get('department')
    const search = searchParams.get('search')
    const isActiveParam = searchParams.get('isActive')
    const role = searchParams.get('role')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (department) {
      where.department = department
    }

    if (role) {
      where.role = role
    }

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true'
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          email: true,
          name: true,
          phone: true,
          department: true,
          position: true,
          role: true,
          annualLeave: true,
          additionalLeave: true,
          signatureUrl: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    })
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '사용자 목록 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/users - 직원 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employeeId,
      email,
      password,
      name,
      phone,
      department,
      position,
      role,
      annualLeave,
      additionalLeave,
    } = body

    // 필수 필드 검증
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '이메일, 비밀번호, 이름은 필수입니다' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '유효한 이메일 형식이 아닙니다' },
        { status: 400 }
      )
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 6자 이상이어야 합니다' },
        { status: 400 }
      )
    }

    // 이메일 중복 확인
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: '이미 등록된 이메일입니다' },
        { status: 409 }
      )
    }

    // 사용자 ID 중복 확인
    if (employeeId) {
      const existingEmployeeId = await prisma.user.findUnique({
        where: { employeeId },
      })

      if (existingEmployeeId) {
        return NextResponse.json(
          { error: '이미 등록된 사용자 ID입니다' },
          { status: 409 }
        )
      }
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(password, 10)

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        employeeId: employeeId || null,
        email,
        passwordHash,
        name,
        phone: phone || null,
        department: department || null,
        position: position || null,
        role: role || null,
        annualLeave: annualLeave || 0,
        additionalLeave: additionalLeave || 0,
      },
      select: {
        id: true,
        employeeId: true,
        email: true,
        name: true,
        phone: true,
        department: true,
        position: true,
        role: true,
        annualLeave: true,
        additionalLeave: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('직원 등록 오류:', error)
    return NextResponse.json(
      { error: '직원 등록에 실패했습니다' },
      { status: 500 }
    )
  }
}
