'use client'

import { useState, useEffect, useCallback } from 'react'

interface InvoiceItem {
  id: string
  approvalId: string
  itemId?: string | null  // 원본 아이템 ID
  approvalCode: string | null
  approvalVersion: number
  approvalDate: string | null
  clientCompany?: string
  vendorCompany?: string
  managerName?: string

  // 아이템 정보
  partNumber: string | null
  productName: string
  description?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  isConsolidated?: boolean  // optional - InvoiceRecord에는 없음
  purchaseDate?: string
  invoiceNumber?: string | null  // 세금계산서 번호

  // 계산서 발행 상태
  invoiceStatus: string // PENDING, ISSUED, AMENDMENT_NEEDED, AMENDED, CANCELLATION_NEEDED, CANCELLED
  invoiceDate: string | null
  invoiceRemarks: string | null

  createdAt?: string
}

interface Summary {
  totalPrice: number
  count: number
  byInvoiceStatus: Record<string, number>
  byVendorCompany?: Record<string, number>
}

type TabType = 'sales' | 'purchase'

const invoiceStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: '미발행', color: 'bg-orange-100 text-orange-700' },
  ISSUED: { label: '발행완료', color: 'bg-green-100 text-green-700' },
  AMENDMENT_NEEDED: { label: '수정필요', color: 'bg-yellow-100 text-yellow-800' },
  AMENDED: { label: '수정발행', color: 'bg-purple-100 text-purple-700' },
  CANCELLATION_NEEDED: { label: '취소필요', color: 'bg-pink-100 text-pink-700' },
  CANCELLED: { label: '취소완료', color: 'bg-red-100 text-red-700' },
}

