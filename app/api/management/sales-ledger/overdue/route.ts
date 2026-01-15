import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { PaymentStatus, Prisma } from '@prisma/client'

// GET /api/management/sales-ledger/overdue - 연체 업체 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 결제예정일이 지났고, 결제가 완료되지 않은 건들
    const where: Prisma.SalesLedgerWhereInput = {
      paymentDueDate: { lt: today },
      paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
    }

    const [items, total, aggregations] = await Promise.all([
      prisma.salesLedger.findMany({
        where,
        orderBy: { paymentDueDate: 'asc' }, // 오래된 연체 건부터
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesLedger.count({ where }),
      prisma.salesLedger.aggregate({
        where,
        _sum: {
          totalAmount: true,
        },
        _count: true,
      }),
    ])

    // 연체일수 계산 추가
    const itemsWithOverdueDays = items.map((item) => ({
      ...item,
      overdueDays: item.paymentDueDate
        ? Math.floor(
            (today.getTime() - new Date(item.paymentDueDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0,
    }))

    // 업체별 연체 합계
    const overdueByCompany = await prisma.salesLedger.groupBy({
      by: ['clientCompany'],
      where,
      _sum: {
        totalAmount: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          totalAmount: 'desc',
        },
      },
    })

    return NextResponse.json({
      items: itemsWithOverdueDays,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalOverdueAmount: aggregations._sum?.totalAmount || 0,
        totalOverdueCount: aggregations._count,
      },
      overdueByCompany: overdueByCompany.map((item) => ({
        clientCompany: item.clientCompany,
        totalAmount: item._sum?.totalAmount || 0,
        count: item._count,
      })),
    })
  } catch (error) {
    console.error('연체 업체 조회 오류:', error)
    return NextResponse.json(
      { error: '연체 업체 목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}
