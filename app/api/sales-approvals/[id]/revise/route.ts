import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/sales-approvals/[id]/revise - 새 버전 생성 (결재 후 수정)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 원본 품의서 조회
    const originalApproval = await prisma.salesApproval.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        purchaseItems: { orderBy: { sortOrder: 'asc' } },
        deal: true,
      },
    })

    if (!originalApproval) {
      return NextResponse.json(
        { error: '원본 품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // DRAFT 상태가 아닌 경우에만 새 버전 생성 가능
    if (originalApproval.status === 'DRAFT') {
      return NextResponse.json(
        { error: '작성중인 품의서는 직접 수정 가능합니다' },
        { status: 400 }
      )
    }

    // Deal이 없으면 에러
    if (!originalApproval.dealId) {
      return NextResponse.json(
        { error: 'Deal이 연결되어 있지 않습니다' },
        { status: 400 }
      )
    }

    // 새 품의번호 생성
    const year = new Date().getFullYear()
    const lastApproval = await prisma.salesApproval.findFirst({
      where: { approvalNumber: { startsWith: `SA-${year}-` } },
      orderBy: { approvalNumber: 'desc' },
    })

    let sequence = 1
    if (lastApproval) {
      const lastNum = parseInt(lastApproval.approvalNumber.split('-')[2])
      sequence = lastNum + 1
    }
    const newApprovalNumber = `SA-${year}-${String(sequence).padStart(4, '0')}`

    // 새 버전 품의서 생성 (원본 데이터 복사, 상태는 DRAFT, 서명 정보는 초기화)
    const newApproval = await prisma.salesApproval.create({
      data: {
        deal: { connect: { id: originalApproval.dealId } },
        approvalNumber: newApprovalNumber,
        status: 'DRAFT',
        approvalCode: originalApproval.approvalCode,
        approvalDate: new Date(),
        managerName: originalApproval.managerName,
        clientCompany: originalApproval.clientCompany,
        clientContact: originalApproval.clientContact,
        clientPhone: originalApproval.clientPhone,
        endUser: originalApproval.endUser,
        totalAmount: originalApproval.totalAmount,
        vatAmount: originalApproval.vatAmount,
        totalWithVat: originalApproval.totalWithVat,
        purchaseTotal: originalApproval.purchaseTotal,
        purchaseTotalWithVat: originalApproval.purchaseTotalWithVat,
        paymentTerms: originalApproval.paymentTerms,
        deliveryAddress: originalApproval.deliveryAddress,
        deliveryDate: originalApproval.deliveryDate,
        invoiceEmail: originalApproval.invoiceEmail,
        receiverName: originalApproval.receiverName,
        receiverPhone: originalApproval.receiverPhone,
        notes: originalApproval.notes,
        createdById: originalApproval.createdById,
        // 서명 정보는 초기화 (새로 결재 받아야 함)
        items: {
          create: originalApproval.items.map((item, index) => ({
            sortOrder: index,
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
        purchaseItems: {
          create: originalApproval.purchaseItems.map((item, index) => ({
            sortOrder: index,
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            purchaseDate: item.purchaseDate,
            vendorCompany: item.vendorCompany,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        purchaseItems: { orderBy: { sortOrder: 'asc' } },
        deal: { select: { id: true, name: true, status: true } },
      },
    })

    return NextResponse.json(newApproval, { status: 201 })
  } catch (error) {
    console.error('새 버전 생성 오류:', error)
    return NextResponse.json(
      { error: '새 버전 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
