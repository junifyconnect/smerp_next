'use server'

import { actionAuth } from '@/lib/action/actionHandler'
import { actionSuccess, actionError } from '@/lib/response/responseHandler'
import { z } from 'zod'
import type { DashboardData } from '../_types/dashboard'

const getDashboardStatsSchema = z.void()

/**
 * 대시보드 통계 조회
 */
export const getDashboardStats = actionAuth
  .inputSchema(getDashboardStatsSchema)
  .action(async ({ ctx }) => {
    try {
      // TODO: 실제 API 연동
      // 임시 데이터
      const stats: DashboardData = {
        stats: {
          totalQuotes: 156,
          pendingApprovals: 12,
          thisMonthSales: 245000000,
          thisMonthOrders: 34,
        },
        recentQuotes: [
          { id: '1', docNumber: 'Q2501-001', clientCompany: '샘플 고객사 1', totalAmount: 10000000, status: 'DRAFT' },
          { id: '2', docNumber: 'Q2501-002', clientCompany: '샘플 고객사 2', totalAmount: 20000000, status: 'DRAFT' },
          { id: '3', docNumber: 'Q2501-003', clientCompany: '샘플 고객사 3', totalAmount: 30000000, status: 'DRAFT' },
          { id: '4', docNumber: 'Q2501-004', clientCompany: '샘플 고객사 4', totalAmount: 40000000, status: 'DRAFT' },
          { id: '5', docNumber: 'Q2501-005', clientCompany: '샘플 고객사 5', totalAmount: 50000000, status: 'DRAFT' },
        ],
        pendingApprovals: [
          { id: '1', docNumber: 'A2501-001', title: '품의서', totalAmount: 5000000, status: 'PENDING', createdBy: { name: '홍길동' } },
          { id: '2', docNumber: 'A2501-002', title: '품의서', totalAmount: 10000000, status: 'PENDING', createdBy: { name: '홍길동' } },
          { id: '3', docNumber: 'A2501-003', title: '품의서', totalAmount: 15000000, status: 'PENDING', createdBy: { name: '홍길동' } },
        ],
      }

      return actionSuccess(stats, 'OK')
    } catch (error) {
      return actionError('INTERNAL_SERVER_ERROR', error)
    }
  })

