import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/sales-orders/[id]/revise - 새 버전 생성 (발송 후 수정)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 원본 발주서 조회
    const originalOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        deal: true,
      },
    })

    if (!originalOrder) {
      return NextResponse.json(
        { error: '원본 발주서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // DRAFT 상태가 아닌 경우에만 새 버전 생성 가능
    if (originalOrder.status === 'DRAFT') {
      return NextResponse.json(
        { error: '작성중인 발주서는 직접 수정 가능합니다' },
        { status: 400 }
      )
    }

    // Deal이 없으면 에러
    if (!originalOrder.dealId) {
      return NextResponse.json(
        { error: 'Deal이 연결되어 있지 않습니다' },
        { status: 400 }
      )
    }

    // 새 발주번호 생성
    const year = new Date().getFullYear()
    const lastOrder = await prisma.salesOrder.findFirst({
      where: { orderNumber: { startsWith: `SO-${year}-` } },
      orderBy: { orderNumber: 'desc' },
    })

    let sequence = 1
    if (lastOrder) {
      const lastNum = parseInt(lastOrder.orderNumber.split('-')[2])
      sequence = lastNum + 1
    }
    const newOrderNumber = `SO-${year}-${String(sequence).padStart(4, '0')}`

    // 새 버전 발주서 생성 (원본 데이터 복사, 상태는 DRAFT)
    const newOrder = await prisma.salesOrder.create({
      data: {
        deal: { connect: { id: originalOrder.dealId } },
        orderNumber: newOrderNumber,
        status: 'DRAFT',
        orderDate: new Date(),
        managerName: originalOrder.managerName,
        managerPhone: originalOrder.managerPhone,
        deliveryAddress: originalOrder.deliveryAddress,
        paymentTerms: originalOrder.paymentTerms,
        vendorCompany: originalOrder.vendorCompany,
        vendorContact: originalOrder.vendorContact,
        vendorPhone: originalOrder.vendorPhone,
        vendorEmail: originalOrder.vendorEmail,
        totalAmount: originalOrder.totalAmount,
        vatAmount: originalOrder.vatAmount,
        totalWithVat: originalOrder.totalWithVat,
        notes: originalOrder.notes,
        createdById: originalOrder.createdById,
        items: {
          create: originalOrder.items.map((item, index) => ({
            sortOrder: index,
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            srpPrice: item.srpPrice,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        deal: { select: { id: true, name: true, status: true } },
      },
    })

    return NextResponse.json(newOrder, { status: 201 })
  } catch (error) {
    console.error('새 버전 생성 오류:', error)
    return NextResponse.json(
      { error: '새 버전 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
