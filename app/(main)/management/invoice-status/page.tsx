'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SalesItem {
  id: string
  approvalCode: string
  partNumber: string | null
  itemName: string | null
  clientCompany: string | null
  quantity: number | null
  unitPrice: number
  totalPrice: number
  invoiceDate: string | null
  invoiceGroupId: string | null
}

interface PurchaseItem {
  id: string
  approvalCode: string
  partNumber: string | null
  itemName: string | null
  vendorCompany: string | null
  quantity: number | null
  unitPrice: number
  totalPrice: number
  invoiceDate: string | null
  invoiceGroupId: string | null
}

type TabType = 'sales' | 'purchase'
type ViewType = 'unissued' | 'issued'

export default function InvoiceStatusPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sales')
  const [activeView, setActiveView] = useState<ViewType>('unissued')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [salesItems, setSalesItems] = useState<SalesItem[]>([])
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDate, setBatchDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [salesRes, purchaseRes] = await Promise.all([
        fetch('/api/management/sales-invoice-status?limit=500'),
        fetch('/api/management/purchase-invoice-status?limit=500'),
      ])

      const salesJson = await salesRes.json()
      const purchaseJson = await purchaseRes.json()

      if (salesRes.ok) setSalesItems(salesJson.items || [])
      if (purchaseRes.ok) setPurchaseItems(purchaseJson.items || [])
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab, activeView])

  const allItems = activeTab === 'sales' ? salesItems : purchaseItems
  const unissuedItems = allItems.filter((item) => !item.invoiceDate)
  const issuedItems = allItems.filter((item) => !!item.invoiceDate)
  const currentItems = activeView === 'unissued' ? unissuedItems : issuedItems

  // 미발행: 품의코드 기준 정렬, 발행완료: 계산서그룹 기준 정렬
  const sortedItems = [...currentItems].sort((a, b) => {
    if (activeView === 'unissued') {
      return (a.approvalCode || '').localeCompare(b.approvalCode || '')
    } else {
      return (a.invoiceGroupId || '').localeCompare(b.invoiceGroupId || '')
    }
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

  const generateGroupId = () => {
    const prefix = activeTab === 'sales' ? 'S' : 'P'
    const today = new Date()
    const yy = String(today.getFullYear()).slice(-2)
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const dateStr = `${yy}${mm}${dd}`

    const items = activeTab === 'sales' ? salesItems : purchaseItems
    const todayGroups = items
      .filter(item => item.invoiceGroupId?.startsWith(`INV-${prefix}-${dateStr}`))
      .map(item => item.invoiceGroupId)

    let seq = 1
    if (todayGroups.length > 0) {
      const maxSeq = Math.max(...todayGroups.map(g => parseInt(g?.split('-')[3] || '0')))
      seq = maxSeq + 1
    }

    return `INV-${prefix}-${dateStr}-${String(seq).padStart(3, '0')}`
  }

  const handleIssue = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0 || !batchDate) return

    try {
      const apiPath = activeTab === 'sales'
        ? '/api/management/sales-invoice-status'
        : '/api/management/purchase-invoice-status'

      const groupId = generateGroupId()

      await Promise.all(ids.map(id =>
        fetch(`${apiPath}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceDate: batchDate, invoiceGroupId: groupId }),
        })
      ))

      alert(`${ids.length}건 발행 완료\n계산서: ${groupId}`)
      setSelectedIds(new Set())
      fetchData()
    } catch (err) {
      alert(String(err))
    }
  }

  const handleCancel = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (!confirm(`${ids.length}건의 발행을 취소하시겠습니까?`)) return

    try {
      const apiPath = activeTab === 'sales'
        ? '/api/management/sales-invoice-status'
        : '/api/management/purchase-invoice-status'

      await Promise.all(ids.map(id =>
        fetch(`${apiPath}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceDate: null, invoiceGroupId: null }),
        })
      ))

      alert(`${ids.length}건 발행 취소 완료`)
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
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const yy = String(date.getFullYear()).slice(-2)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yy}.${mm}.${dd}`
  }

  // rowSpan 계산 (미발행: 품의코드, 발행완료: 계산서그룹)
  const getRowSpanInfo = (items: (SalesItem | PurchaseItem)[]) => {
    const rowSpanMap = new Map<string, { count: number; firstIndex: number }>()
    items.forEach((item, index) => {
      const key = activeView === 'unissued'
        ? (item.approvalCode || 'UNKNOWN')
        : (item.invoiceGroupId || 'UNKNOWN')
      if (!rowSpanMap.has(key)) {
        rowSpanMap.set(key, { count: 1, firstIndex: index })
      } else {
        rowSpanMap.get(key)!.count++
      }
    })
    return rowSpanMap
  }

  const rowSpanMap = getRowSpanInfo(sortedItems)

  // 그룹 색상 (발행완료 뷰)
  const groupColors = ['bg-emerald-50', 'bg-sky-50', 'bg-amber-50', 'bg-rose-50', 'bg-violet-50', 'bg-orange-50']
  const getGroupColor = (groupId: string | null) => {
    if (!groupId || activeView === 'unissued') return ''
    const uniqueGroups = [...new Set(sortedItems.map(i => i.invoiceGroupId).filter(Boolean))]
    const index = uniqueGroups.indexOf(groupId)
    return groupColors[index % groupColors.length]
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">계산서 발행현황</h1>
        <p className="text-gray-500 mt-1">매출/매입 계산서 발행 관리</p>
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

      {/* 컨텐츠 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 서브 탭: 미발행/발행완료 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveView('unissued')}
            className="flex-1 px-4 py-3 text-sm font-medium transition-colors"
            style={activeView === 'unissued' ? {
              backgroundColor: activeTab === 'sales' ? '#eff6ff' : '#faf5ff',
              color: activeTab === 'sales' ? '#1d4ed8' : '#7e22ce',
              borderBottom: `2px solid ${activeTab === 'sales' ? '#2563eb' : '#9333ea'}`,
            } : { color: '#6b7280' }}
          >
            미발행
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
              {unissuedItems.length}
            </span>
          </button>
          <button
            onClick={() => setActiveView('issued')}
            className="flex-1 px-4 py-3 text-sm font-medium transition-colors"
            style={activeView === 'issued' ? {
              backgroundColor: activeTab === 'sales' ? '#eff6ff' : '#faf5ff',
              color: activeTab === 'sales' ? '#1d4ed8' : '#7e22ce',
              borderBottom: `2px solid ${activeTab === 'sales' ? '#2563eb' : '#9333ea'}`,
            } : { color: '#6b7280' }}
          >
            발행완료
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
              {issuedItems.length}
            </span>
          </button>
        </div>

        {/* 액션바 */}
        <div className={`flex items-center gap-4 p-4 border-b ${
          activeTab === 'sales' ? 'bg-blue-50/50' : 'bg-purple-50/50'
        }`}>
          <span className={`text-sm font-medium ${
            selectedIds.size > 0
              ? (activeView === 'issued' ? 'text-red-600' : (activeTab === 'sales' ? 'text-blue-700' : 'text-purple-700'))
              : 'text-gray-400'
          }`}>
            {selectedIds.size > 0 ? `${selectedIds.size}건 선택` : '품목을 선택하세요'}
          </span>
          <div className="flex-1" />

          {activeView === 'unissued' && (
            <>
              <input
                type="date"
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                disabled={selectedIds.size === 0}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              />
              <button
                onClick={handleIssue}
                disabled={selectedIds.size === 0 || !batchDate}
                className={`px-4 py-1.5 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${
                  activeTab === 'sales' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                발행등록
              </button>
            </>
          )}

          {activeView === 'issued' && (
            <button
              onClick={handleCancel}
              disabled={selectedIds.size === 0}
              className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
            >
              발행취소
            </button>
          )}
        </div>

        {loading && <div className="p-8 text-center text-gray-500">로딩 중...</div>}
        {error && <div className="p-4 bg-red-50 text-red-700">{error}</div>}

        {!loading && sortedItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">{activeView === 'unissued' ? '✅' : '📋'}</div>
            <p>{activeView === 'unissued' ? '미발행 항목이 없습니다' : '발행된 계산서가 없습니다'}</p>
          </div>
        ) : !loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">
                    {activeView === 'unissued' ? '품의코드' : '계산서'}
                  </th>
                  <th className="px-2 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === sortedItems.length && sortedItems.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">P/N</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">품목명</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-700">
                    {activeTab === 'sales' ? '매출처' : '매입처'}
                  </th>
                  <th className="px-3 py-3 text-right font-medium text-gray-700">수량</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-700">단가</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-700">합계</th>
                  {activeView === 'issued' && (
                    <th className="px-3 py-3 text-center font-medium text-green-700 bg-green-50">발행일</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedItems.map((item, index) => {
                  const key = activeView === 'unissued'
                    ? (item.approvalCode || 'UNKNOWN')
                    : (item.invoiceGroupId || 'UNKNOWN')
                  const spanInfo = rowSpanMap.get(key)!
                  const isFirstInGroup = spanInfo.firstIndex === index
                  const rowSpan = spanInfo.count
                  const groupColor = getGroupColor(item.invoiceGroupId)

                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleSelection(item.id)}
                      className={`cursor-pointer ${
                        selectedIds.has(item.id)
                          ? (activeView === 'issued' ? 'bg-red-100 hover:bg-red-200' : 'bg-blue-100 hover:bg-blue-200')
                          : groupColor
                            ? `${groupColor} hover:brightness-95`
                            : 'hover:bg-gray-50'
                      }`}
                    >
                      {isFirstInGroup && (
                        <td
                          className={`px-3 py-2 border-r border-gray-200 font-mono font-medium ${
                            activeView === 'issued' ? 'bg-gray-50/80' : 'bg-gray-50/50'
                          }`}
                          rowSpan={rowSpan}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {activeView === 'unissued' ? (
                            <Link
                              href="/sales/approvals"
                              className="text-blue-600 hover:underline"
                            >
                              {item.approvalCode}
                            </Link>
                          ) : (
                            <div>
                              <div className="text-gray-800">{item.invoiceGroupId}</div>
                              <div className="text-xs text-green-600 font-normal">
                                {formatDate(item.invoiceDate)}
                              </div>
                            </div>
                          )}
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
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[100px]">{item.partNumber || '-'}</td>
                      <td className="px-3 py-2 truncate max-w-[150px]">{item.itemName || '-'}</td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[120px]">
                        {activeTab === 'sales'
                          ? (item as SalesItem).clientCompany || '-'
                          : (item as PurchaseItem).vendorCompany || '-'}
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantity || '-'}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatNumber(item.totalPrice)}</td>
                      {activeView === 'issued' && (
                        <td className="px-3 py-2 text-center bg-green-50/50 text-green-700 font-medium">
                          {formatDate(item.invoiceDate)}
                        </td>
                      )}
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
