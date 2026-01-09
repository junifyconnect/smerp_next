import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/sales-approvals - 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { approvalNumber: { contains: search, mode: 'insensitive' } },
        { approvalCode: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.salesApproval.findMany({
        where,
        include: {
          _count: { select: { items: true, purchaseItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesApproval.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('품의서 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/sales-approvals - 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      dealId,
      quoteId, // 견적서에서 품의서 생성 시
      approvalCode,
      approvalDate,
      managerName,
      clientCompany,
      clientContact,
      clientPhone,
      endUser,
      paymentTerms,
      deliveryAddress,
      deliveryDate,
      invoiceEmail,
      receiverName,
      receiverPhone,
      notes,
      items = [],
      purchaseItems = [],
    } = body

    // 견적서에서 생성하는 경우, 견적서 데이터 가져오기
    let quoteData = null
    if (quoteId) {
      quoteData = await prisma.salesQuote.findUnique({
        where: { id: quoteId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      })
    }

    // TODO: 실제 인증된 사용자 ID 사용
    const createdById = 'dummy-user-id'

    // 품의번호 생성 (SA-YYYY-NNNN)
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
    const approvalNumber = `SA-${year}-${sequence.toString().padStart(4, '0')}`

    // 견적서에서 생성하는 경우 데이터 초기화
    const finalClientCompany = clientCompany || quoteData?.clientCompany
    const finalClientContact = clientContact || quoteData?.clientContact
    const finalClientPhone = clientPhone || quoteData?.clientPhone
    const finalManagerName = managerName || quoteData?.managerName
    const finalPaymentTerms = paymentTerms || quoteData?.paymentTerms
    const finalDealId = dealId || quoteData?.dealId
    const finalItems = items.length > 0 ? items : (quoteData?.items || []).map((item: { partNumber: string | null; description: string | null; quantity: number; unitPrice: unknown; totalPrice: unknown; sortOrder: number }) => ({
      partNumber: item.partNumber,
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice) || 0,
      sortOrder: item.sortOrder,
    }))

    // 매출 금액 계산
    let totalAmount = 0
    const itemsWithTotal = finalItems.map((item: { quantity?: number; unitPrice?: number; partNumber?: string; description?: string; sortOrder?: number }, index: number) => {
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      const itemTotal = qty * price
      totalAmount += itemTotal
      return {
        ...item,
        sortOrder: item.sortOrder ?? index,
        quantity: qty,
        unitPrice: price,
        totalPrice: itemTotal,
      }
    })

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    // 매입 금액 계산
    let purchaseTotal = 0
    const purchaseItemsWithTotal = purchaseItems.map((item: { quantity?: number; unitPrice?: number; partNumber?: string; description?: string; purchaseDate?: string; vendorCompany?: string; sortOrder?: number }, index: number) => {
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      const itemTotal = qty * price
      purchaseTotal += itemTotal
      return {
        ...item,
        sortOrder: item.sortOrder ?? index,
        quantity: qty,
        unitPrice: price,
        totalPrice: itemTotal,
        purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
      }
    })

    const purchaseTotalWithVat = purchaseTotal + Math.round(purchaseTotal * 0.1)

    const approval = await prisma.salesApproval.create({
      data: {
        approvalNumber,
        ...(finalDealId && { deal: { connect: { id: finalDealId } } }),
        approvalCode,
        approvalDate: approvalDate ? new Date(approvalDate) : null,
        managerName: finalManagerName,
        clientCompany: finalClientCompany,
        clientContact: finalClientContact,
        clientPhone: finalClientPhone,
        endUser,
        paymentTerms: finalPaymentTerms,
        deliveryAddress,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        invoiceEmail,
        receiverName,
        receiverPhone,
        notes,
        totalAmount,
        vatAmount,
        totalWithVat,
        purchaseTotal,
        purchaseTotalWithVat,
        createdById,
        items: {
          create: itemsWithTotal,
        },
        purchaseItems: {
          create: purchaseItemsWithTotal,
        },
      },
      include: {
        items: true,
        purchaseItems: true,
        deal: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(approval, { status: 201 })
  } catch (error) {
    console.error('품의서 생성 오류:', error)
    return NextResponse.json(
      { error: '품의서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
