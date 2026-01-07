export interface DashboardStats {
  totalQuotes: number
  pendingApprovals: number
  thisMonthSales: number
  thisMonthOrders: number
}

export interface RecentQuote {
  id: string
  docNumber: string
  clientCompany: string
  totalAmount: number
  status: string
}

export interface PendingApproval {
  id: string
  docNumber: string
  title: string
  totalAmount: number
  status: string
  createdBy: {
    name: string
  }
}

export interface DashboardData {
  stats: DashboardStats
  recentQuotes: RecentQuote[]
  pendingApprovals: PendingApproval[]
}

