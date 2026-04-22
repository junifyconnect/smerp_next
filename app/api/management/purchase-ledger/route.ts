import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { fromPurchaseLedger, fromMABillingPurchase } from '@/lib/ledger/normalize'

// GET /api/management/purchase-ledger - 매입장 통합 목록 (PurchaseLedger + MABilling)
//
// BUSINESS_RULES §10.1: MA 품의서 승인 시 MABilling이 매입장 역할도 겸한다.
// - 영업 품의서 매입 → PurchaseLedger
// - MA 매입 (MABilling 중 purchaseAmount > 0 + vendorCompany 있는 행만)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const category = searchParams.get('category') // 상품 | MA
    const vendorCompany = searchParams.get('vendorCompany')
    const clientCompany = searchParams.get('clientCompany')
    const ledgerType = searchParams.get('ledgerType') // INVOICE, CASH, CARD, IMPORT (영업 전용)
    const paymentStatus = searchParams.get('paymentStatus')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    // ─────────────────────────────────────────
    // 1. PurchaseLedger (영업) 조회
    // ─────────────────────────────────────────
    const plWhere: Prisma.PurchaseLedgerWhereInput = {
      isActive: true,
    }

    if (category) plWhere.category = category === 'MA' ? 'MA' : '상품'
    if (vendorCompany)
      plWhere.vendorCompany = { contains: vendorCompany, mode: 'insensitive' }
    if (clientCompany)
      plWhere.clientCompany = { contains: clientCompany, mode: 'insensitive' }
    if (ledgerType)
      plWhere.ledgerType =
        ledgerType as Prisma.PurchaseLedgerWhereInput['ledgerType']
    if (paymentStatus)
      plWhere.paymentStatus =
        paymentStatus as Prisma.PurchaseLedgerWhereInput['paymentStatus']

    if (startDate || endDate) {
      plWhere.invoiceDate = {}
      if (startDate)
        (plWhere.invoiceDate as Record<string, Date>).gte = new Date(startDate)
      if (endDate)
        (plWhere.invoiceDate as Record<string, Date>).lte = new Date(endDate)
    }

    if (search) {
      plWhere.OR = [
        { approvalCode: { contains: search, mode: 'insensitive' } },
        { vendorCode: { contains: search, mode: 'insensitive' } },
        { vendorCompany: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
        { itemName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const purchaseLedgerPromise =
      category === 'MA'
        ? Promise.resolve([])
        : prisma.purchaseLedger.findMany({
            where: plWhere,
            orderBy: { invoiceDate: 'desc' },
          })

    // ─────────────────────────────────────────
    // 2. MABilling (MA) 조회 — 매입 청구가 있는 행만
    // ─────────────────────────────────────────
    const mbWhere: Prisma.MABillingWhereInput = {
      isActive: true,
      purchaseAmount: { gt: 0 },
      vendorCompany: { not: null }, // 매입처 없으면 원장에 띄울 수 없음
    }

    if (vendorCompany)
      mbWhere.vendorCompany = { contains: vendorCompany, mode: 'insensitive' }
    if (clientCompany)
      mbWhere.clientCompany = { contains: clientCompany, mode: 'insensitive' }
    if (paymentStatus)
      mbWhere.paymentStatus =
        paymentStatus as Prisma.MABillingWhereInput['paymentStatus']

    if (startDate || endDate) {
      mbWhere.dueDate = {}
      if (startDate)
        (mbWhere.dueDate as Record<string, Date>).gte = new Date(startDate)
      if (endDate)
        (mbWhere.dueDate as Record<string, Date>).lte = new Date(endDate)
    }

    if (search) {
      mbWhere.OR = [
        { itemName: { contains: search, mode: 'insensitive' } },
        { vendorCompany: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
      ]
    }

    const maBillingPromise =
      category === '상품' || ledgerType // ledgerType은 영업 전용 필드
        ? Promise.resolve([])
        : prisma.mABilling.findMany({
            where: mbWhere,
            include: { maContract: { select: { id: true, maApprovalId: true } } },
            orderBy: { dueDate: 'desc' },
          })

    const [purchaseLedgers, maBillings] = await Promise.all([
      purchaseLedgerPromise,
      maBillingPromise,
    ])

    // ─────────────────────────────────────────
    // 3. UNION + normalize
    // ─────────────────────────────────────────
    const unified = [
      ...purchaseLedgers.map(fromPurchaseLedger),
      ...maBillings.map(fromMABillingPurchase),
    ].sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime())

    const total = unified.length
    const items = unified.slice((page - 1) * limit, page * limit)

    const totalSupplyAmount = unified.reduce((s, e) => s + e.supplyAmount, 0)
    const totalVatAmount = unified.reduce((s, e) => s + e.vatAmount, 0)
    const totalAmount = unified.reduce((s, e) => s + e.totalAmount, 0)

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
        count: total,
        salesApprovalCount: purchaseLedgers.length,
        maBillingCount: maBillings.length,
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
