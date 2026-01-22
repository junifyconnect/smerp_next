import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/ma-approvals - 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { approvalNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.mAApproval.findMany({
        where,
        include: {
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mAApproval.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('MA 품의서 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// 통합 품목 아이템 타입
interface MAApprovalItemInput {
  smCode?: string
  vendorCode?: string
  clientCompany?: string
  salesCompany?: string
  salesPrice?: number
  quantity?: number
  salesBillingType?: string
  startDate?: string
  endDate?: string
  purchaseCompany?: string
  purchasePrice?: number
  purchaseBillingType?: string
  sortOrder?: number
}

// POST /api/ma-approvals - 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      approvalDate,
      managerName,
      notes,
      items = [],
    } = body

    // TODO: 실제 인증된 사용자 ID 사용
    const createdById = 'dummy-user-id'

    // 품의번호 생성 (MA-YYYY-NNNN)
    const year = new Date().getFullYear()
    const lastApproval = await prisma.mAApproval.findFirst({
      where: { approvalNumber: { startsWith: `MA-${year}-` } },
      orderBy: { approvalNumber: 'desc' },
    })

    let sequence = 1
    if (lastApproval) {
      const lastNum = parseInt(lastApproval.approvalNumber.split('-')[2])
      sequence = lastNum + 1
    }
    const approvalNumber = `MA-${year}-${sequence.toString().padStart(4, '0')}`

    // 통합 품목 처리 및 금액 계산
    let totalAmount = 0
    let purchaseTotal = 0

    const itemsData = items.map((item: MAApprovalItemInput, index: number) => {
      const qty = item.quantity || 1
      const salesPrice = item.salesPrice || 0
      const purchasePrice = item.purchasePrice || 0

      totalAmount += salesPrice * qty
      purchaseTotal += purchasePrice * qty

      return {
        sortOrder: item.sortOrder ?? index,
        smCode: item.smCode,
        vendorCode: item.vendorCode,
        clientCompany: item.clientCompany,
        salesCompany: item.salesCompany,
        salesPrice: salesPrice,
        quantity: qty,
        salesBillingType: item.salesBillingType,
        startDate: item.startDate ? new Date(item.startDate) : null,
        endDate: item.endDate ? new Date(item.endDate) : null,
        purchaseCompany: item.purchaseCompany,
        purchasePrice: purchasePrice,
        purchaseBillingType: item.purchaseBillingType,
      }
    })

    const approval = await prisma.mAApproval.create({
      data: {
        approvalNumber,
        approvalDate: approvalDate ? new Date(approvalDate) : null,
        managerName,
        notes,
        totalAmount,
        purchaseTotal,
        createdById,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(approval, { status: 201 })
  } catch (error) {
    console.error('MA 품의서 생성 오류:', error)
    return NextResponse.json(
      { error: 'MA 품의서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
