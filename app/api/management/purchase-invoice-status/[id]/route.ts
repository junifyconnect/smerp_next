import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH /api/management/purchase-invoice-status/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { invoiceDate, invoiceGroupId } = body

    const updateData: Record<string, unknown> = {}

    if ('invoiceDate' in body) {
      updateData.invoiceDate = invoiceDate ? new Date(invoiceDate) : null
    }

    if ('invoiceGroupId' in body) {
      updateData.invoiceGroupId = invoiceGroupId || null
    }

    const status = await prisma.purchaseInvoiceStatus.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error('매입 계산서 업데이트 오류:', error)
    return NextResponse.json(
      { error: '업데이트에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/management/purchase-invoice-status/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await prisma.purchaseInvoiceStatus.delete({ where: { id } })
    return NextResponse.json({ message: '삭제되었습니다' })
  } catch (error) {
    console.error('매입 계산서 삭제 오류:', error)
    return NextResponse.json(
      { error: '삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
