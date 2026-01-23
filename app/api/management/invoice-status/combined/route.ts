import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/invoice-status/combined - 품의코드별 매출/매입 통합 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const yearMonth = searchParams.get('yearMonth')
    const search = searchParams.get('search')

    // 기본 where 조건
    const salesWhere: Record<string, unknown> = {}
    const purchaseWhere: Record<string, unknown> = {}

    if (yearMonth) {
      salesWhere.yearMonth = yearMonth
      purchaseWhere.yearMonth = yearMonth
    }

    if (search) {
      salesWhere.OR = [
        { approvalCode: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { itemName: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
      ]
      purchaseWhere.OR = [
        { approvalCode: { contains: search, mode: 'insensitive' } },
        { partNumber: { contains: search, mode: 'insensitive' } },
        { itemName: { contains: search, mode: 'insensitive' } },
        { vendorCompany: { contains: search, mode: 'insensitive' } },
      ]
    }

    // 매출/매입 데이터 조회
    const [salesItems, purchaseItems] = await Promise.all([
      prisma.salesInvoiceStatus.findMany({
        where: salesWhere,
        include: {
          paymentHistories: { orderBy: { paymentDate: 'desc' } },
        },
        orderBy: [{ approvalCode: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.purchaseInvoiceStatus.findMany({
        where: purchaseWhere,
        include: {
          paymentHistories: { orderBy: { paymentDate: 'desc' } },
        },
        orderBy: [{ approvalCode: 'asc' }, { createdAt: 'asc' }],
      }),
    ])

    // 품의코드별로 그룹핑
    const approvalCodeMap = new Map<string, {
      approvalCode: string
      salesItems: typeof salesItems
      purchaseItems: typeof purchaseItems
    }>()

    // 매출 아이템 그룹핑
    for (const item of salesItems) {
      const code = item.approvalCode || 'UNKNOWN'
      if (!approvalCodeMap.has(code)) {
        approvalCodeMap.set(code, {
          approvalCode: code,
          salesItems: [],
          purchaseItems: [],
        })
      }
      approvalCodeMap.get(code)!.salesItems.push(item)
    }

    // 매입 아이템 그룹핑
    for (const item of purchaseItems) {
      const code = item.approvalCode || 'UNKNOWN'
      if (!approvalCodeMap.has(code)) {
        approvalCodeMap.set(code, {
          approvalCode: code,
          salesItems: [],
          purchaseItems: [],
        })
      }
      approvalCodeMap.get(code)!.purchaseItems.push(item)
    }

    // 엑셀 형식으로 변환: 품의코드별로 행 생성
    // 각 품의코드당 max(매출품목수, 매입품목수)만큼 행 생성
    interface CombinedRow {
      rowKey: string
      approvalCode: string
      rowIndex: number
      // 매출 정보
      salesId: string | null
      salesPartNumber: string | null
      salesItemName: string | null
      salesClientCompany: string | null
      salesQuantity: number | null
      salesUnitPrice: number | null
      salesTotalPrice: number | null
      salesBatchTotal: number | null // 건별합계 (첫 행에만)
      salesInvoiceNumber: string | null // 실제 세금계산서 번호
      salesInvoiceDate: string | null
      salesInvoiceStatus: string | null
      salesRemarks: string | null
      salesPaymentStatus: string | null
      salesPaidAmount: number | null
      salesRemainAmount: number | null
      // 매입 정보
      purchaseId: string | null
      purchasePartNumber: string | null
      purchaseItemName: string | null
      purchaseVendorCompany: string | null
      purchaseQuantity: number | null
      purchaseUnitPrice: number | null
      purchaseTotalPrice: number | null
      purchaseBatchTotal: number | null // 건별합계 (첫 행에만)
      purchaseInvoiceNumber: string | null // 실제 세금계산서 번호
      purchaseInvoiceDate: string | null
      purchaseInvoiceStatus: string | null
      purchaseRemarks: string | null
      purchasePaymentStatus: string | null
      purchasePaidAmount: number | null
      purchaseRemainAmount: number | null
    }

    const rows: CombinedRow[] = []

    // 품의코드 정렬 (최신순)
    const sortedCodes = Array.from(approvalCodeMap.keys()).sort((a, b) => b.localeCompare(a))

    for (const code of sortedCodes) {
      const group = approvalCodeMap.get(code)!
      const maxRows = Math.max(group.salesItems.length, group.purchaseItems.length, 1)

      // 매출/매입 건별합계 계산
      const salesBatchTotal = group.salesItems.reduce((sum, item) => sum + Number(item.totalPrice), 0)
      const purchaseBatchTotal = group.purchaseItems.reduce((sum, item) => sum + Number(item.totalPrice), 0)

      for (let i = 0; i < maxRows; i++) {
        const salesItem = group.salesItems[i]
        const purchaseItem = group.purchaseItems[i]

        rows.push({
          rowKey: `${code}-${i}`,
          approvalCode: code,
          rowIndex: i,
          // 매출 정보
          salesId: salesItem?.id || null,
          salesPartNumber: salesItem?.partNumber || null,
          salesItemName: salesItem?.itemName || null,
          salesClientCompany: salesItem?.clientCompany || null,
          salesQuantity: salesItem?.quantity || null,
          salesUnitPrice: salesItem ? Number(salesItem.unitPrice) : null,
          salesTotalPrice: salesItem ? Number(salesItem.totalPrice) : null,
          salesBatchTotal: i === 0 && group.salesItems.length > 0 ? salesBatchTotal : null,
          salesInvoiceNumber: salesItem?.invoiceNumber || null,
          salesInvoiceDate: salesItem?.invoiceDate?.toISOString() || null,
          salesInvoiceStatus: salesItem?.invoiceStatus || null,
          salesRemarks: salesItem?.remarks || null,
          salesPaymentStatus: salesItem?.paymentStatus || null,
          salesPaidAmount: salesItem ? Number(salesItem.paidAmount) : null,
          salesRemainAmount: salesItem ? Number(salesItem.remainAmount) : null,
          // 매입 정보
          purchaseId: purchaseItem?.id || null,
          purchasePartNumber: purchaseItem?.partNumber || null,
          purchaseItemName: purchaseItem?.itemName || null,
          purchaseVendorCompany: purchaseItem?.vendorCompany || null,
          purchaseQuantity: purchaseItem?.quantity || null,
          purchaseUnitPrice: purchaseItem ? Number(purchaseItem.unitPrice) : null,
          purchaseTotalPrice: purchaseItem ? Number(purchaseItem.totalPrice) : null,
          purchaseBatchTotal: i === 0 && group.purchaseItems.length > 0 ? purchaseBatchTotal : null,
          purchaseInvoiceNumber: purchaseItem?.invoiceNumber || null,
          purchaseInvoiceDate: purchaseItem?.invoiceDate?.toISOString() || null,
          purchaseInvoiceStatus: purchaseItem?.invoiceStatus || null,
          purchaseRemarks: purchaseItem?.remarks || null,
          purchasePaymentStatus: purchaseItem?.paymentStatus || null,
          purchasePaidAmount: purchaseItem ? Number(purchaseItem.paidAmount) : null,
          purchaseRemainAmount: purchaseItem ? Number(purchaseItem.remainAmount) : null,
        })
      }
    }

    // 페이지네이션
    const total = rows.length
    const paginatedRows = rows.slice((page - 1) * limit, page * limit)

    // 전체 요약
    const summary = {
      totalSalesPrice: salesItems.reduce((sum, item) => sum + Number(item.totalPrice), 0),
      totalSalesPaid: salesItems.reduce((sum, item) => sum + Number(item.paidAmount), 0),
      totalPurchasePrice: purchaseItems.reduce((sum, item) => sum + Number(item.totalPrice), 0),
      totalPurchasePaid: purchaseItems.reduce((sum, item) => sum + Number(item.paidAmount), 0),
      approvalCount: approvalCodeMap.size,
      rowCount: total,
    }

    return NextResponse.json({
      items: paginatedRows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary,
    })
  } catch (error) {
    console.error('계산서 발행현황 통합 조회 오류:', error)
    return NextResponse.json(
      { error: '조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
