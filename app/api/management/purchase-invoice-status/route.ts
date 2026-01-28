import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/purchase-invoice-status - 매입 계산서 발행현황 목록 조회
// InvoiceRecord 테이블에서 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 필터 파라미터
    const yearMonth = searchParams.get('yearMonth') // 25.12 형식
    const vendorCompany = searchParams.get('vendorCompany')
    const invoiceStatus = searchParams.get('invoiceStatus') // PENDING, ISSUED, AMENDED, CANCELLED
    const search = searchParams.get('search')
    const approvalId = searchParams.get('approvalId')

    // InvoiceRecord 조회 조건
    const where: Record<string, unknown> = {
      invoiceType: 'PURCHASE',
    }

    if (vendorCompany) {
      where.vendorCompany = { contains: vendorCompany, mode: 'insensitive' }
    }

    if (invoiceStatus) {
      where.status = invoiceStatus
    }

    if (approvalId) {
      where.approvalId = approvalId
    }

    // yearMonth 필터 (발행일 기준)
    if (yearMonth) {
      const [year, month] = yearMonth.split('.')
      const fullYear = parseInt(`20${year}`)
      const monthNum = parseInt(month)
      const startDate = new Date(fullYear, monthNum - 1, 1)
      const endDate = new Date(fullYear, monthNum, 0, 23, 59, 59)
      where.OR = [
        // 발행일 기준
        {
          invoiceDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        // 미발행인 경우 생성일 기준
        {
          status: 'PENDING',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      ]
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { productName: { contains: search, mode: 'insensitive' } },
            { partNumber: { contains: search, mode: 'insensitive' } },
            { vendorCompany: { contains: search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    // 전체 개수 조회
    const total = await prisma.invoiceRecord.count({ where })

    // 페이지네이션 적용하여 조회
    const records = await prisma.invoiceRecord.findMany({
      where,
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
      },
      orderBy: [
        { invoiceDate: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    })

    // 결과 변환
    const items = records.map(record => ({
      id: record.id,
      approvalId: record.approvalId,
      itemId: record.itemId,
      approvalCode: record.approval.approvalCode,
      approvalVersion: record.approval.version,
      approvalDate: record.approval.approvalDate,
      clientCompany: record.clientCompany || record.approval.clientCompany,
      managerName: record.approval.managerName,
      partNumber: record.partNumber,
      productName: record.productName,
      quantity: record.quantity,
      unitPrice: record.unitPrice,
      totalPrice: record.totalPrice,
      vendorCompany: record.vendorCompany,
      invoiceStatus: record.status,
      invoiceDate: record.invoiceDate,
      invoiceNumber: record.invoiceNumber,
      invoiceRemarks: record.remarks,
      createdAt: record.createdAt,
    }))

    // 집계
    const totalPrice = records.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)

    // 발행 상태별 집계 (전체 기준)
    const statusCounts = await prisma.invoiceRecord.groupBy({
      by: ['status'],
      where: { invoiceType: 'PURCHASE' },
      _count: true,
    })
    const byInvoiceStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)

    // 매입처별 집계 (전체 기준)
    const vendorCounts = await prisma.invoiceRecord.groupBy({
      by: ['vendorCompany'],
      where: { invoiceType: 'PURCHASE', vendorCompany: { not: null } },
      _count: true,
    })
    const byVendorCompany = vendorCounts.reduce((acc, item) => {
      if (item.vendorCompany) {
        acc[item.vendorCompany] = item._count
      }
      return acc
    }, {} as Record<string, number>)

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
        byVendorCompany,
      },
    })
  } catch (error) {
    console.error('매입 계산서 발행현황 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST /api/management/purchase-invoice-status - 계산서 발행 기록 생성
// 아이템에서 InvoiceRecord로 복사
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemIds, approvalId } = body

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: '발행할 항목을 선택해주세요' },
        { status: 400 }
      )
    }

    // 품의서 정보 조회
    const approval = await prisma.salesApproval.findUnique({
      where: { id: approvalId },
      select: {
        id: true,
        originalId: true,
        clientCompany: true,
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const chainRootId = approval.originalId || approval.id

    // 아이템 조회
    const items = await prisma.salesApprovalPurchaseItem.findMany({
      where: { id: { in: itemIds } },
    })

    // InvoiceRecord 생성
    const records = await Promise.all(
      items.map(item =>
        prisma.invoiceRecord.create({
          data: {
            approvalId: chainRootId,
            itemId: item.id,
            invoiceType: 'PURCHASE',
            productName: item.productName,
            partNumber: item.partNumber,
            quantity: item.quantity,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
            vendorCompany: item.vendorCompany,
            clientCompany: approval.clientCompany,
            status: 'PENDING',
          },
        })
      )
    )

    return NextResponse.json({
      message: `${records.length}건의 발행 기록이 생성되었습니다`,
      count: records.length,
      ids: records.map(r => r.id),
    })
  } catch (error) {
    console.error('매입 계산서 발행 기록 생성 오류:', error)
    return NextResponse.json(
      { error: '발행 기록 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/management/purchase-invoice-status - 계산서 발행 상태 일괄 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, invoiceStatus, invoiceDate, invoiceNumber, remarks } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '업데이트할 항목을 선택해주세요' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (invoiceStatus) {
      updateData.status = invoiceStatus
    }

    if (invoiceDate !== undefined) {
      updateData.invoiceDate = invoiceDate ? new Date(invoiceDate) : null
    }

    if (invoiceNumber !== undefined) {
      updateData.invoiceNumber = invoiceNumber
    }

    if (remarks !== undefined) {
      updateData.remarks = remarks
    }

    const result = await prisma.invoiceRecord.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    })

    return NextResponse.json({
      message: `${result.count}건이 업데이트되었습니다`,
      count: result.count,
    })
  } catch (error) {
    console.error('매입 계산서 발행현황 업데이트 오류:', error)
    return NextResponse.json(
      { error: '업데이트에 실패했습니다' },
      { status: 500 }
    )
  }
}
