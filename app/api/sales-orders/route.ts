import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/sales-orders - 목록 조회
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
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { vendorCompany: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesOrder.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('발주서 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/sales-orders - 생성
export async function POST(request: NextRequest) {
  try {
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
      items = [],
    } = body

    // TODO: 실제 인증된 사용자 ID 사용
    const createdById = 'dummy-user-id'

    // 발주번호 생성 (SO-YYYY-NNNN)
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
    const orderNumber = `SO-${year}-${sequence.toString().padStart(4, '0')}`

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

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        orderDate: orderDate ? new Date(orderDate) : null,
        managerName,
        deliveryAddress,
        paymentTerms,
        vendorCompany,
        vendorContact,
        vendorPhone,
        vendorEmail,
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

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('발주서 생성 오류:', error)
    return NextResponse.json(
      { error: '발주서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
