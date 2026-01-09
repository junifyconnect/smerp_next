import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/ma-quotes - 목록 조회
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
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.mAQuote.findMany({
        where,
        include: {
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mAQuote.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('MA 견적서 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/ma-quotes - 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      quoteDate,
      managerName,
      clientCompany,
      clientContact,
      validUntil,
      paymentTerms,
      serviceTerms,
      specialTerms,
      notes,
      items = [],
    } = body

    // TODO: 실제 인증된 사용자 ID 사용
    const createdById = 'dummy-user-id'

    // 견적번호 생성 (MQ-YYYY-NNNN)
    const year = new Date().getFullYear()
    const lastQuote = await prisma.mAQuote.findFirst({
      where: { quoteNumber: { startsWith: `MQ-${year}-` } },
      orderBy: { quoteNumber: 'desc' },
    })

    let sequence = 1
    if (lastQuote) {
      const lastNum = parseInt(lastQuote.quoteNumber.split('-')[2])
      sequence = lastNum + 1
    }
    const quoteNumber = `MQ-${year}-${sequence.toString().padStart(4, '0')}`

    // 금액 계산
    let totalAmount = 0
    const itemsWithTotal = items.map((item: {
      productName?: string
      modelType?: string
      model?: string
      serialNumber?: string
      serviceLevel?: string
      period?: string
      startDate?: string
      endDate?: string
      totalPrice?: number
      sortOrder?: number
    }, index: number) => {
      const price = item.totalPrice || 0
      totalAmount += price
      return {
        ...item,
        sortOrder: item.sortOrder ?? index,
        totalPrice: price,
        startDate: item.startDate ? new Date(item.startDate) : null,
        endDate: item.endDate ? new Date(item.endDate) : null,
      }
    })

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    const quote = await prisma.mAQuote.create({
      data: {
        quoteNumber,
        quoteDate: quoteDate ? new Date(quoteDate) : null,
        managerName,
        clientCompany,
        clientContact,
        validUntil,
        paymentTerms,
        serviceTerms,
        specialTerms,
        notes,
        totalAmount,
        vatAmount,
        totalWithVat,
        createdById,
        items: {
          create: itemsWithTotal,
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('MA 견적서 생성 오류:', error)
    return NextResponse.json(
      { error: 'MA 견적서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
