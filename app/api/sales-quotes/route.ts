import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/sales-quotes - 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dealId = searchParams.get('dealId')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (dealId) {
      where.dealId = dealId
    }

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.salesQuote.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } },
          deal: { select: { id: true, name: true, status: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesQuote.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('견적서 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/sales-quotes - 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      projectName,
      managerName,
      clientCompany,
      clientContact,
      clientPhone,
      clientFax,
      clientMobile,
      clientCP, // 클라이언트에서 보내는 필드명
      clientEmail,
      quoteDate,
      validUntil,
      deliveryDate,
      paymentTerms,
      notes,
      items = [],
      // 통합 견적
      isConsolidated = false,
      consolidatedName,
      consolidatedPrice,
    } = body

    // Deal 자동 생성 - 견적서 생성 시 자동으로 Deal 생성
    // 식별: 프로젝트명 > 첫 품목 description > 고객사명 > 날짜
    const firstItemDesc = items[0]?.description
    const dealName = projectName || firstItemDesc || clientCompany || `견적서 ${new Date().toLocaleDateString('ko-KR')}`
    const deal = await prisma.deal.create({
      data: {
        name: dealName,
        customerName: clientCompany || null,
      },
    })

    // 금액 계산
    let totalAmount = 0
    const itemsWithTotal = items.map((item: { quantity?: number; unitPrice?: number; partNumber?: string; description?: string; srpPrice?: number; sortOrder?: number }, index: number) => {
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

    // 통합 견적인 경우 통합 금액 사용
    if (isConsolidated && consolidatedPrice) {
      totalAmount = consolidatedPrice
    }

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    const quote = await prisma.salesQuote.create({
      data: {
        deal: { connect: { id: deal.id } },
        projectName,
        managerName,
        clientCompany,
        clientContact,
        clientPhone,
        clientFax,
        clientMobile: clientMobile || clientCP, // 둘 중 하나 사용
        clientEmail,
        quoteDate: quoteDate ? new Date(quoteDate) : null,
        validUntil,
        // 납기일: "별도협의" 문자열이면 null 저장 (또는 별도 필드로 관리)
        deliveryDate: deliveryDate && deliveryDate !== '별도협의' ? new Date(deliveryDate) : null,
        paymentTerms,
        notes,
        totalAmount,
        vatAmount,
        totalWithVat,
        // 통합 견적
        isConsolidated,
        consolidatedName: isConsolidated ? consolidatedName : null,
        consolidatedPrice: isConsolidated ? consolidatedPrice : null,
        items: {
          create: itemsWithTotal,
        },
      },
      include: {
        items: true,
        deal: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('견적서 생성 오류:', error)
    return NextResponse.json(
      { error: '견적서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
