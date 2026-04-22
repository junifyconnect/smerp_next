import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/customers/[id] - 거래처 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: '거래처를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('거래처 조회 실패:', error)
    return NextResponse.json(
      { error: '거래처 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/customers/[id] - 거래처 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone,
        fax: body.fax,
        address: body.address,
        notes: body.notes,
      },
      include: {
        contacts: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        },
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error('거래처 수정 실패:', error)
    return NextResponse.json(
      { error: '거래처 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - 거래처 삭제 (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('거래처 삭제 실패:', error)
    return NextResponse.json(
      { error: '거래처 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
