import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/management/stats/annual-report - 연간 통계 리포트
//
// BUSINESS_RULES §10.1: MABilling도 원장 역할이므로 집계에 포함한다.
// - 총매출/매입 = SalesLedger + MABilling(salesAmount>0) / PurchaseLedger + MABilling(purchaseAmount>0)
// - 월별 집계: transactionDate/invoiceDate → MABilling은 dueDate 기준
// - 카테고리별: MABilling은 MA 고정
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(
      searchParams.get('year') || new Date().getFullYear().toString()
    )

    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31)
    const dateFilter = { gte: startOfYear, lte: endOfYear }

    // ─────────────────────────────────────────
    // 1. 총매출 / 총매입 — 영업 + MA UNION 집계
    // ─────────────────────────────────────────
    const [totalSalesLedger, totalPurchaseLedger, maBillings] = await Promise.all([
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
        _sum: { supplyAmount: true, vatAmount: true, totalAmount: true },
        _count: true,
      }),
      // MA 연간 전체 (월별 집계도 여기서 재사용)
      prisma.mABilling.findMany({
        where: { isActive: true, dueDate: dateFilter },
        select: {
          dueDate: true,
          salesAmount: true,
          salesVatAmount: true,
          salesTotalAmount: true,
          purchaseAmount: true,
          purchaseVatAmount: true,
          purchaseTotalAmount: true,
          vendorCompany: true,
        },
      }),
    ])

    const maSalesBillings = maBillings.filter((b) => Number(b.salesAmount) > 0)
    const maPurchaseBillings = maBillings.filter(
      (b) => Number(b.purchaseAmount) > 0 && b.vendorCompany
    )

    const sumNum = (list: unknown[], getter: (x: unknown) => number) =>
      list.reduce<number>((s, x) => s + getter(x), 0)

    const maSalesSupply = sumNum(maSalesBillings, (b) => Number((b as typeof maBillings[number]).salesAmount))
    const maSalesVat = sumNum(maSalesBillings, (b) => Number((b as typeof maBillings[number]).salesVatAmount))
    const maSalesTotal = sumNum(maSalesBillings, (b) => Number((b as typeof maBillings[number]).salesTotalAmount))
    const maSalesCount = maSalesBillings.length

    const maPurchaseSupply = sumNum(maPurchaseBillings, (b) => Number((b as typeof maBillings[number]).purchaseAmount))
    const maPurchaseVat = sumNum(maPurchaseBillings, (b) => Number((b as typeof maBillings[number]).purchaseVatAmount))
    const maPurchaseTotal = sumNum(maPurchaseBillings, (b) => Number((b as typeof maBillings[number]).purchaseTotalAmount))
    const maPurchaseCount = maPurchaseBillings.length

    const totalSalesSupply =
      Number(totalSalesLedger._sum.supplyAmount || 0) + maSalesSupply
    const totalSalesVat =
      Number(totalSalesLedger._sum.vatAmount || 0) + maSalesVat
    const totalSalesTotal =
      Number(totalSalesLedger._sum.totalAmount || 0) + maSalesTotal
    const totalSalesCount = totalSalesLedger._count + maSalesCount

    const totalPurchaseSupply =
      Number(totalPurchaseLedger._sum.supplyAmount || 0) + maPurchaseSupply
    const totalPurchaseVat =
      Number(totalPurchaseLedger._sum.vatAmount || 0) + maPurchaseVat
    const totalPurchaseTotal =
      Number(totalPurchaseLedger._sum.totalAmount || 0) + maPurchaseTotal
    const totalPurchaseCount = totalPurchaseLedger._count + maPurchaseCount

    // ─────────────────────────────────────────
    // 2. 월별 매출/매입
    // ─────────────────────────────────────────
    const monthlyStats = []
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)

      const [monthlySalesLedger, monthlyPurchaseLedger] = await Promise.all([
        prisma.salesLedger.aggregate({
          where: {
            isActive: true,
            transactionDate: { gte: monthStart, lte: monthEnd },
          },
          _sum: { supplyAmount: true, totalAmount: true, grossProfit: true },
          _count: true,
        }),
        prisma.purchaseLedger.aggregate({
          where: {
            isActive: true,
            invoiceDate: { gte: monthStart, lte: monthEnd },
          },
          _sum: { supplyAmount: true, totalAmount: true },
          _count: true,
        }),
      ])

      // MA (메모리 필터)
      const monthMaSales = maSalesBillings.filter(
        (b) => b.dueDate >= monthStart && b.dueDate <= monthEnd
      )
      const monthMaPurchase = maPurchaseBillings.filter(
        (b) => b.dueDate >= monthStart && b.dueDate <= monthEnd
      )

      const monthMaSalesSupply = sumNum(monthMaSales, (b) => Number((b as typeof maBillings[number]).salesAmount))
      const monthMaSalesTotal = sumNum(monthMaSales, (b) => Number((b as typeof maBillings[number]).salesTotalAmount))
      const monthMaPurchaseSupply = sumNum(monthMaPurchase, (b) => Number((b as typeof maBillings[number]).purchaseAmount))
      const monthMaPurchaseTotal = sumNum(monthMaPurchase, (b) => Number((b as typeof maBillings[number]).purchaseTotalAmount))

      const monthGpFromLedger = Number(
        monthlySalesLedger._sum.grossProfit || 0
      )
      const monthMaGp = monthMaSalesSupply - monthMaPurchaseSupply

      monthlyStats.push({
        month: month + 1,
        sales: {
          supplyAmount:
            Number(monthlySalesLedger._sum.supplyAmount || 0) + monthMaSalesSupply,
          totalAmount:
            Number(monthlySalesLedger._sum.totalAmount || 0) + monthMaSalesTotal,
          grossProfit: monthGpFromLedger + monthMaGp,
          count: monthlySalesLedger._count + monthMaSales.length,
        },
        purchase: {
          supplyAmount:
            Number(monthlyPurchaseLedger._sum.supplyAmount || 0) +
            monthMaPurchaseSupply,
          totalAmount:
            Number(monthlyPurchaseLedger._sum.totalAmount || 0) +
            monthMaPurchaseTotal,
          count: monthlyPurchaseLedger._count + monthMaPurchase.length,
        },
      })
    }

    // ─────────────────────────────────────────
    // 3. 카테고리별 집계 (SalesLedger + MA 묶음 추가)
    // ─────────────────────────────────────────
    const salesByCategoryLedger = await prisma.salesLedger.groupBy({
      by: ['category'],
      where: { isActive: true, transactionDate: dateFilter },
      _sum: { supplyAmount: true, totalAmount: true, grossProfit: true },
      _count: true,
    })
    const purchaseByCategoryLedger = await prisma.purchaseLedger.groupBy({
      by: ['category'],
      where: { isActive: true, invoiceDate: dateFilter },
      _sum: { supplyAmount: true, totalAmount: true },
      _count: true,
    })

    const salesByCategory = salesByCategoryLedger.map((item) => ({
      category: item.category,
      supplyAmount: Number(item._sum.supplyAmount || 0),
      totalAmount: Number(item._sum.totalAmount || 0),
      grossProfit: Number(item._sum.grossProfit || 0),
      count: item._count,
    }))
    const purchaseByCategory = purchaseByCategoryLedger.map((item) => ({
      category: item.category,
      supplyAmount: Number(item._sum.supplyAmount || 0),
      totalAmount: Number(item._sum.totalAmount || 0),
      count: item._count,
    }))

    // MA 행이 있으면 카테고리 'MA' 집계에 가산 (기존 행이 있으면 합산, 없으면 새로 추가)
    if (maSalesCount > 0) {
      const maSalesGp = maSalesSupply - maPurchaseSupply
      const existing = salesByCategory.find((c) => c.category === 'MA')
      if (existing) {
        existing.supplyAmount += maSalesSupply
        existing.totalAmount += maSalesTotal
        existing.grossProfit += maSalesGp
        existing.count += maSalesCount
      } else {
        salesByCategory.push({
          category: 'MA',
          supplyAmount: maSalesSupply,
          totalAmount: maSalesTotal,
          grossProfit: maSalesGp,
          count: maSalesCount,
        })
      }
    }
    if (maPurchaseCount > 0) {
      const existing = purchaseByCategory.find((c) => c.category === 'MA')
      if (existing) {
        existing.supplyAmount += maPurchaseSupply
        existing.totalAmount += maPurchaseTotal
        existing.count += maPurchaseCount
      } else {
        purchaseByCategory.push({
          category: 'MA',
          supplyAmount: maPurchaseSupply,
          totalAmount: maPurchaseTotal,
          count: maPurchaseCount,
        })
      }
    }

    salesByCategory.sort((a, b) => b.totalAmount - a.totalAmount)
    purchaseByCategory.sort((a, b) => b.totalAmount - a.totalAmount)

    // ─────────────────────────────────────────
    // 4. 담당자별 — MA는 MAApproval에 매니저 정보가 분리되어 있어 이 PR에선 영업만 집계.
    //    향후 MAApproval.managerName을 UNION하려면 별도 쿼리 필요.
    // ─────────────────────────────────────────
    const salesByManager = await prisma.salesLedger.groupBy({
      by: ['managerName'],
      where: {
        isActive: true,
        transactionDate: dateFilter,
        managerName: { not: null },
      },
      _sum: { supplyAmount: true, totalAmount: true, grossProfit: true },
      _count: true,
      orderBy: { _sum: { totalAmount: 'desc' } },
    })

    // ─────────────────────────────────────────
    // 5. GP — 영업(명시적 grossProfit) + MA(salesSupply - purchaseSupply)
    // ─────────────────────────────────────────
    const ledgerGp = Number(totalSalesLedger._sum.grossProfit || 0)
    const maGp = maSalesSupply - maPurchaseSupply
    const totalGrossProfit = ledgerGp + maGp
    const gpRate = totalSalesSupply
      ? ((totalGrossProfit / totalSalesSupply) * 100).toFixed(2)
      : '0'

    return NextResponse.json({
      year,
      summary: {
        totalSales: {
          supplyAmount: totalSalesSupply,
          vatAmount: totalSalesVat,
          totalAmount: totalSalesTotal,
          count: totalSalesCount,
          breakdown: {
            salesApproval: {
              supplyAmount: Number(totalSalesLedger._sum.supplyAmount || 0),
              count: totalSalesLedger._count,
            },
            maBilling: {
              supplyAmount: maSalesSupply,
              count: maSalesCount,
            },
          },
        },
        totalPurchase: {
          supplyAmount: totalPurchaseSupply,
          vatAmount: totalPurchaseVat,
          totalAmount: totalPurchaseTotal,
          count: totalPurchaseCount,
          breakdown: {
            salesApproval: {
              supplyAmount: Number(totalPurchaseLedger._sum.supplyAmount || 0),
              count: totalPurchaseLedger._count,
            },
            maBilling: {
              supplyAmount: maPurchaseSupply,
              count: maPurchaseCount,
            },
          },
        },
        grossProfit: totalGrossProfit,
        gpRate,
      },
      monthly: monthlyStats,
      byCategory: {
        sales: salesByCategory,
        purchase: purchaseByCategory,
      },
      byManager: salesByManager.map((item) => ({
        managerName: item.managerName,
        supplyAmount: Number(item._sum.supplyAmount || 0),
        totalAmount: Number(item._sum.totalAmount || 0),
        grossProfit: Number(item._sum.grossProfit || 0),
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
