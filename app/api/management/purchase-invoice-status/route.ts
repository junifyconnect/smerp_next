import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/purchase-invoice-status - 매입 계산서 발행현황 목록 조회
// SalesApprovalItem 기반 (매입 계산서 = Item의 purchaseInvoiceStatus)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const vendorCompany = searchParams.get('vendorCompany')
    const invoiceStatus = searchParams.get('invoiceStatus')
    const search = searchParams.get('search')
    const approvalId = searchParams.get('approvalId')

    // 최신 버전 승인된 품의서의 Item 중 매입 정보 있는 것만
    const where: Record<string, unknown> = {
      product: {
        approval: {
          status: 'APPROVED',
          isLatest: true,
        },
      },
      vendorName: { not: null },
    }

    if (vendorCompany) {
      where.vendorName = { contains: vendorCompany, mode: 'insensitive' }
    }

    if (invoiceStatus) {
      where.purchaseInvoiceStatus = invoiceStatus
    }

    if (approvalId) {
      where.product = {
        ...(where.product as object),
        approvalId,
      }
    }

    if (search) {
      where.OR = [
        { partNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.salesApprovalItem.findMany({
        where,
        include: {
          product: {
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
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesApprovalItem.count({ where }),
    ])

    const result = items.map(item => ({
      id: item.id,
      approvalId: item.product.approvalId,
      approvalCode: item.product.approval.approvalCode,
      approvalVersion: item.product.approval.version,
      approvalDate: item.product.approval.approvalDate,
      clientCompany: item.product.approval.clientCompany,
      managerName: item.product.approval.managerName,
      productName: item.product.name,
      partNumber: item.partNumber,
      description: item.description,
      quantity: item.purchaseQty,
      purchasePrice: item.purchasePrice,
      purchaseTotal: item.purchaseTotal,
      vendorName: item.vendorName,
      purchaseDate: item.purchaseDate,
      invoiceStatus: item.purchaseInvoiceStatus,
      invoiceDate: item.purchaseInvoiceDate,
      createdAt: item.createdAt,
    }))

    const totalPrice = items.reduce((sum, i) => sum + Number(i.purchaseTotal || 0), 0)

    // 상태별 집계
    const statusCounts = await prisma.salesApprovalItem.groupBy({
      by: ['purchaseInvoiceStatus'],
      where: {
        product: { approval: { status: 'APPROVED', isLatest: true } },
        vendorName: { not: null },
      },
      _count: true,
    })

    const byInvoiceStatus = statusCounts.reduce((acc: Record<string, number>, item) => {
      acc[item.purchaseInvoiceStatus] = item._count
      return acc
    }, {} as Record<string, number>)

    // 매입처별 집계
    const vendorCounts = await prisma.salesApprovalItem.groupBy({
      by: ['vendorName'],
      where: {
        product: { approval: { status: 'APPROVED', isLatest: true } },
        vendorName: { not: null },
      },
      _count: true,
    })

    const byVendorCompany = vendorCounts.reduce((acc: Record<string, number>, item) => {
      if (item.vendorName) acc[item.vendorName] = item._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      items: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: { totalPrice, count: total, byInvoiceStatus, byVendorCompany },
    })
  } catch (error) {
    console.error('매입 계산서 발행현황 조회 오류:', error)
    return NextResponse.json({ error: '목록을 불러오는데 실패했습니다' }, { status: 500 })
  }
}

// PATCH /api/management/purchase-invoice-status - 발행 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, invoiceStatus, invoiceDate } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '업데이트할 항목을 선택해주세요' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (invoiceStatus) updateData.purchaseInvoiceStatus = invoiceStatus
    if (invoiceDate !== undefined) updateData.purchaseInvoiceDate = invoiceDate ? new Date(invoiceDate) : null

    const result = await prisma.salesApprovalItem.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    })

    return NextResponse.json({ message: `${result.count}건이 업데이트되었습니다`, count: result.count })
  } catch (error) {
    console.error('매입 계산서 발행현황 업데이트 오류:', error)
    return NextResponse.json({ error: '업데이트에 실패했습니다' }, { status: 500 })
  }
}
