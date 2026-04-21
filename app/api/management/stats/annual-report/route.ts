import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/stats/annual-report - 연간 통계 리포트
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31)

    const dateFilter = {
      gte: startOfYear,
      lte: endOfYear,
    }

    // 1. 총매출 / 총매입 / GP
    const [totalSales, totalPurchase] = await Promise.all([
      prisma.salesLedger.aggregate({
        where: { isActive: true, transactionDate: dateFilter },
        _sum: {
          supplyAmount: true,
          vatAmount: true,
          totalAmount: true,
          grossProfit: true,
        },
        _count: true,
      }),
      prisma.purchaseLedger.aggregate({
        where: { isActive: true, invoiceDate: dateFilter },
        _sum: {
          supplyAmount: true,
          vatAmount: true,
          totalAmount: true,
        },
        _count: true,
      }),
    ])

    // 2. 월별 매출/매입
    const monthlyStats = []
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)

      const [monthlySales, monthlyPurchase] = await Promise.all([
        prisma.salesLedger.aggregate({
          where: {
            isActive: true,
            transactionDate: { gte: monthStart, lte: monthEnd },
          },
          _sum: {
            supplyAmount: true,
            totalAmount: true,
            grossProfit: true,
          },
          _count: true,
        }),
        prisma.purchaseLedger.aggregate({
          where: {
            isActive: true,
            invoiceDate: { gte: monthStart, lte: monthEnd },
          },
          _sum: {
            supplyAmount: true,
            totalAmount: true,
          },
          _count: true,
        }),
      ])

      monthlyStats.push({
        month: month + 1,
        sales: {
          supplyAmount: monthlySales._sum.supplyAmount || 0,
          totalAmount: monthlySales._sum.totalAmount || 0,
          grossProfit: monthlySales._sum.grossProfit || 0,
          count: monthlySales._count,
        },
        purchase: {
          supplyAmount: monthlyPurchase._sum.supplyAmount || 0,
          totalAmount: monthlyPurchase._sum.totalAmount || 0,
          count: monthlyPurchase._count,
        },
      })
    }

    // 3. 품목별(카테고리별) 매출/GP
    const salesByCategory = await prisma.salesLedger.groupBy({
      by: ['category'],
      where: { isActive: true, transactionDate: dateFilter },
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
    })

    const purchaseByCategory = await prisma.purchaseLedger.groupBy({
      by: ['category'],
      where: { isActive: true, invoiceDate: dateFilter },
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
    })

    // 4. 담당자별 매출/GP
    const salesByManager = await prisma.salesLedger.groupBy({
      by: ['managerName'],
      where: {
        isActive: true,
        transactionDate: dateFilter,
        managerName: { not: null },
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
    })

    // GP 계산 (매출 - 매입 or 명시적 GP 합계)
    const totalGrossProfit = totalSales._sum.grossProfit ||
      (Number(totalSales._sum.supplyAmount || 0) - Number(totalPurchase._sum.supplyAmount || 0))

    return NextResponse.json({
      year,
      summary: {
        totalSales: {
          supplyAmount: totalSales._sum.supplyAmount || 0,
          vatAmount: totalSales._sum.vatAmount || 0,
          totalAmount: totalSales._sum.totalAmount || 0,
          count: totalSales._count,
        },
        totalPurchase: {
          supplyAmount: totalPurchase._sum.supplyAmount || 0,
          vatAmount: totalPurchase._sum.vatAmount || 0,
          totalAmount: totalPurchase._sum.totalAmount || 0,
          count: totalPurchase._count,
        },
        grossProfit: totalGrossProfit,
        gpRate: totalSales._sum.supplyAmount
          ? ((Number(totalGrossProfit) / Number(totalSales._sum.supplyAmount)) * 100).toFixed(2)
          : '0',
      },
      monthly: monthlyStats,
      byCategory: {
        sales: salesByCategory.map((item) => ({
          category: item.category,
          supplyAmount: item._sum.supplyAmount || 0,
          totalAmount: item._sum.totalAmount || 0,
          grossProfit: item._sum.grossProfit || 0,
          count: item._count,
        })),
        purchase: purchaseByCategory.map((item) => ({
          category: item.category,
          supplyAmount: item._sum.supplyAmount || 0,
          totalAmount: item._sum.totalAmount || 0,
          count: item._count,
        })),
      },
      byManager: salesByManager.map((item) => ({
        managerName: item.managerName,
        supplyAmount: item._sum.supplyAmount || 0,
        totalAmount: item._sum.totalAmount || 0,
        grossProfit: item._sum.grossProfit || 0,
        count: item._count,
      })),
    })
  } catch (error) {
    console.error('연간 통계 조회 오류:', error)
    return NextResponse.json(
      { error: '연간 통계를 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}
