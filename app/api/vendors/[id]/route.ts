import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// PATCH /api/vendors/[id] - 매입처 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.contactName !== undefined && { contactName: body.contactName }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })

    return NextResponse.json(vendor)
  } catch (error) {
    console.error('매입처 수정 실패:', error)
    return NextResponse.json({ error: '매입처 수정에 실패했습니다' }, { status: 500 })
  }
}
