import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// PATCH /api/customers/[id]/contacts/[contactId] - 담당자 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params
    const body = await request.json()

    if (body.isDefault) {
      await prisma.customerContact.updateMany({
        where: { customerId: id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const contact = await prisma.customerContact.update({
      where: { id: contactId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.department !== undefined && { department: body.department }),
        ...(body.position !== undefined && { position: body.position }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('담당자 수정 실패:', error)
    return NextResponse.json({ error: '담당자 수정에 실패했습니다' }, { status: 500 })
  }
}

// DELETE /api/customers/[id]/contacts/[contactId] - soft delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { contactId } = await params
    await prisma.customerContact.update({
      where: { id: contactId },
      data: { isActive: false },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('담당자 삭제 실패:', error)
    return NextResponse.json({ error: '담당자 삭제에 실패했습니다' }, { status: 500 })
  }
}
