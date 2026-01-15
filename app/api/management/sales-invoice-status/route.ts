import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/sales-invoice-status - 매출 계산서 발행현황 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 필터 파라미터
    const yearMonth = searchParams.get('yearMonth') // 25.12 형식
    const clientCompany = searchParams.get('clientCompany')
    const invoiceStatus = searchParams.get('invoiceStatus')
    const paymentStatus = searchParams.get('paymentStatus')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (yearMonth) {
      where.yearMonth = yearMonth
    }

    if (clientCompany) {
      where.clientCompany = { contains: clientCompany, mode: 'insensitive' }
    }

    if (invoiceStatus) {
      where.invoiceStatus = invoiceStatus
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (search) {
      where.OR = [
        { approvalCode: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { itemName: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total, aggregations] = await Promise.all([
      prisma.salesInvoiceStatus.findMany({
        where,
        include: {
          paymentHistories: {
            orderBy: { paymentDate: 'desc' },
          },
        },
        orderBy: [{ yearMonth: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesInvoiceStatus.count({ where }),
      prisma.salesInvoiceStatus.aggregate({
        where,
        _sum: {
          totalPrice: true,
          paidAmount: true,
          batchTotal: true,
        },
        _count: true,
      }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalPrice: aggregations._sum.totalPrice || 0,
        paidAmount: aggregations._sum.paidAmount || 0,
        batchTotal: aggregations._sum.batchTotal || 0,
        count: aggregations._count,
      },
    })
  } catch (error) {
    console.error('매출 계산서 발행현황 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/management/sales-invoice-status - 매출 계산서 발행현황 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      approvalCode,
      salesApprovalId,
      maApprovalId,
      partNumber,
      itemName,
      clientCompany,
      quantity = 1,
      unitPrice,
      totalPrice,
      batchTotal,
      invoiceDate,
      invoiceStatus,
      remarks,
      yearMonth,
    } = body

    // 필수값 검증
    if (!itemName || !clientCompany) {
      return NextResponse.json(
        { error: '품목명과 매출처는 필수입니다' },
        { status: 400 }
      )
    }

    // 금액 계산
    const calcTotalPrice = totalPrice ?? quantity * (unitPrice || 0)

    const status = await prisma.salesInvoiceStatus.create({
      data: {
        approvalCode,
        salesApprovalId,
        maApprovalId,
        partNumber,
        itemName,
        clientCompany,
        quantity,
        unitPrice: unitPrice || calcTotalPrice,
        totalPrice: calcTotalPrice,
        remainAmount: calcTotalPrice,
        batchTotal,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        invoiceStatus,
        remarks,
        yearMonth,
      },
    })

    return NextResponse.json(status, { status: 201 })
  } catch (error) {
    console.error('매출 계산서 발행현황 등록 오류:', error)
    return NextResponse.json(
      { error: '매출 계산서 발행현황 등록에 실패했습니다' },
      { status: 500 }
    )
  }
}
