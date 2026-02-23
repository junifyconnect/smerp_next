import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/invoice-status - 통합 계산서 발행현황 (매출+매입)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM
    const approvalCode = searchParams.get('approvalCode')
    const clientCompany = searchParams.get('clientCompany')
    const vendorName = searchParams.get('vendorName')
    const invoiceStatus = searchParams.get('invoiceStatus') // PENDING, ISSUED, etc
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    // 품의서 필터
    const approvalWhere: Record<string, unknown> = {
      status: 'APPROVED',
      isLatest: true,
    }

    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const startDate = new Date(year, mon - 1, 1)
      const endDate = new Date(year, mon, 1)
      approvalWhere.approvalDate = { gte: startDate, lt: endDate }
    }

    if (approvalCode) {
      approvalWhere.approvalCode = { contains: approvalCode, mode: 'insensitive' }
    }

    if (clientCompany) {
      approvalWhere.clientCompany = { contains: clientCompany, mode: 'insensitive' }
    }

    // Product(매출) 조회 + 하위 Item(매입) 포함
    const productWhere: Record<string, unknown> = {
      approval: approvalWhere,
    }

    if (invoiceStatus) {
      // 매출 또는 매입 중 하나라도 해당 상태면 포함
      productWhere.OR = [
        { salesInvoiceStatus: invoiceStatus },
        { items: { some: { purchaseInvoiceStatus: invoiceStatus } } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.salesApprovalProduct.findMany({
        where: productWhere,
        include: {
          approval: {
            select: {
              id: true,
              approvalCode: true,
              approvalDate: true,
              version: true,
              clientCompany: true,
              managerName: true,
            },
          },
          items: {
            where: vendorName
              ? { vendorName: { contains: vendorName, mode: 'insensitive' } }
              : { vendorName: { not: null } },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: [
          { approval: { approvalCode: 'asc' } },
          { sortOrder: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesApprovalProduct.count({ where: productWhere }),
    ])

    // 품의코드별 그룹핑 + 건별합계 계산
    const approvalGroups = new Map<string, {
      salesTotalSum: number
      purchaseTotalSum: number
    }>()

    for (const product of products) {
      const code = product.approval.approvalCode || 'UNKNOWN'
      if (!approvalGroups.has(code)) {
        approvalGroups.set(code, { salesTotalSum: 0, purchaseTotalSum: 0 })
      }
      const group = approvalGroups.get(code)!
      group.salesTotalSum += Number(product.totalPrice || 0)
      for (const item of product.items) {
        group.purchaseTotalSum += Number(item.purchaseTotal || 0)
      }
    }

    // 통합 행 데이터 생성
    const rows: Record<string, unknown>[] = []
    for (const product of products) {
      const code = product.approval.approvalCode || 'UNKNOWN'
      const groupTotals = approvalGroups.get(code)!
      const items = product.items

      if (items.length === 0) {
        // 매입 없는 매출만 있는 건
        rows.push({
          productId: product.id,
          itemId: null as string | null,
          approvalId: product.approvalId,
          approvalCode: product.approval.approvalCode,
          approvalVersion: product.approval.version,
          approvalDate: product.approval.approvalDate,
          clientCompany: product.approval.clientCompany,
          // 매출
          productName: product.name,
          partNumber: null as string | null,
          description: null as string | null,
          salesQty: product.quantity,
          salesUnitPrice: product.unitPrice,
          salesTotalPrice: product.totalPrice,
          salesGroupTotal: groupTotals.salesTotalSum,
          salesInvoiceStatus: product.salesInvoiceStatus,
          salesInvoiceDate: product.salesInvoiceDate,
          salesInvoiceRemarks: product.salesInvoiceRemarks,
          // 매입 (없음)
          purchaseDate: null as Date | null,
          vendorName: null as string | null,
          purchaseQty: null as number | null,
          purchasePrice: null,
          purchaseTotal: null,
          purchaseGroupTotal: groupTotals.purchaseTotalSum,
          purchaseInvoiceStatus: null as string | null,
          purchaseInvoiceDate: null as Date | null,
          // 메타
          isFirstInProduct: true,
          productRowSpan: 1,
        })
        continue;
      }

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx]
        rows.push({
        productId: product.id,
        itemId: item.id,
        approvalId: product.approvalId,
        approvalCode: product.approval.approvalCode,
        approvalVersion: product.approval.version,
        approvalDate: product.approval.approvalDate,
        clientCompany: product.approval.clientCompany,
        // 매출 (첫 행만)
        productName: product.name,
        partNumber: item.partNumber,
        description: item.description,
        salesQty: product.quantity,
        salesUnitPrice: product.unitPrice,
        salesTotalPrice: product.totalPrice,
        salesGroupTotal: groupTotals.salesTotalSum,
        salesInvoiceStatus: product.salesInvoiceStatus,
        salesInvoiceDate: product.salesInvoiceDate,
        salesInvoiceRemarks: product.salesInvoiceRemarks,
        // 매입
        purchaseDate: item.purchaseDate,
        vendorName: item.vendorName,
        purchaseQty: item.purchaseQty,
        purchasePrice: item.purchasePrice,
        purchaseTotal: item.purchaseTotal,
        purchaseGroupTotal: groupTotals.purchaseTotalSum,
        purchaseInvoiceStatus: item.purchaseInvoiceStatus,
        purchaseInvoiceDate: item.purchaseInvoiceDate,
        // 메타
        isFirstInProduct: idx === 0,
        productRowSpan: items.length,
        })
      }
    }

    // 요약
    const allSalesTotal = [...approvalGroups.values()].reduce((s, g) => s + g.salesTotalSum, 0)
    const allPurchaseTotal = [...approvalGroups.values()].reduce((s, g) => s + g.purchaseTotalSum, 0)

    return NextResponse.json({
      rows,
      total,
      page,
      limit,
      summary: {
        salesTotal: allSalesTotal,
        purchaseTotal: allPurchaseTotal,
        rowCount: rows.length,
      },
    })
  } catch (error) {
    console.error('통합 계산서 발행현황 조회 오류:', error)
    return NextResponse.json({ error: '목록을 불러오는데 실패했습니다' }, { status: 500 })
  }
}

// PATCH /api/management/invoice-status - 개별 인라인 수정
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, field, value } = body

    // type: 'sales' | 'purchase'
    // field: 'invoiceStatus' | 'invoiceDate' | 'remarks'

    if (!type || !id || !field) {
      return NextResponse.json({ error: '필수 파라미터가 없습니다' }, { status: 400 })
    }

    if (type === 'sales') {
      const updateData: Record<string, unknown> = {}
      if (field === 'invoiceStatus') updateData.salesInvoiceStatus = value
      if (field === 'invoiceDate') updateData.salesInvoiceDate = value ? new Date(value) : null
      if (field === 'remarks') updateData.salesInvoiceRemarks = value || null

      // 발행완료로 변경 시 발행일 자동 설정
      if (field === 'invoiceStatus' && value === 'ISSUED' && !body.invoiceDate) {
        updateData.salesInvoiceDate = new Date()
      }

      await prisma.salesApprovalProduct.update({
        where: { id },
        data: updateData,
      })
    } else if (type === 'purchase') {
      const updateData: Record<string, unknown> = {}
      if (field === 'invoiceStatus') updateData.purchaseInvoiceStatus = value
      if (field === 'invoiceDate') updateData.purchaseInvoiceDate = value ? new Date(value) : null

      if (field === 'invoiceStatus' && value === 'ISSUED' && !body.invoiceDate) {
        updateData.purchaseInvoiceDate = new Date()
      }

      await prisma.salesApprovalItem.update({
        where: { id },
        data: updateData,
      })
    } else {
      return NextResponse.json({ error: '잘못된 type입니다' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('계산서 인라인 수정 오류:', error)
    return NextResponse.json({ error: '수정에 실패했습니다' }, { status: 500 })
  }
}
