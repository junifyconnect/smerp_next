import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/sales-invoice-status - 매출 계산서 발행현황 목록 조회
// 아이템 테이블에서 직접 조회 (상태값이 아이템에 저장됨)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 필터 파라미터
    const yearMonth = searchParams.get('yearMonth') // 25.12 형식
    const clientCompany = searchParams.get('clientCompany')
    const invoiceStatus = searchParams.get('invoiceStatus')
    const search = searchParams.get('search')
    const approvalId = searchParams.get('approvalId')

    // 1. 최신 버전 승인된 품의서의 아이템 조회 (PENDING, ISSUED, AMENDMENT_NEEDED, AMENDED)
    const latestWhere: Record<string, unknown> = {
      approval: {
        status: 'APPROVED',
        isLatest: true,
      },
    }

    // 2. 취소 필요 아이템 조회 (이전 버전에서)
    const cancellationWhere: Record<string, unknown> = {
      approval: {
        status: 'APPROVED',
        isLatest: false,
      },
      salesInvoiceStatus: 'CANCELLATION_NEEDED',
    }

    // 공통 필터 적용
    if (clientCompany) {
      latestWhere.approval = {
        ...(latestWhere.approval as object),
        clientCompany: { contains: clientCompany, mode: 'insensitive' },
      }
      cancellationWhere.approval = {
        ...(cancellationWhere.approval as object),
        clientCompany: { contains: clientCompany, mode: 'insensitive' },
      }
    }

    if (invoiceStatus) {
      if (invoiceStatus === 'CANCELLATION_NEEDED') {
        // 취소 필요만 조회
        latestWhere.salesInvoiceStatus = 'NONE_MATCH' // 최신 버전에서는 없음
      } else {
        latestWhere.salesInvoiceStatus = invoiceStatus
        cancellationWhere.salesInvoiceStatus = 'NONE_MATCH' // 취소 필요가 아니면 제외
      }
    }

    if (approvalId) {
      latestWhere.approvalId = approvalId
      cancellationWhere.approvalId = approvalId
    }

    if (yearMonth) {
      const [year, month] = yearMonth.split('.')
      const fullYear = parseInt(`20${year}`)
      const monthNum = parseInt(month)
      const startDate = new Date(fullYear, monthNum - 1, 1)
      const endDate = new Date(fullYear, monthNum, 0, 23, 59, 59)

      const dateFilter = {
        OR: [
          { salesInvoiceDate: { gte: startDate, lte: endDate } },
          { salesInvoiceStatus: 'PENDING', createdAt: { gte: startDate, lte: endDate } },
        ],
      }
      latestWhere.AND = [dateFilter]
      cancellationWhere.AND = [dateFilter]
    }

    if (search) {
      const searchFilter = {
        OR: [
          { productName: { contains: search, mode: 'insensitive' } },
          { partNumber: { contains: search, mode: 'insensitive' } },
        ],
      }
      latestWhere.AND = [...((latestWhere.AND as unknown[]) || []), searchFilter]
      cancellationWhere.AND = [...((cancellationWhere.AND as unknown[]) || []), searchFilter]
    }

    // 조회 실행
    const [latestItems, cancellationItems] = await Promise.all([
      prisma.salesApprovalItem.findMany({
        where: latestWhere,
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
          details: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: [
          { salesInvoiceDate: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.salesApprovalItem.findMany({
        where: cancellationWhere,
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
          details: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // 합치기
    const allItems = [...latestItems, ...cancellationItems]
    const total = allItems.length

    // 페이지네이션 적용
    const paginatedItems = allItems.slice((page - 1) * limit, page * limit)

    // 결과 변환
    const items = paginatedItems.map(item => ({
      id: item.id,
      approvalId: item.approvalId,
      itemId: item.id,
      approvalCode: item.approval.approvalCode,
      approvalVersion: item.approval.version,
      approvalDate: item.approval.approvalDate,
      clientCompany: item.approval.clientCompany,
      managerName: item.approval.managerName,
      partNumber: item.partNumber,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      isConsolidated: item.isConsolidated,
      invoiceStatus: item.salesInvoiceStatus,
      invoiceDate: item.salesInvoiceDate,
      invoiceRemarks: item.invoiceRemarks,
      createdAt: item.createdAt,
    }))

    // 집계
    const totalPrice = paginatedItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)

    // 발행 상태별 집계 (전체 기준)
    const [latestStatusCounts, cancellationCount] = await Promise.all([
      prisma.salesApprovalItem.groupBy({
        by: ['salesInvoiceStatus'],
        where: {
          approval: { status: 'APPROVED', isLatest: true },
        },
        _count: true,
      }),
      prisma.salesApprovalItem.count({
        where: {
          approval: { status: 'APPROVED', isLatest: false },
          salesInvoiceStatus: 'CANCELLATION_NEEDED',
        },
      }),
    ])

    const byInvoiceStatus = latestStatusCounts.reduce((acc, item) => {
      acc[item.salesInvoiceStatus] = item._count
      return acc
    }, {} as Record<string, number>)

    if (cancellationCount > 0) {
      byInvoiceStatus['CANCELLATION_NEEDED'] = cancellationCount
    }

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalPrice,
        count: total,
        byInvoiceStatus,
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

// PATCH /api/management/sales-invoice-status - 계산서 발행 상태 일괄 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, invoiceStatus, invoiceDate, remarks } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '업데이트할 항목을 선택해주세요' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (invoiceStatus) {
      updateData.salesInvoiceStatus = invoiceStatus
    }

    if (invoiceDate !== undefined) {
      updateData.salesInvoiceDate = invoiceDate ? new Date(invoiceDate) : null
    }

    if (remarks !== undefined) {
      updateData.invoiceRemarks = remarks
    }

    const result = await prisma.salesApprovalItem.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    })

    return NextResponse.json({
      message: `${result.count}건이 업데이트되었습니다`,
      count: result.count,
    })
  } catch (error) {
    console.error('매출 계산서 발행현황 업데이트 오류:', error)
    return NextResponse.json(
      { error: '업데이트에 실패했습니다' },
      { status: 500 }
    )
  }
}
