import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/stats/company-rank - 매출/매입처 순위
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'sales' // sales 또는 purchase
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 기본: 올해
    const year = new Date().getFullYear()
    const defaultStartDate = new Date(year, 0, 1)
    const defaultEndDate = new Date(year, 11, 31)

    const dateFilter = {
      gte: startDate ? new Date(startDate) : defaultStartDate,
      lte: endDate ? new Date(endDate) : defaultEndDate,
    }

    if (type === 'sales') {
      // 매출처 순위
      const salesRank = await prisma.salesLedger.groupBy({
        by: ['clientCompany'],
        where: {
          isActive: true,
          transactionDate: dateFilter,
        },
        _sum: {
          supplyAmount: true,
          totalAmount: true,
          grossProfit: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            totalAmount: 'desc',
          },
        },
        take: limit,
      })

      // 총 매출 계산
      const totalSales = await prisma.salesLedger.aggregate({
        where: {
          isActive: true,
          transactionDate: dateFilter,
        },
        _sum: {
          supplyAmount: true,
          totalAmount: true,
          grossProfit: true,
        },
        _count: true,
      })

      return NextResponse.json({
        type: 'sales',
        period: {
          startDate: (startDate ? new Date(startDate) : defaultStartDate).toISOString().split('T')[0],
          endDate: (endDate ? new Date(endDate) : defaultEndDate).toISOString().split('T')[0],
        },
        ranking: salesRank.map((item, index) => ({
          rank: index + 1,
          clientCompany: item.clientCompany,
          supplyAmount: item._sum.supplyAmount || 0,
          totalAmount: item._sum.totalAmount || 0,
          grossProfit: item._sum.grossProfit || 0,
          transactionCount: item._count,
          sharePercent: totalSales._sum.totalAmount
            ? ((Number(item._sum.totalAmount || 0) / Number(totalSales._sum.totalAmount)) * 100).toFixed(2)
            : '0',
        })),
        total: {
          supplyAmount: totalSales._sum.supplyAmount || 0,
          totalAmount: totalSales._sum.totalAmount || 0,
          grossProfit: totalSales._sum.grossProfit || 0,
          transactionCount: totalSales._count,
        },
      })
    } else {
      // 매입처 순위
      const purchaseRank = await prisma.purchaseLedger.groupBy({
        by: ['vendorCompany'],
        where: {
          isActive: true,
          invoiceDate: dateFilter,
        },
        _sum: {
          supplyAmount: true,
          totalAmount: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            totalAmount: 'desc',
          },
        },
        take: limit,
      })

      // 총 매입 계산
      const totalPurchase = await prisma.purchaseLedger.aggregate({
        where: {
          isActive: true,
          invoiceDate: dateFilter,
        },
        _sum: {
          supplyAmount: true,
          totalAmount: true,
        },
        _count: true,
      })

      return NextResponse.json({
        type: 'purchase',
        period: {
          startDate: (startDate ? new Date(startDate) : defaultStartDate).toISOString().split('T')[0],
          endDate: (endDate ? new Date(endDate) : defaultEndDate).toISOString().split('T')[0],
        },
        ranking: purchaseRank.map((item, index) => ({
          rank: index + 1,
          vendorCompany: item.vendorCompany,
          supplyAmount: item._sum.supplyAmount || 0,
          totalAmount: item._sum.totalAmount || 0,
          transactionCount: item._count,
          sharePercent: totalPurchase._sum.totalAmount
            ? ((Number(item._sum.totalAmount || 0) / Number(totalPurchase._sum.totalAmount)) * 100).toFixed(2)
            : '0',
        })),
        total: {
          supplyAmount: totalPurchase._sum.supplyAmount || 0,
          totalAmount: totalPurchase._sum.totalAmount || 0,
          transactionCount: totalPurchase._count,
        },
      })
    }
  } catch (error) {
    console.error('거래처 순위 조회 오류:', error)
    return NextResponse.json(
      { error: '거래처 순위를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}
