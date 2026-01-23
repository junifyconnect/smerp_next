import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// POST /api/management/invoice-status/batch - 계산서 번호 일괄 업데이트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      type, // 'sales' | 'purchase'
      ids, // string[] - 업데이트할 ID 목록
      invoiceNumber, // 계산서 번호
      invoiceDate, // 계산서 발행일 (선택)
      invoiceStatus, // 발행 상태 (선택)
    } = body

    if (!type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'type과 ids 배열이 필요합니다' },
        { status: 400 }
      )
    }

    if (!invoiceNumber) {
      return NextResponse.json(
        { error: '계산서 번호가 필요합니다' },
        { status: 400 }
      )
    }

    const updateData: {
      invoiceNumber: string
      invoiceDate?: Date | null
      invoiceStatus?: string
    } = {
      invoiceNumber,
    }

    if (invoiceDate !== undefined) {
      updateData.invoiceDate = invoiceDate ? new Date(invoiceDate) : null
    }

    if (invoiceStatus !== undefined) {
      updateData.invoiceStatus = invoiceStatus
    }

    let result

    if (type === 'sales') {
      result = await prisma.salesInvoiceStatus.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      })
    } else if (type === 'purchase') {
      result = await prisma.purchaseInvoiceStatus.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      })
    } else {
      return NextResponse.json(
        { error: 'type은 sales 또는 purchase여야 합니다' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      invoiceNumber,
    })
  } catch (error) {
    console.error('계산서 번호 일괄 업데이트 오류:', error)
    return NextResponse.json(
      { error: '계산서 번호 일괄 업데이트에 실패했습니다' },
      { status: 500 }
    )
  }
}

// GET /api/management/invoice-status/batch?invoiceNumber=xxx - 계산서 번호로 품목 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const invoiceNumber = searchParams.get('invoiceNumber')
    const type = searchParams.get('type') // 'sales' | 'purchase' | 없으면 둘 다

    if (!invoiceNumber) {
      return NextResponse.json(
        { error: '계산서 번호가 필요합니다' },
        { status: 400 }
      )
    }

    const result: {
      salesItems?: unknown[]
      purchaseItems?: unknown[]
      totalSalesAmount?: number
      totalPurchaseAmount?: number
    } = {}

    if (!type || type === 'sales') {
      const salesItems = await prisma.salesInvoiceStatus.findMany({
        where: { invoiceNumber },
        orderBy: { createdAt: 'asc' },
      })
      result.salesItems = salesItems
      result.totalSalesAmount = salesItems.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0
      )
    }

    if (!type || type === 'purchase') {
      const purchaseItems = await prisma.purchaseInvoiceStatus.findMany({
        where: { invoiceNumber },
        orderBy: { createdAt: 'asc' },
      })
      result.purchaseItems = purchaseItems
      result.totalPurchaseAmount = purchaseItems.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0
      )
    }

    return NextResponse.json({
      invoiceNumber,
      ...result,
    })
  } catch (error) {
    console.error('계산서 번호 조회 오류:', error)
    return NextResponse.json(
      { error: '계산서 번호 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
