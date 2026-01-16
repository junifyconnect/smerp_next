import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/customers/[id]/contacts - 담당자 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contacts = await prisma.customerContact.findMany({
      where: {
        customerId: id,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('담당자 조회 실패:', error)
    return NextResponse.json(
      { error: '담당자 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/customers/[id]/contacts - 담당자 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // 기본 담당자로 설정하려면 기존 기본 담당자 해제
    if (body.isDefault) {
      await prisma.customerContact.updateMany({
        where: { customerId: id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const contact = await prisma.customerContact.create({
      data: {
        customerId: id,
        name: body.name,
        department: body.department,
        position: body.position,
        phone: body.phone,
        mobile: body.mobile,
        email: body.email,
        isDefault: body.isDefault || false,
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error('담당자 추가 실패:', error)
    return NextResponse.json(
      { error: '담당자 추가에 실패했습니다' },
      { status: 500 }
    )
  }
}
