'use client'

import { useEffect, useState } from 'react'

interface DashboardStats {
  totalQuotes: number
  pendingApprovals: number
  thisMonthSales: number
  thisMonthOrders: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotes: 0,
    pendingApprovals: 0,
    thisMonthSales: 0,
    thisMonthOrders: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: 실제 API 연동
    // 임시 데이터
    setTimeout(() => {
      setStats({
        totalQuotes: 156,
        pendingApprovals: 12,
        thisMonthSales: 245000000,
        thisMonthOrders: 34,
      })
      setLoading(false)
    }, 500)
  }, [])

  const statCards = [
    { label: '총 견적서', value: stats.totalQuotes, unit: '건', color: 'blue' },
    { label: '승인 대기', value: stats.pendingApprovals, unit: '건', color: 'yellow' },
    { label: '이번달 매출', value: stats.thisMonthSales.toLocaleString(), unit: '원', color: 'green' },
    { label: '이번달 발주', value: stats.thisMonthOrders, unit: '건', color: 'purple' },
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
              {loading ? '-' : card.value}
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
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-sm">Q2501-{String(i).padStart(3, '0')}</p>
                  <p className="text-xs text-gray-500">샘플 고객사 {i}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{(10000000 * i).toLocaleString()}원</p>
                  <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                    작성중
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 승인 대기 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">승인 대기 문서</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-sm">A2501-{String(i).padStart(3, '0')}</p>
                  <p className="text-xs text-gray-500">품의서 - 홍길동</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{(5000000 * i).toLocaleString()}원</p>
                  <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                    승인대기
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
