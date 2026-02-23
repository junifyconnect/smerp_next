import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/sales-invoice-status - 매출 계산서 발행현황 목록 조회
// SalesApprovalProduct 기반 (매출 계산서 = Product 단위)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const clientCompany = searchParams.get('clientCompany')
    const invoiceStatus = searchParams.get('invoiceStatus')
    const search = searchParams.get('search')
    const approvalId = searchParams.get('approvalId')

    // 최신 버전 승인된 품의서의 Product 조회
    const where: Record<string, unknown> = {
      approval: {
        status: 'APPROVED',
        isLatest: true,
      },
    }

    if (clientCompany) {
      where.approval = {
        ...(where.approval as object),
        clientCompany: { contains: clientCompany, mode: 'insensitive' },
      }
    }

    if (invoiceStatus) {
      where.salesInvoiceStatus = invoiceStatus
    }

    if (approvalId) {
      where.approvalId = approvalId
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [products, total] = await Promise.all([
      prisma.salesApprovalProduct.findMany({
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
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesApprovalProduct.count({ where }),
    ])

    const items = products.map(product => ({
      id: product.id,
      approvalId: product.approvalId,
      approvalCode: product.approval.approvalCode,
      approvalVersion: product.approval.version,
      approvalDate: product.approval.approvalDate,
      clientCompany: product.approval.clientCompany,
      managerName: product.approval.managerName,
      productName: product.name,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      totalPrice: product.totalPrice,
      invoiceStatus: product.salesInvoiceStatus,
      invoiceDate: product.salesInvoiceDate,
      createdAt: product.createdAt,
    }))

    const totalPrice = products.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0)

    // 상태별 집계
    const statusCounts = await prisma.salesApprovalProduct.groupBy({
      by: ['salesInvoiceStatus'],
      where: { approval: { status: 'APPROVED', isLatest: true } },
      _count: true,
    })

    const byInvoiceStatus = statusCounts.reduce((acc: Record<string, number>, item) => {
      acc[item.salesInvoiceStatus] = item._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: { totalPrice, count: total, byInvoiceStatus },
    })
  } catch (error) {
    console.error('매출 계산서 발행현황 조회 오류:', error)
    return NextResponse.json({ error: '목록을 불러오는데 실패했습니다' }, { status: 500 })
  }
}

// PATCH /api/management/sales-invoice-status - 계산서 발행 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, invoiceStatus, invoiceDate } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '업데이트할 항목을 선택해주세요' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (invoiceStatus) updateData.salesInvoiceStatus = invoiceStatus
    if (invoiceDate !== undefined) updateData.salesInvoiceDate = invoiceDate ? new Date(invoiceDate) : null

    const result = await prisma.salesApprovalProduct.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    })

    return NextResponse.json({ message: `${result.count}건이 업데이트되었습니다`, count: result.count })
  } catch (error) {
    console.error('매출 계산서 발행현황 업데이트 오류:', error)
    return NextResponse.json({ error: '업데이트에 실패했습니다' }, { status: 500 })
  }
}
