import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// 통합 계산서 발행현황 API
// 품의코드를 기준으로 매출/매입을 함께 조회

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 필터 파라미터
    const yearMonth = searchParams.get('yearMonth') // 25.12 형식
    const search = searchParams.get('search')
    const salesInvoiceStatus = searchParams.get('salesInvoiceStatus')
    const purchaseInvoiceStatus = searchParams.get('purchaseInvoiceStatus')
    const salesPaymentStatus = searchParams.get('salesPaymentStatus')
    const purchasePaymentStatus = searchParams.get('purchasePaymentStatus')

    // 매출 데이터 조회
    const salesWhere: Record<string, unknown> = {}
    if (yearMonth) salesWhere.yearMonth = yearMonth
    if (salesInvoiceStatus) salesWhere.invoiceStatus = salesInvoiceStatus
    if (salesPaymentStatus) salesWhere.paymentStatus = salesPaymentStatus
    if (search) {
      salesWhere.OR = [
        { approvalCode: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { itemName: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
      ]
    }

    // 매입 데이터 조회
    const purchaseWhere: Record<string, unknown> = {}
    if (yearMonth) purchaseWhere.yearMonth = yearMonth
    if (purchaseInvoiceStatus) purchaseWhere.invoiceStatus = purchaseInvoiceStatus
    if (purchasePaymentStatus) purchaseWhere.paymentStatus = purchasePaymentStatus
    if (search) {
      purchaseWhere.OR = [
        { approvalCode: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { itemName: { contains: search, mode: 'insensitive' } },
        { vendorCompany: { contains: search, mode: 'insensitive' } },
      ]
    }

    // 병렬 조회
    const [salesItems, purchaseItems, salesAgg, purchaseAgg] = await Promise.all([
      prisma.salesInvoiceStatus.findMany({
        where: salesWhere,
        include: {
          paymentHistories: { orderBy: { paymentDate: 'desc' } },
        },
        orderBy: [{ yearMonth: 'desc' }, { approvalCode: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.purchaseInvoiceStatus.findMany({
        where: purchaseWhere,
        include: {
          paymentHistories: { orderBy: { paymentDate: 'desc' } },
        },
        orderBy: [{ yearMonth: 'desc' }, { approvalCode: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.salesInvoiceStatus.aggregate({
        where: salesWhere,
        _sum: { totalPrice: true, paidAmount: true },
        _count: true,
      }),
      prisma.purchaseInvoiceStatus.aggregate({
        where: purchaseWhere,
        _sum: { totalPrice: true, paidAmount: true },
        _count: true,
      }),
    ])

    // approvalCode 기준으로 매출/매입 매핑
    const approvalMap = new Map<string, {
      approvalCode: string
      yearMonth: string | null
      sales: typeof salesItems
      purchases: typeof purchaseItems
      remarks: string | null
    }>()

    // 매출 데이터 그룹화
    for (const sale of salesItems) {
      const code = sale.approvalCode || `SALE-${sale.id}`
      if (!approvalMap.has(code)) {
        approvalMap.set(code, {
          approvalCode: sale.approvalCode || '',
          yearMonth: sale.yearMonth,
          sales: [],
          purchases: [],
          remarks: sale.remarks,
        })
      }
      approvalMap.get(code)!.sales.push(sale)
    }

    // 매입 데이터 그룹화
    for (const purchase of purchaseItems) {
      const code = purchase.approvalCode || `PURCHASE-${purchase.id}`
      if (!approvalMap.has(code)) {
        approvalMap.set(code, {
          approvalCode: purchase.approvalCode || '',
          yearMonth: purchase.yearMonth,
          sales: [],
          purchases: [],
          remarks: purchase.remarks,
        })
      }
      approvalMap.get(code)!.purchases.push(purchase)
    }

    // 배열로 변환 및 정렬
    const combinedItems = Array.from(approvalMap.values())
      .sort((a, b) => {
        // yearMonth 내림차순, approvalCode 오름차순
        if (a.yearMonth !== b.yearMonth) {
          return (b.yearMonth || '').localeCompare(a.yearMonth || '')
        }
        return (a.approvalCode || '').localeCompare(b.approvalCode || '')
      })

    // 페이징
    const startIndex = (page - 1) * limit
    const pagedItems = combinedItems.slice(startIndex, startIndex + limit)
    const total = combinedItems.length

    return NextResponse.json({
      items: pagedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        sales: {
          totalPrice: salesAgg._sum.totalPrice || 0,
          paidAmount: salesAgg._sum.paidAmount || 0,
          count: salesAgg._count,
        },
        purchase: {
          totalPrice: purchaseAgg._sum.totalPrice || 0,
          paidAmount: purchaseAgg._sum.paidAmount || 0,
          count: purchaseAgg._count,
        },
      },
    })
  } catch (error) {
    console.error('통합 계산서 발행현황 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}
