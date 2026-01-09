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
      clientEmail,
      quoteDate,
      validUntil,
      deliveryDate,
      paymentTerms,
      notes,
      items = [],
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
        clientMobile,
        clientEmail,
        quoteDate: quoteDate ? new Date(quoteDate) : null,
        validUntil,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        paymentTerms,
        notes,
        totalAmount,
        vatAmount,
        totalWithVat,
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
