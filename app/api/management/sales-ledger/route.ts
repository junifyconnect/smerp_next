import prisma from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { fromSalesLedger, fromMABillingSales } from '@/lib/ledger/normalize'

// GET /api/management/sales-ledger - 매출장 통합 목록 (SalesLedger + MABilling)
//
// BUSINESS_RULES §10.1: MABilling은 MA의 원장 대체 엔티티. 이 API는 둘을 UNION 해서 반환.
// - 영업 품의서 승인 → SalesLedger
// - MA 품의서 승인 → MABilling (salesAmount > 0 인 행만 매출 원장으로 간주)
//
// 페이지네이션은 통합 결과에 적용 (DB 레벨 offset/limit 대신 in-memory).
// 데이터량이 커지면 향후 DB View 또는 UNION ALL raw query로 최적화 고려.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const category = searchParams.get('category') // 상품 | MA
    const clientCompany = searchParams.get('clientCompany')
    const managerName = searchParams.get('managerName')
    const paymentStatus = searchParams.get('paymentStatus')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    // ─────────────────────────────────────────
    // 1. SalesLedger (영업) 조회
    // ─────────────────────────────────────────
    const slWhere: Prisma.SalesLedgerWhereInput = {
      isActive: true,
    }

    if (category) slWhere.category = category === 'MA' ? 'MA' : '상품'
    if (clientCompany)
      slWhere.clientCompany = { contains: clientCompany, mode: 'insensitive' }
    if (managerName)
      slWhere.managerName = { contains: managerName, mode: 'insensitive' }
    if (paymentStatus)
      slWhere.paymentStatus = paymentStatus as Prisma.SalesLedgerWhereInput['paymentStatus']

    if (startDate || endDate) {
      slWhere.transactionDate = {}
      if (startDate)
        (slWhere.transactionDate as Record<string, Date>).gte = new Date(startDate)
      if (endDate)
        (slWhere.transactionDate as Record<string, Date>).lte = new Date(endDate)
    }

    if (search) {
      slWhere.OR = [
        { approvalCode: { contains: search, mode: 'insensitive' } },
        { vendorCode: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
        { endUser: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // MA 카테고리만 요청이면 SalesLedger는 건너뜀 (카테고리=MA인 SalesLedger는 존재하지 않음 설계상)
    const salesLedgerPromise =
      category === 'MA'
        ? Promise.resolve([])
        : prisma.salesLedger.findMany({
            where: slWhere,
            orderBy: { transactionDate: 'desc' },
          })

    // ─────────────────────────────────────────
    // 2. MABilling (MA) 조회
    // ─────────────────────────────────────────
    const mbWhere: Prisma.MABillingWhereInput = {
      isActive: true,
      salesAmount: { gt: 0 }, // 매출 청구가 있는 월만
    }

    if (clientCompany)
      mbWhere.clientCompany = { contains: clientCompany, mode: 'insensitive' }
    if (paymentStatus)
      mbWhere.paymentStatus = paymentStatus as Prisma.MABillingWhereInput['paymentStatus']

    if (startDate || endDate) {
      mbWhere.dueDate = {}
      if (startDate) (mbWhere.dueDate as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (mbWhere.dueDate as Record<string, Date>).lte = new Date(endDate)
    }

    if (search) {
      mbWhere.OR = [
        { itemName: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
      ]
    }

    // 상품 카테고리만 요청이면 MA 건너뜀
    const maBillingPromise =
      category === '상품'
        ? Promise.resolve([])
        : prisma.mABilling.findMany({
            where: mbWhere,
            include: { maContract: { select: { id: true, maApprovalId: true } } },
            orderBy: { dueDate: 'desc' },
          })

    const [salesLedgers, maBillings] = await Promise.all([
      salesLedgerPromise,
      maBillingPromise,
    ])

    // ─────────────────────────────────────────
    // 3. UNION + normalize
    // ─────────────────────────────────────────
    const unified = [
      ...salesLedgers.map(fromSalesLedger),
      ...maBillings.map(fromMABillingSales),
    ].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())

    const total = unified.length
    const items = unified.slice((page - 1) * limit, page * limit)

    const totalSupplyAmount = unified.reduce((s, e) => s + e.supplyAmount, 0)
    const totalVatAmount = unified.reduce((s, e) => s + e.vatAmount, 0)
    const totalAmount = unified.reduce((s, e) => s + e.totalAmount, 0)
    const totalGrossProfit = unified.reduce(
      (s, e) => s + (e.grossProfit ?? 0),
      0
    )

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalSupplyAmount,
        totalVatAmount,
        totalAmount,
        totalGrossProfit,
        count: total,
        salesApprovalCount: salesLedgers.length,
        maBillingCount: maBillings.length,
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

// POST /api/management/sales-ledger - 매출장 수동 등록 (영업 원장)
// 기존 동작 유지 (MA는 MABilling에서 자동 생성되므로 별도 POST 없음)
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
        unitPrice,
        supplyAmount,
        vatAmount,
        totalAmount,
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
      { error: '등록에 실패했습니다' },
      { status: 500 }
    )
  }
}
