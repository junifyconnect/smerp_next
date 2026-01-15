import prisma from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/management/sales-ledger - 매출장 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 필터 파라미터
    const category = searchParams.get('category') // MA, 상품, 건물임대
    const clientCompany = searchParams.get('clientCompany')
    const managerName = searchParams.get('managerName')
    const paymentStatus = searchParams.get('paymentStatus')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (category) {
      where.category = category
    }

    if (clientCompany) {
      where.clientCompany = { contains: clientCompany, mode: 'insensitive' }
    }

    if (managerName) {
      where.managerName = { contains: managerName, mode: 'insensitive' }
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (startDate || endDate) {
      where.transactionDate = {}
      if (startDate) {
        (where.transactionDate as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.transactionDate as Record<string, Date>).lte = new Date(endDate)
      }
    }

    if (search) {
      where.OR = [
        { approvalCode: { contains: search, mode: 'insensitive' } },
        { vendorCode: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
        { endUser: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total, aggregations] = await Promise.all([
      prisma.salesLedger.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesLedger.count({ where }),
      prisma.salesLedger.aggregate({
        where,
        _sum: {
          supplyAmount: true,
          vatAmount: true,
          totalAmount: true,
          grossProfit: true,
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
        totalSupplyAmount: aggregations._sum.supplyAmount || 0,
        totalVatAmount: aggregations._sum.vatAmount || 0,
        totalAmount: aggregations._sum.totalAmount || 0,
        totalGrossProfit: aggregations._sum.grossProfit || 0,
        count: aggregations._count,
      },
    })
  } catch (error) {
    console.error('매출장 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/management/sales-ledger - 매출장 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      approvalCode,
      vendorCode,
      transactionDate,
      clientCompany,
      endUser,
      category,
      subCategory,
      description,
      quantity = 1,
      unitPrice,
      supplyAmount,
      vatAmount,
      totalAmount,
      grossProfit,
      paymentDueDate,
      paymentDate,
      paymentStatus = 'PENDING',
      managerId,
      managerName,
      salesApprovalId,
      maApprovalId,
    } = body

    // 필수값 검증
    if (!transactionDate || !clientCompany || !category || !description) {
      return NextResponse.json(
        { error: '거래일, 매출처, 구분, 거래내용은 필수입니다' },
        { status: 400 }
      )
    }

    // 금액 계산 (supplyAmount가 없으면 quantity * unitPrice로 계산)
    const calcSupplyAmount = supplyAmount ?? (quantity * (unitPrice || 0))
    const calcVatAmount = vatAmount ?? Math.round(calcSupplyAmount * 0.1)
    const calcTotalAmount = totalAmount ?? (calcSupplyAmount + calcVatAmount)

    const ledger = await prisma.salesLedger.create({
      data: {
        approvalCode,
        vendorCode,
        transactionDate: new Date(transactionDate),
        clientCompany,
        endUser,
        category,
        subCategory,
        description,
        quantity,
        unitPrice: unitPrice || calcSupplyAmount,
        supplyAmount: calcSupplyAmount,
        vatAmount: calcVatAmount,
        totalAmount: calcTotalAmount,
        grossProfit,
        paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        paymentStatus,
        managerId,
        managerName,
        salesApprovalId,
        maApprovalId,
      },
    })

    return NextResponse.json(ledger, { status: 201 })
  } catch (error) {
    console.error('매출장 등록 오류:', error)
    return NextResponse.json(
      { error: '매출장 등록에 실패했습니다' },
      { status: 500 }
    )
  }
}
