import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/purchase-ledger - 매입장 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 필터 파라미터
    const category = searchParams.get('category') // MA, 상품, 일반경비
    const vendorCompany = searchParams.get('vendorCompany')
    const clientCompany = searchParams.get('clientCompany')
    const ledgerType = searchParams.get('ledgerType') // INVOICE, CASH, CARD, IMPORT
    const paymentStatus = searchParams.get('paymentStatus')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (category) {
      where.category = category
    }

    if (vendorCompany) {
      where.vendorCompany = { contains: vendorCompany, mode: 'insensitive' }
    }

    if (clientCompany) {
      where.clientCompany = { contains: clientCompany, mode: 'insensitive' }
    }

    if (ledgerType) {
      where.ledgerType = ledgerType
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (startDate || endDate) {
      where.invoiceDate = {}
      if (startDate) {
        (where.invoiceDate as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.invoiceDate as Record<string, Date>).lte = new Date(endDate)
      }
    }

    if (search) {
      where.OR = [
        { approvalCode: { contains: search, mode: 'insensitive' } },
        { vendorCode: { contains: search, mode: 'insensitive' } },
        { vendorCompany: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
        { itemName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total, aggregations] = await Promise.all([
      prisma.purchaseLedger.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseLedger.count({ where }),
      prisma.purchaseLedger.aggregate({
        where,
        _sum: {
          supplyAmount: true,
          vatAmount: true,
          totalAmount: true,
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
        count: aggregations._count,
      },
    })
  } catch (error) {
    console.error('매입장 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/management/purchase-ledger - 매입장 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      approvalCode,
      vendorCode,
      invoiceDate,
      vendorCompany,
      clientCompany,
      category,
      subCategory,
      itemName,
      quantity = 1,
      unitPrice,
      supplyAmount,
      vatAmount,
      totalAmount,
      paymentDueDate,
      paymentDate,
      paymentStatus = 'PENDING',
      ledgerType = 'INVOICE',
      currency,
      foreignAmount,
      exchangeRate,
      cardNumber,
      salesApprovalId,
      maApprovalId,
    } = body

    // 필수값 검증
    if (!invoiceDate || !vendorCompany || !category || !itemName) {
      return NextResponse.json(
        { error: '계산서일, 매입처, 구분, 품목명은 필수입니다' },
        { status: 400 }
      )
    }

    // 금액 계산
    const calcSupplyAmount = supplyAmount ?? (quantity * (unitPrice || 0))
    const calcVatAmount = vatAmount ?? Math.round(calcSupplyAmount * 0.1)
    const calcTotalAmount = totalAmount ?? (calcSupplyAmount + calcVatAmount)

    const ledger = await prisma.purchaseLedger.create({
      data: {
        approvalCode,
        vendorCode,
        invoiceDate: new Date(invoiceDate),
        vendorCompany,
        clientCompany,
        category,
        subCategory,
        itemName,
        quantity,
        unitPrice: unitPrice || calcSupplyAmount,
        supplyAmount: calcSupplyAmount,
        vatAmount: calcVatAmount,
        totalAmount: calcTotalAmount,
        paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        paymentStatus,
        ledgerType,
        currency,
        foreignAmount,
        exchangeRate,
        cardNumber,
        salesApprovalId,
        maApprovalId,
      },
    })

    return NextResponse.json(ledger, { status: 201 })
  } catch (error) {
    console.error('매입장 등록 오류:', error)
    return NextResponse.json(
      { error: '매입장 등록에 실패했습니다' },
      { status: 500 }
    )
  }
}
