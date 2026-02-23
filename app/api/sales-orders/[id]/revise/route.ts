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

    // 최신 버전이 아니면 수정 불가
    if (originalOrder.isLatest === false) {
      return NextResponse.json(
        { error: '이전 버전은 수정할 수 없습니다. 최신 버전에서 수정해주세요.' },
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

    // 버전 관리: 버전 증가, originalId 설정
    const newVersion = (originalOrder.version || 1) + 1
    const newOriginalId = originalOrder.originalId || originalOrder.id // 최초 버전 ID

    // 트랜잭션으로 기존 버전 업데이트 + 새 버전 생성
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. 기존 버전 isLatest = false로 변경
      await tx.salesOrder.update({
        where: { id: originalOrder.id },
        data: { isLatest: false },
      })

      // 2. 새 버전 발주서 생성 (원본 데이터 복사, 상태는 DRAFT)
      return tx.salesOrder.create({
        data: {
          // dealId removed in v2
          orderNumber: newOrderNumber,
          status: 'DRAFT',
          // 버전 관리
          version: newVersion,
          original: { connect: { id: newOriginalId } },
          isLatest: true,
          // 기본 정보 복사
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
          createdBy: { connect: { id: originalOrder.createdById } },
          items: {
            create: originalOrder.items.map((item, index) => ({
              sortOrder: item.sortOrder ?? index,
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
          createdBy: { select: { id: true, name: true } },
        },
      })
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
