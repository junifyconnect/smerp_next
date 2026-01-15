import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/stats/monthly-forecast - 월말 입출금 예정 내역
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    // 해당 월의 시작일과 마지막일
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0) // 해당 월의 마지막 날

    // 외상매출금 입금예정 (매출장에서 결제예정일이 해당 월인 미결제 건)
    const receivables = await prisma.salesLedger.findMany({
      where: {
        paymentDueDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
      orderBy: { paymentDueDate: 'asc' },
    })

    const receivablesByCompany = await prisma.salesLedger.groupBy({
      by: ['clientCompany'],
      where: {
        paymentDueDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
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

    // 외상매입금 출금예정 (매입장에서 결제예정일이 해당 월인 미결제 건)
    const payables = await prisma.purchaseLedger.findMany({
      where: {
        paymentDueDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
      orderBy: { paymentDueDate: 'asc' },
    })

    const payablesByCompany = await prisma.purchaseLedger.groupBy({
      by: ['vendorCompany'],
      where: {
        paymentDueDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
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

    // 합계 계산
    const totalReceivables = receivables.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0),
      0
    )
    const totalPayables = payables.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0),
      0
    )

    return NextResponse.json({
      period: {
        year,
        month,
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
      },
      receivables: {
        items: receivables,
        byCompany: receivablesByCompany.map((item) => ({
          clientCompany: item.clientCompany,
          totalAmount: item._sum.totalAmount || 0,
          count: item._count,
        })),
        total: totalReceivables,
        count: receivables.length,
      },
      payables: {
        items: payables,
        byCompany: payablesByCompany.map((item) => ({
          vendorCompany: item.vendorCompany,
          totalAmount: item._sum.totalAmount || 0,
          count: item._count,
        })),
        total: totalPayables,
        count: payables.length,
      },
      netCashFlow: totalReceivables - totalPayables,
    })
  } catch (error) {
    console.error('월말 입출금 예정 조회 오류:', error)
    return NextResponse.json(
      { error: '월말 입출금 예정 내역을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}
