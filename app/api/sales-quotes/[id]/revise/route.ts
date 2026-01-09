import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/sales-quotes/[id]/revise - 새 버전 생성 (발송 후 수정)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 원본 견적서 조회
    const originalQuote = await prisma.salesQuote.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        deal: true,
      },
    })

    if (!originalQuote) {
      return NextResponse.json(
        { error: '원본 견적서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // DRAFT 상태가 아닌 경우에만 새 버전 생성 가능
    if (originalQuote.status === 'DRAFT') {
      return NextResponse.json(
        { error: '작성중인 견적서는 직접 수정 가능합니다' },
        { status: 400 }
      )
    }

    // Deal이 없으면 에러
    if (!originalQuote.dealId) {
      return NextResponse.json(
        { error: 'Deal이 연결되어 있지 않습니다' },
        { status: 400 }
      )
    }

    // 새 버전 견적서 생성 (원본 데이터 복사, 상태는 DRAFT)
    const newQuote = await prisma.salesQuote.create({
      data: {
        deal: { connect: { id: originalQuote.dealId } },
        status: 'DRAFT',
        projectName: originalQuote.projectName,
        productName: originalQuote.productName,
        managerName: originalQuote.managerName,
        clientCompany: originalQuote.clientCompany,
        clientContact: originalQuote.clientContact,
        clientPhone: originalQuote.clientPhone,
        clientFax: originalQuote.clientFax,
        clientMobile: originalQuote.clientMobile,
        clientEmail: originalQuote.clientEmail,
        quoteDate: new Date(), // 새 견적일
        validUntil: originalQuote.validUntil,
        deliveryDate: originalQuote.deliveryDate,
        paymentTerms: originalQuote.paymentTerms,
        notes: originalQuote.notes,
        totalAmount: originalQuote.totalAmount,
        vatAmount: originalQuote.vatAmount,
        totalWithVat: originalQuote.totalWithVat,
        ...(originalQuote.createdById && { createdBy: { connect: { id: originalQuote.createdById } } }),
        items: {
          create: originalQuote.items.map((item, index) => ({
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
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(newQuote, { status: 201 })
  } catch (error) {
    console.error('새 버전 생성 오류:', error)
    return NextResponse.json(
      { error: '새 버전 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
