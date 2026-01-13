import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"

// 발주서 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        deal: {
          select: { id: true, name: true },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "발주서를 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("발주서 조회 오류:", error)
    return NextResponse.json(
      { error: "발주서를 불러오는데 실패했습니다" },
      { status: 500 }
    )
  }
}

// 발주서 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      items = [],
    } = body

    // 금액 계산
    const totalAmount = items.reduce((sum: number, item: { quantity?: number; unitPrice?: number }) => {
      return sum + (item.quantity || 1) * (item.unitPrice || 0)
    }, 0)
    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    // 기존 품목 삭제 후 새로 생성
    await prisma.salesOrderItem.deleteMany({
      where: { orderId: id },
    })

    const order = await prisma.salesOrder.update({
      where: { id },
      data: {
        orderDate: orderDate ? new Date(orderDate) : undefined,
        managerName,
        deliveryAddress,
        paymentTerms,
        vendorCompany,
        vendorContact,
        vendorPhone,
        vendorEmail,
        totalAmount,
        vatAmount,
        totalWithVat,
        notes,
        status: status || undefined,
        items: {
          create: items.map((item: {
            partNumber?: string
            description?: string
            quantity?: number
            srpPrice?: number
            unitPrice?: number
          }, index: number) => ({
            sortOrder: index,
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity || 1,
            srpPrice: item.srpPrice || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
          })),
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("발주서 수정 오류:", error)
    return NextResponse.json(
      { error: "발주서 수정에 실패했습니다" },
      { status: 500 }
    )
  }
}

// 발주서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.salesOrder.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("발주서 삭제 오류:", error)
    return NextResponse.json(
      { error: "발주서 삭제에 실패했습니다" },
      { status: 500 }
    )
  }
}
