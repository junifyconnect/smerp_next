'use client'

import { useState } from 'react'
import type { SuccessResponse } from '@/lib/response/responseHandler'
import type { DashboardData } from '../_types/dashboard'

interface DashboardPageClientProps {
  initialData: SuccessResponse<DashboardData>
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: '승인대기', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: '승인완료', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-700' },
  COMPLETED: { label: '완료', color: 'bg-blue-100 text-blue-700' },
}

export function DashboardPageClient({ initialData }: DashboardPageClientProps) {
  const [data] = useState<DashboardData>(initialData.data)

  const statCards = [
    { label: '총 견적서', value: data.stats.totalQuotes, unit: '건', color: 'blue' },
    { label: '승인 대기', value: data.stats.pendingApprovals, unit: '건', color: 'yellow' },
    { label: '이번달 매출', value: data.stats.thisMonthSales.toLocaleString(), unit: '원', color: 'green' },
    { label: '이번달 발주', value: data.stats.thisMonthOrders, unit: '건', color: 'purple' },
  ]

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`p-6 rounded-xl border ${colorClasses[card.color]}`}
          >
            <p className="text-sm font-medium opacity-80">{card.label}</p>
            <p className="text-3xl font-bold mt-2">
              {card.value}
              <span className="text-sm font-normal ml-1">{card.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 견적서 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">최근 견적서</h2>
          <div className="space-y-3">
            {data.recentQuotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">최근 견적서가 없습니다</div>
            ) : (
              data.recentQuotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{quote.docNumber}</p>
                    <p className="text-xs text-gray-500">{quote.clientCompany}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{quote.totalAmount.toLocaleString()}원</p>
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${statusLabels[quote.status]?.color || 'bg-gray-100'}`}>
                      {statusLabels[quote.status]?.label || quote.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 승인 대기 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">승인 대기 문서</h2>
          <div className="space-y-3">
            {data.pendingApprovals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">승인 대기 문서가 없습니다</div>
            ) : (
              data.pendingApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{approval.docNumber}</p>
                    <p className="text-xs text-gray-500">{approval.title} - {approval.createdBy.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{approval.totalAmount.toLocaleString()}원</p>
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${statusLabels[approval.status]?.color || 'bg-gray-100'}`}>
                      {statusLabels[approval.status]?.label || approval.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

