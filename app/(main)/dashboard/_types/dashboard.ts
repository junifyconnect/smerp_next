// 역할별 대시보드 데이터 타입 (결정대기 #4 A안 — User.department 기반)
// - SALES  → 영업팀
// - FINANCE → 경영팀
// - ADMIN  → CEO 뷰
// - 기타/null → 영업팀(기본)

export type DashboardRole = 'SALES' | 'FINANCE' | 'ADMIN'

// ─────────────────────────────────────────
// 공통 위젯
// ─────────────────────────────────────────
export interface CommonWidgets {
  unreadNotifications: number
  todayEvents: Array<{
    id: string
    title: string
    startDate: string // ISO
    isAllDay: boolean
  }>
}

// ─────────────────────────────────────────
// 영업팀 뷰 (SALES)
// ─────────────────────────────────────────
export interface SalesDashboardData {
  role: 'SALES'
  myApprovalStatus: {
    draft: number
    pending: number // PENDING + PENDING_TEAM_LEAD + PENDING_CEO
    approved: number
    rejected: number
  }
  myPendingApprovals: Array<{
    id: string
    approvalNumber: string
    status: string
    clientCompany: string | null
    totalSalesAmount: number
    createdAt: string
  }>
  thisMonthSales: number // 내 매출 합계 (SalesLedger + MABilling where managerName=나)
  thisMonthApprovedCount: number // 내가 작성한 APPROVED 이번달
  recentRejected: Array<{
    id: string
    approvalNumber: string
    rejectedAt: string | null
    rejectionReason: string | null
  }>
  common: CommonWidgets
}

// ─────────────────────────────────────────
// 경영팀 뷰 (FINANCE)
// ─────────────────────────────────────────
export interface FinanceDashboardData {
  role: 'FINANCE'
  pendingInvoices: {
    sales: number // 발행 대기 매출 계산서
    purchase: number // 발행 대기 매입 계산서
  }
  needsAmendment: number // NEEDS_AMENDMENT 건수
  thisMonthMABilling: Array<{
    id: string
    billingMonth: string
    dueDate: string
    clientCompany: string
    itemName: string
    salesTotalAmount: number
    purchaseTotalAmount: number
  }>
  receivables: number // 외상매출금 (paymentStatus=PENDING 매출 합)
  overdue: {
    salesCount: number
    purchaseCount: number
  }
  common: CommonWidgets
}

// ─────────────────────────────────────────
// CEO 뷰 (ADMIN)
// ─────────────────────────────────────────
export interface CeoDashboardData {
  role: 'ADMIN'
  yearSummary: {
    year: number
    totalSales: number // supplyAmount 기준
    totalPurchase: number
    grossProfit: number
    gpRate: string // "13.25"
  }
  monthlyTrend: Array<{
    month: number
    sales: number
    purchase: number
    grossProfit: number
  }>
  byManager: Array<{
    managerName: string
    totalAmount: number
    count: number
  }>
  byClient: Array<{
    clientCompany: string
    totalAmount: number
    count: number
  }>
  myPendingApprovals: Array<{
    id: string
    approvalNumber: string
    clientCompany: string | null
    totalSalesAmount: number
    createdAt: string
    source: 'SALES' | 'MA' // SalesApproval vs MAApproval
  }>
  common: CommonWidgets
}

// ─────────────────────────────────────────
// Discriminated union
// ─────────────────────────────────────────
export type DashboardData = SalesDashboardData | FinanceDashboardData | CeoDashboardData
