'use client'

import { useState, useEffect, useCallback } from 'react'
import InvoiceFilterBar from '@/app/(main)/management/invoice-status/_components/InvoiceFilterBar'
import InvoiceStatusTable from '@/app/(main)/management/invoice-status/_components/InvoiceStatusTable'
import { flattenGroups } from '@/app/(main)/management/invoice-status/_lib/helpers'
import { formatNumber, getCurrentMonth } from '@/app/(main)/management/invoice-status/_lib/helpers'
import type {
  InvoiceStatusResponse,
  InvoiceStatusFilters,
  InvoiceSummary,
  FlatInvoiceRow,
} from '@/app/(main)/management/invoice-status/_types/invoice-status'
import { INVOICE_STATUS_CONFIG } from '@/app/(main)/management/invoice-status/_types/invoice-status'

export default function InvoiceStatusPageClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<FlatInvoiceRow[]>([])
  const [summary, setSummary] = useState<InvoiceSummary | null>(null)
  const [filters, setFilters] = useState<InvoiceStatusFilters>({
    month: getCurrentMonth(),
    approvalCode: null,
    clientCompany: null,
    vendorName: null,
    invoiceStatus: null,
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.month) params.set('month', filters.month)
      if (filters.approvalCode) params.set('approvalCode', filters.approvalCode)
      if (filters.clientCompany) params.set('clientCompany', filters.clientCompany)
      if (filters.vendorName) params.set('vendorName', filters.vendorName)
      if (filters.invoiceStatus) params.set('invoiceStatus', filters.invoiceStatus)

      const res = await fetch(`/api/management/invoice-status?${params}`)
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다')

      const data: InvoiceStatusResponse = await res.json()
      const flatRows = flattenGroups(data.groups)
      setRows(flatRows)
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 인라인 편집: 개별 PATCH 호출
  const handleUpdate = useCallback(
    async (
      type: 'product' | 'item',
      id: string,
      field: string,
      value: string | null,
    ) => {
      try {
        const res = await fetch('/api/management/invoice-status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, id, field, value }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || '업데이트 실패')
        }
        // 성공 시 데이터 새로고침
        await fetchData()
      } catch (err) {
        alert(err instanceof Error ? err.message : '업데이트에 실패했습니다')
      }
    },
    [fetchData],
  )

  // 상태별 카운트 (매출 + 매입 통합)
  const statusCounts = summary
    ? Object.keys(INVOICE_STATUS_CONFIG).reduce(
        (acc, key) => {
          acc[key] =
            (summary.salesByStatus[key] || 0) +
            (summary.purchaseByStatus[key] || 0)
          return acc
        },
        {} as Record<string, number>,
      )
    : null

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">계산서 발행현황</h1>
        <p className="text-gray-500 mt-1 text-sm">
          품의서 승인 후 매출/매입 계산서 통합 관리
        </p>
      </div>

      {/* 필터바 */}
      <InvoiceFilterBar filters={filters} onFilterChange={setFilters} />

      {/* 요약 카드 */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* 매출/매입 총액 */}
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
            <div className="text-xs text-blue-600 font-medium">매출 합계</div>
            <div className="text-lg font-bold text-blue-900 mt-1">
              {formatNumber(summary.totalSales)}
            </div>
            <div className="text-[10px] text-blue-500">
              {summary.salesCount}건
            </div>
          </div>
          <div className="p-3 rounded-lg border border-purple-200 bg-purple-50">
            <div className="text-xs text-purple-600 font-medium">매입 합계</div>
            <div className="text-lg font-bold text-purple-900 mt-1">
              {formatNumber(summary.totalPurchase)}
            </div>
            <div className="text-[10px] text-purple-500">
              {summary.purchaseCount}건
            </div>
          </div>

          {/* 상태별 카운트 */}
          {statusCounts &&
            Object.entries(INVOICE_STATUS_CONFIG).map(([key, config]) => {
              const count = statusCounts[key] || 0
              if (count === 0 && key !== 'PENDING' && key !== 'ISSUED') return null
              return (
                <div
                  key={key}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      invoiceStatus:
                        prev.invoiceStatus === key ? null : key,
                    }))
                  }
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    filters.invoiceStatus === key
                      ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${config.bgColor.replace('bg-', 'bg-')}`}
                    />
                    <span className="text-xs text-gray-600">{config.label}</span>
                  </div>
                  <div className="text-lg font-bold mt-1">{count}건</div>
                </div>
              )
            })}
        </div>
      )}

      {/* 메인 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        )}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        {!loading && !error && (
          <InvoiceStatusTable rows={rows} onUpdate={handleUpdate} />
        )}
      </div>
    </div>
  )
}
