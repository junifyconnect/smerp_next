import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-orders/[id] - 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: '발주서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('발주서 조회 오류:', error)
    return NextResponse.json(
      { error: '발주서 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/sales-orders/[id] - 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      orderDate,
      managerName,
      deliveryAddress,
      paymentTerms,
      vendorCompany,
      vendorContact,
      vendorPhone,
      vendorEmail,
      notes,
      status,
      items,
    } = body

    const updateData: Record<string, unknown> = {}

    if (orderDate !== undefined) updateData.orderDate = orderDate ? new Date(orderDate) : null
    if (managerName !== undefined) updateData.managerName = managerName
    if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (vendorCompany !== undefined) updateData.vendorCompany = vendorCompany
    if (vendorContact !== undefined) updateData.vendorContact = vendorContact
    if (vendorPhone !== undefined) updateData.vendorPhone = vendorPhone
    if (vendorEmail !== undefined) updateData.vendorEmail = vendorEmail
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    // 아이템이 제공된 경우
    if (items !== undefined) {
      let totalAmount = 0
      const itemsWithTotal = items.map((item: { quantity?: number; unitPrice?: number; partNumber?: string; description?: string; srpPrice?: number; sortOrder?: number }, index: number) => {
        const qty = item.quantity || 1
        const price = item.unitPrice || 0
        const itemTotal = qty * price
        totalAmount += itemTotal
        return {
          partNumber: item.partNumber,
          description: item.description,
          quantity: qty,
          srpPrice: item.srpPrice,
          unitPrice: price,
          totalPrice: itemTotal,
          sortOrder: item.sortOrder ?? index,
        }
      })

      const vatAmount = Math.round(totalAmount * 0.1)
      const totalWithVat = totalAmount + vatAmount

      updateData.totalAmount = totalAmount
      updateData.vatAmount = vatAmount
      updateData.totalWithVat = totalWithVat

      await prisma.salesOrderItem.deleteMany({ where: { orderId: id } })
      await prisma.salesOrderItem.createMany({
        data: itemsWithTotal.map((item: { partNumber?: string; description?: string; quantity: number; srpPrice?: number; unitPrice: number; totalPrice: number; sortOrder: number }) => ({
          ...item,
          orderId: id,
        })),
      })
    }

    const order = await prisma.salesOrder.update({
      where: { id },
      data: updateData,
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('발주서 수정 오류:', error)
    return NextResponse.json(
      { error: '발주서 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/sales-orders/[id] - 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await prisma.salesOrder.delete({ where: { id } })

    return NextResponse.json({ message: '삭제되었습니다' })
  } catch (error) {
    console.error('발주서 삭제 오류:', error)
    return NextResponse.json(
      { error: '발주서 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