export default function InvoiceStatusPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sales')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [salesItems, setSalesItems] = useState<InvoiceItem[]>([])
  const [purchaseItems, setPurchaseItems] = useState<InvoiceItem[]>([])
  const [salesSummary, setSalesSummary] = useState<Summary | null>(null)
  const [purchaseSummary, setPurchaseSummary] = useState<Summary | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState<string>('')
  const [batchDate, setBatchDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '500' })
      if (filterInvoiceStatus) params.set('invoiceStatus', filterInvoiceStatus)

      const [salesRes, purchaseRes] = await Promise.all([
        fetch(`/api/management/sales-invoice-status?${params}`),
        fetch(`/api/management/purchase-invoice-status?${params}`),
      ])

      const salesJson = await salesRes.json()
      const purchaseJson = await purchaseRes.json()

      if (salesRes.ok) {
        setSalesItems(salesJson.items || [])
        setSalesSummary(salesJson.summary || null)
      }
      if (purchaseRes.ok) {
        setPurchaseItems(purchaseJson.items || [])
        setPurchaseSummary(purchaseJson.summary || null)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [filterInvoiceStatus])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab, filterInvoiceStatus])

  const currentItems = activeTab === 'sales' ? salesItems : purchaseItems
  const currentSummary = activeTab === 'sales' ? salesSummary : purchaseSummary

  // 품의코드 기준 정렬
  const sortedItems = [...currentItems].sort((a, b) => {
    return (a.approvalCode || '').localeCompare(b.approvalCode || '')
  })

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === sortedItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedItems.map((i) => i.id)))
    }
  }

  const handleUpdateStatus = async (status: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const statusLabel = invoiceStatusLabels[status]?.label || status
    if (!confirm(`${ids.length}건을 "${statusLabel}" 상태로 변경하시겠습니까?`)) return

    try {
      const apiPath = activeTab === 'sales'
        ? '/api/management/sales-invoice-status'
        : '/api/management/purchase-invoice-status'

      const body: Record<string, unknown> = { ids, invoiceStatus: status }

      // 발행완료 상태로 변경 시 발행일도 설정
      if (status === 'ISSUED' || status === 'AMENDED') {
        body.invoiceDate = batchDate
      }
      // 취소 시 발행일 제거
      if (status === 'CANCELLED') {
        body.invoiceDate = null
      }

      const res = await fetch(apiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('업데이트 실패')

      const result = await res.json()
      alert(result.message)
      setSelectedIds(new Set())
      fetchData()
    } catch (err) {
      alert(String(err))
    }
  }

  const formatNumber = (num: number | null) => {
    if (num === null) return ''
    return Number(num).toLocaleString()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const yy = String(date.getFullYear()).slice(-2)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yy}.${mm}.${dd}`
  }

  // rowSpan 계산 (품의코드 기준)
  const getRowSpanInfo = (items: InvoiceItem[]) => {
    const rowSpanMap = new Map<string, { count: number; firstIndex: number }>()
    items.forEach((item, index) => {
      const key = item.approvalCode || 'UNKNOWN'
      if (!rowSpanMap.has(key)) {
        rowSpanMap.set(key, { count: 1, firstIndex: index })
      } else {
        rowSpanMap.get(key)!.count++
      }
    })
    return rowSpanMap
  }

  const rowSpanMap = getRowSpanInfo(sortedItems)

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">계산서 발행현황</h1>
          <p className="text-gray-500 mt-1">품의서 승인 후 계산서 발행 관리</p>
        </div>
      </div>

      {/* 메인 탭: 매출/매입 */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          매출
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'sales' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {salesItems.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('purchase')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'purchase'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          매입
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'purchase' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {purchaseItems.length}
          </span>
        </button>
      </div>

      {/* 요약 카드 - 발행상태별 */}
      {currentSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(invoiceStatusLabels).map(([key, { label, color }]) => (
            <div
              key={key}
              onClick={() => setFilterInvoiceStatus(filterInvoiceStatus === key ? '' : key)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                filterInvoiceStatus === key
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-').split(' ')[0]}`} />
                <span className="text-sm text-gray-600">{label}</span>
              </div>
              <div className="text-xl font-bold mt-1">
                {currentSummary.byInvoiceStatus[key] || 0}건
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 총 금액 */}
      {currentSummary && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">총 금액 ({currentSummary.count}건)</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatNumber(currentSummary.totalPrice)}원
            </span>
          </div>
        </div>
      )}

      {/* 컨텐츠 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 액션바 */}
        <div className={`flex items-center gap-4 p-4 border-b ${
          activeTab === 'sales' ? 'bg-blue-50/50' : 'bg-purple-50/50'
        }`}>
          <span className={`text-sm font-medium ${
            selectedIds.size > 0 ? 'text-blue-700' : 'text-gray-400'
          }`}>
            {selectedIds.size > 0 ? `${selectedIds.size}건 선택` : '품목을 선택하세요'}
          </span>
          <div className="flex-1" />

          <input
            type="date"
            value={batchDate}
            onChange={(e) => setBatchDate(e.target.value)}
            disabled={selectedIds.size === 0}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
          />

          <button
            onClick={() => handleUpdateStatus('ISSUED')}
            disabled={selectedIds.size === 0}
            className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            발행완료
          </button>
          <button
            onClick={() => handleUpdateStatus('AMENDED')}
            disabled={selectedIds.size === 0}
            className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            수정발행
          </button>
          <button
            onClick={() => handleUpdateStatus('CANCELLED')}
            disabled={selectedIds.size === 0}
            className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
          >
            취소발행
          </button>
        </div>

        {loading && <div className="p-8 text-center text-gray-500">로딩 중...</div>}
        {error && <div className="p-4 bg-red-50 text-red-700">{error}</div>}

        {!loading && sortedItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>계산서 발행 대상이 없습니다</p>
            <p className="text-sm mt-1">품의서가 승인되면 자동으로 표시됩니다</p>
          </div>
        ) : !loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">품의코드</th>
                  <th className="px-2 py-2 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === sortedItems.length && sortedItems.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">품목명</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                    {activeTab === 'sales' ? '매출처' : '매입처'}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">수량</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">단가</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">합계</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">발행상태</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">발행일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedItems.map((item, index) => {
                  const key = item.approvalCode || 'UNKNOWN'
                  const spanInfo = rowSpanMap.get(key)!
                  const isFirstInGroup = spanInfo.firstIndex === index
                  const rowSpan = spanInfo.count
                  const statusInfo = invoiceStatusLabels[item.invoiceStatus] || invoiceStatusLabels.PENDING

                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleSelection(item.id)}
                      className={`cursor-pointer ${
                        selectedIds.has(item.id)
                          ? 'bg-blue-100 hover:bg-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {isFirstInGroup && (
                        <td
                          className="px-3 py-2 border-r border-gray-200 font-mono font-medium bg-gray-50/50"
                          rowSpan={rowSpan}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-blue-600">{item.approvalCode}</div>
                          <div className="text-xs text-gray-400">v{item.approvalVersion}</div>
                          <div className="text-xs text-gray-400">{formatDate(item.approvalDate)}</div>
                        </td>
                      )}
                      <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate max-w-[200px] font-medium">{item.productName}</div>
                        {item.partNumber && (
                          <div className="text-xs text-gray-400 truncate">{item.partNumber}</div>
                        )}
                        {item.isConsolidated && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1 rounded">통합</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[120px]">
                        {activeTab === 'sales' ? item.clientCompany : item.vendorCompany}
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatNumber(item.totalPrice)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">
                        {formatDate(item.invoiceDate)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
