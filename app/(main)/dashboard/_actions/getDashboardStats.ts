'use server'

import prisma from '@/lib/db'
import { actionAuth } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { z } from 'zod'
import type {
  DashboardData,
  DashboardRole,
  SalesDashboardData,
  FinanceDashboardData,
  CeoDashboardData,
  CommonWidgets,
} from '../_types/dashboard'

const getDashboardStatsSchema = z.void()

function resolveRole(department: string | null): DashboardRole {
  if (department === 'ADMIN') return 'ADMIN'
  if (department === 'FINANCE') return 'FINANCE'
  // SALES / MA / null / 기타 → SALES 뷰 (기본)
  return 'SALES'
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

async function getCommonWidgets(userId: string): Promise<CommonWidgets> {
  const now = new Date()
  const dayStart = startOfDay(now)
  const dayEnd = endOfDay(now)

  const [unreadNotifications, events] = await Promise.all([
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
    prisma.calendarEvent.findMany({
      where: {
        AND: [
          { startDate: { lte: dayEnd } },
          {
            OR: [
              { endDate: { gte: dayStart } },
              { AND: [{ endDate: null }, { startDate: { gte: dayStart } }] },
            ],
          },
        ],
        OR: [{ userId }, { isCompanyWide: true }],
      },
      select: { id: true, title: true, startDate: true, isAllDay: true },
      orderBy: { startDate: 'asc' },
      take: 10,
    }),
  ])

  return {
    unreadNotifications,
    todayEvents: events.map((e) => ({
      id: e.id,
      title: e.title,
      startDate: e.startDate.toISOString(),
      isAllDay: e.isAllDay,
    })),
  }
}

async function buildSalesDashboard(
  userId: string,
  userName: string | null
): Promise<SalesDashboardData> {
  const now = new Date()
  const mStart = startOfMonth(now)
  const mEnd = endOfMonth(now)

  const [
    myApprovalsGrouped,
    myPendingApprovals,
    thisMonthSalesLedger,
    thisMonthApprovedCount,
    recentRejected,
    common,
  ] = await Promise.all([
    prisma.salesApproval.groupBy({
      by: ['status'],
      where: { createdById: userId, isLatest: true },
      _count: true,
    }),
    prisma.salesApproval.findMany({
      where: {
        createdById: userId,
        status: { in: ['PENDING', 'PENDING_TEAM_LEAD', 'PENDING_CEO'] },
        isLatest: true,
      },
      select: {
        id: true,
        approvalNumber: true,
        status: true,
        clientCompany: true,
        totalSalesAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    userName
      ? prisma.salesLedger.aggregate({
          where: {
            isActive: true,
            managerName: userName,
            transactionDate: { gte: mStart, lte: mEnd },
          },
          _sum: { supplyAmount: true },
        })
      : Promise.resolve({ _sum: { supplyAmount: null } }),
    prisma.salesApproval.count({
      where: {
        createdById: userId,
        status: 'APPROVED',
        approvalDate: { gte: mStart, lte: mEnd },
      },
    }),
    prisma.salesApproval.findMany({
      where: { createdById: userId, status: 'REJECTED' },
      select: {
        id: true,
        approvalNumber: true,
        rejectedAt: true,
        rejectionReason: true,
      },
      orderBy: { rejectedAt: 'desc' },
      take: 5,
    }),
    getCommonWidgets(userId),
  ])

  const statusMap = new Map<string, number>()
  for (const row of myApprovalsGrouped) {
    statusMap.set(row.status, row._count)
  }
  const pending =
    (statusMap.get('PENDING') || 0) +
    (statusMap.get('PENDING_TEAM_LEAD') || 0) +
    (statusMap.get('PENDING_CEO') || 0)

  return {
    role: 'SALES',
    myApprovalStatus: {
      draft: statusMap.get('DRAFT') || 0,
      pending,
      approved: statusMap.get('APPROVED') || 0,
      rejected: statusMap.get('REJECTED') || 0,
    },
    myPendingApprovals: myPendingApprovals.map((a) => ({
      id: a.id,
      approvalNumber: a.approvalNumber,
      status: a.status,
      clientCompany: a.clientCompany,
      totalSalesAmount: Number(a.totalSalesAmount),
      createdAt: a.createdAt.toISOString(),
    })),
    thisMonthSales: Number(thisMonthSalesLedger._sum.supplyAmount || 0),
    thisMonthApprovedCount,
    recentRejected: recentRejected.map((a) => ({
      id: a.id,
      approvalNumber: a.approvalNumber,
      rejectedAt: a.rejectedAt?.toISOString() || null,
      rejectionReason: a.rejectionReason,
    })),
    common,
  }
}

async function buildFinanceDashboard(userId: string): Promise<FinanceDashboardData> {
  const now = new Date()
  const mStart = startOfMonth(now)
  const mEnd = endOfMonth(now)
  const today = startOfDay(now)

  const [
    pendingInvoicesGrouped,
    needsAmendment,
    thisMonthMABilling,
    salesReceivablesSL,
    salesReceivablesMA,
    overdueSalesLedger,
    overdueMABillingSales,
    overduePurchase,
    common,
  ] = await Promise.all([
    prisma.invoiceRecord.groupBy({
      by: ['invoiceType'],
      where: { status: 'PENDING' },
      _count: true,
    }),
    prisma.invoiceRecord.count({
      where: { status: 'NEEDS_AMENDMENT' },
    }),
    prisma.mABilling.findMany({
      where: { isActive: true, dueDate: { gte: mStart, lte: mEnd } },
      select: {
        id: true,
        billingMonth: true,
        dueDate: true,
        clientCompany: true,
        itemName: true,
        salesTotalAmount: true,
        purchaseTotalAmount: true,
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    }),
    prisma.salesLedger.aggregate({
      where: { isActive: true, paymentStatus: 'PENDING' },
      _sum: { totalAmount: true },
    }),
    prisma.mABilling.aggregate({
      where: { isActive: true, paymentStatus: 'PENDING' },
      _sum: { salesTotalAmount: true },
    }),
    prisma.salesLedger.count({
      where: {
        isActive: true,
        paymentDueDate: { lt: today },
        paymentDate: null,
      },
    }),
    prisma.mABilling.count({
      where: {
        isActive: true,
        dueDate: { lt: today },
        paymentDate: null,
      },
    }),
    prisma.purchaseLedger.count({
      where: {
        isActive: true,
        paymentDueDate: { lt: today },
        paymentDate: null,
      },
    }),
    getCommonWidgets(userId),
  ])

  const pendingSales =
    pendingInvoicesGrouped.find((r) => r.invoiceType === 'SALES')?._count || 0
  const pendingPurchase =
    pendingInvoicesGrouped.find((r) => r.invoiceType === 'PURCHASE')?._count || 0

  const receivables =
    Number(salesReceivablesSL._sum.totalAmount || 0) +
    Number(salesReceivablesMA._sum.salesTotalAmount || 0)

  return {
    role: 'FINANCE',
    pendingInvoices: { sales: pendingSales, purchase: pendingPurchase },
    needsAmendment,
    thisMonthMABilling: thisMonthMABilling.map((b) => ({
      id: b.id,
      billingMonth: b.billingMonth.toISOString(),
      dueDate: b.dueDate.toISOString(),
      clientCompany: b.clientCompany,
      itemName: b.itemName,
      salesTotalAmount: Number(b.salesTotalAmount),
      purchaseTotalAmount: Number(b.purchaseTotalAmount),
    })),
    receivables,
    overdue: {
      salesCount: overdueSalesLedger + overdueMABillingSales,
      purchaseCount: overduePurchase,
    },
    common,
  }
}

async function buildCeoDashboard(userId: string): Promise<CeoDashboardData> {
  const now = new Date()
  const year = now.getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

  const [
    yearSalesLedger,
    yearPurchaseLedger,
    yearMABillings,
    monthlySalesLedger,
    monthlyPurchaseLedger,
    byManager,
    byClientLedger,
    myPendingSales,
    myPendingMA,
    common,
  ] = await Promise.all([
    prisma.salesLedger.aggregate({
      where: { isActive: true, transactionDate: { gte: yearStart, lte: yearEnd } },
      _sum: { supplyAmount: true, grossProfit: true },
    }),
    prisma.purchaseLedger.aggregate({
      where: { isActive: true, invoiceDate: { gte: yearStart, lte: yearEnd } },
      _sum: { supplyAmount: true },
    }),
    prisma.mABilling.findMany({
      where: { isActive: true, dueDate: { gte: yearStart, lte: yearEnd } },
      select: { dueDate: true, salesAmount: true, purchaseAmount: true },
    }),
    Promise.all(
      Array.from({ length: 12 }, (_, i) => {
        const ms = new Date(year, i, 1)
        const me = new Date(year, i + 1, 0, 23, 59, 59, 999)
        return prisma.salesLedger.aggregate({
          where: { isActive: true, transactionDate: { gte: ms, lte: me } },
          _sum: { supplyAmount: true, grossProfit: true },
        })
      })
    ),
    Promise.all(
      Array.from({ length: 12 }, (_, i) => {
        const ms = new Date(year, i, 1)
        const me = new Date(year, i + 1, 0, 23, 59, 59, 999)
        return prisma.purchaseLedger.aggregate({
          where: { isActive: true, invoiceDate: { gte: ms, lte: me } },
          _sum: { supplyAmount: true },
        })
      })
    ),
    prisma.salesLedger.groupBy({
      by: ['managerName'],
      where: {
        isActive: true,
        transactionDate: { gte: yearStart, lte: yearEnd },
        managerName: { not: null },
      },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5,
    }),
    prisma.salesLedger.groupBy({
      by: ['clientCompany'],
      where: {
        isActive: true,
        transactionDate: { gte: yearStart, lte: yearEnd },
      },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5,
    }),
    prisma.salesApproval.findMany({
      where: { status: 'PENDING_CEO', isLatest: true },
      select: {
        id: true,
        approvalNumber: true,
        clientCompany: true,
        totalSalesAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.mAApproval.findMany({
      where: { status: 'PENDING_CEO', isLatest: true },
      select: {
        id: true,
        approvalNumber: true,
        totalAmount: true,
        createdAt: true,
        items: {
          select: { clientCompany: true, salesCompany: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    getCommonWidgets(userId),
  ])

  const maYearSupply = yearMABillings.reduce((s, b) => s + Number(b.salesAmount), 0)
  const maYearPurchaseSupply = yearMABillings.reduce(
    (s, b) => s + Number(b.purchaseAmount),
    0
  )

  const totalSales = Number(yearSalesLedger._sum.supplyAmount || 0) + maYearSupply
  const totalPurchase =
    Number(yearPurchaseLedger._sum.supplyAmount || 0) + maYearPurchaseSupply
  const grossProfit =
    Number(yearSalesLedger._sum.grossProfit || 0) +
    (maYearSupply - maYearPurchaseSupply)
  const gpRate = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(2) : '0'

  const monthlyMASales: number[] = Array(12).fill(0)
  const monthlyMAPurchase: number[] = Array(12).fill(0)
  for (const b of yearMABillings) {
    const m = b.dueDate.getMonth()
    monthlyMASales[m] += Number(b.salesAmount)
    monthlyMAPurchase[m] += Number(b.purchaseAmount)
  }

  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const slSupply = Number(monthlySalesLedger[i]._sum.supplyAmount || 0)
    const plSupply = Number(monthlyPurchaseLedger[i]._sum.supplyAmount || 0)
    const slGp = Number(monthlySalesLedger[i]._sum.grossProfit || 0)
    const maGp = monthlyMASales[i] - monthlyMAPurchase[i]
    return {
      month: i + 1,
      sales: slSupply + monthlyMASales[i],
      purchase: plSupply + monthlyMAPurchase[i],
      grossProfit: slGp + maGp,
    }
  })

  const myPending = [
    ...myPendingSales.map((a) => ({
      id: a.id,
      approvalNumber: a.approvalNumber,
      clientCompany: a.clientCompany,
      totalSalesAmount: Number(a.totalSalesAmount),
      createdAt: a.createdAt.toISOString(),
      source: 'SALES' as const,
    })),
    ...myPendingMA.map((a) => ({
      id: a.id,
      approvalNumber: a.approvalNumber,
      clientCompany:
        a.items[0]?.clientCompany || a.items[0]?.salesCompany || null,
      totalSalesAmount: Number(a.totalAmount),
      createdAt: a.createdAt.toISOString(),
      source: 'MA' as const,
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return {
    role: 'ADMIN',
    yearSummary: {
      year,
      totalSales,
      totalPurchase,
      grossProfit,
      gpRate,
    },
    monthlyTrend,
    byManager: byManager.map((r) => ({
      managerName: r.managerName || '',
      totalAmount: Number(r._sum.totalAmount || 0),
      count: r._count,
    })),
    byClient: byClientLedger.map((r) => ({
      clientCompany: r.clientCompany,
      totalAmount: Number(r._sum.totalAmount || 0),
      count: r._count,
    })),
    myPendingApprovals: myPending.slice(0, 10),
    common,
  }
}

/**
 * 대시보드 통계 조회 (결정대기 #4 A안 — 역할별 분기)
 * User.department 기반으로 SALES / FINANCE / ADMIN 뷰를 각각 반환.
 */
export const getDashboardStats = actionAuth
  .inputSchema(getDashboardStatsSchema)
  .action(async ({ ctx }) => {
    try {
      const role = resolveRole(ctx.user.department)
      let data: DashboardData

      if (role === 'ADMIN') {
        data = await buildCeoDashboard(ctx.userId)
      } else if (role === 'FINANCE') {
        data = await buildFinanceDashboard(ctx.userId)
      } else {
        data = await buildSalesDashboard(ctx.userId, ctx.user.name ?? null)
      }

      return actionSuccess(data, 'OK')
    } catch (error) {
      console.error('[getDashboardStats] error:', error)
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })
