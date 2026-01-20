'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CombinedRow {
  rowKey: string
  approvalCode: string
  rowIndex: number
  // 매출 정보
  salesId: string | null
  salesPartNumber: string | null
  salesItemName: string | null
  salesClientCompany: string | null
  salesQuantity: number | null
  salesUnitPrice: number | null
  salesTotalPrice: number | null
  salesBatchTotal: number | null
  salesInvoiceDate: string | null
  salesInvoiceStatus: string | null
  salesRemarks: string | null
  salesPaymentStatus: string | null
  salesPaidAmount: number | null
  salesRemainAmount: number | null
  // 매입 정보
  purchaseId: string | null
  purchasePartNumber: string | null
  purchaseItemName: string | null
  purchaseVendorCompany: string | null
  purchaseQuantity: number | null
  purchaseUnitPrice: number | null
  purchaseTotalPrice: number | null
  purchaseBatchTotal: number | null
  purchaseInvoiceDate: string | null
  purchaseInvoiceStatus: string | null
  purchaseRemarks: string | null
  purchasePaymentStatus: string | null
  purchasePaidAmount: number | null
  purchaseRemainAmount: number | null
}

interface ApiResponse {
  items: CombinedRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  summary: {
    totalSalesPrice: number
    totalSalesPaid: number
    totalPurchasePrice: number
    totalPurchasePaid: number
    approvalCount: number
    rowCount: number
  }
}

export default function InvoiceStatusPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState({
    yearMonth: '',
    search: '',
  })

  // 수정 모드
  const [editingCell, setEditingCell] = useState<{
    rowKey: string
    field: 'salesInvoice' | 'purchaseInvoice'
  } | null>(null)
  const [editForm, setEditForm] = useState({
    invoiceDate: '',
    invoiceStatus: '',
  })

  const fetchList = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append('limit', '100')
      if (filter.yearMonth) params.append('yearMonth', filter.yearMonth)
      if (filter.search) params.append('search', filter.search)

      const res = await fetch(`/api/management/invoice-status/combined?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || '조회 실패')
      }

      setData(json)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 계산서 발행 업데이트
  const updateInvoice = async (type: 'sales' | 'purchase', id: string) => {
    try {
      const apiPath = type === 'sales'
        ? '/api/management/sales-invoice-status'
        : '/api/management/purchase-invoice-status'

      const res = await fetch(`${apiPath}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: editForm.invoiceDate || null,
          invoiceStatus: editForm.invoiceStatus || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || '업데이트 실패')
      }

      setEditingCell(null)
      fetchList()
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

  // 품의코드별 rowspan 계산
  const getRowSpan = (rows: CombinedRow[], index: number) => {
    if (index === 0 || rows[index].approvalCode !== rows[index - 1].approvalCode) {
      let span = 1
      for (let i = index + 1; i < rows.length; i++) {
        if (rows[i].approvalCode === rows[index].approvalCode) {
          span++
        } else {
          break
        }
      }
      return span
    }
    return 0 // 이미 rowspan에 포함됨
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">계산서 발행현황</h1>
          <p className="text-gray-500 mt-1">품의코드별 매출/매입 계산서 발행 관리</p>
        </div>
        <Link
          href="/management"
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          ← 경영관리
        </Link>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-600 mb-1">검색</label>
            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              placeholder="품의코드, 거래처, 품목명..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm text-gray-600 mb-1">년월</label>
            <input
              type="text"
              value={filter.yearMonth}
              onChange={(e) => setFilter({ ...filter, yearMonth: e.target.value })}
              placeholder="26.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={fetchList}
            disabled={loading}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? '조회중...' : '조회'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* 요약 */}
          <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 border-b text-sm">
            <div>
              <div className="text-gray-500">품의건수</div>
              <div className="text-lg font-bold text-gray-900">{data.summary.approvalCount}건</div>
            </div>
            <div>
              <div className="text-blue-600">매출 합계</div>
              <div className="text-lg font-bold text-blue-700">{formatNumber(data.summary.totalSalesPrice)}원</div>
            </div>
            <div>
              <div className="text-blue-600">매출 수금</div>
              <div className="text-lg font-bold text-green-700">{formatNumber(data.summary.totalSalesPaid)}원</div>
            </div>
            <div>
              <div className="text-purple-600">매입 합계</div>
              <div className="text-lg font-bold text-purple-700">{formatNumber(data.summary.totalPurchasePrice)}원</div>
            </div>
            <div>
              <div className="text-purple-600">매입 지급</div>
              <div className="text-lg font-bold text-green-700">{formatNumber(data.summary.totalPurchasePaid)}원</div>
            </div>
          </div>

          {/* 테이블 */}
          {data.items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>등록된 계산서 발행현황이 없습니다.</p>
              <p className="text-sm mt-1">품의서가 승인되면 자동으로 등록됩니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th rowSpan={2} className="px-2 py-2 text-left font-semibold text-gray-700 border border-gray-300 whitespace-nowrap">품의코드</th>
                    {/* 매출 */}
                    <th colSpan={8} className="px-2 py-1 text-center font-semibold text-blue-700 bg-blue-50 border border-gray-300">매출</th>
                    <th rowSpan={2} className="px-2 py-2 text-center font-semibold bg-yellow-100 border border-gray-300 w-20">매출계산서</th>
                    <th rowSpan={2} className="px-2 py-2 text-left font-semibold text-gray-600 border border-gray-300 whitespace-nowrap">기타사항</th>
                    {/* 매입 */}
                    <th colSpan={7} className="px-2 py-1 text-center font-semibold text-purple-700 bg-purple-50 border border-gray-300">매입</th>
                    <th rowSpan={2} className="px-2 py-2 text-center font-semibold bg-yellow-100 border border-gray-300 w-20">매입계산서</th>
                  </tr>
                  <tr className="bg-gray-50">
                    {/* 매출 세부 */}
                    <th className="px-2 py-1 text-left font-medium text-gray-600 border border-gray-300 w-24">P/N</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600 border border-gray-300 min-w-[150px]">품목</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600 border border-gray-300 w-28">매출처</th>
                    <th className="px-2 py-1 text-right font-medium text-gray-600 border border-gray-300 w-12">수량</th>
                    <th className="px-2 py-1 text-right font-medium text-gray-600 border border-gray-300 w-20">단가</th>
                    <th className="px-2 py-1 text-right font-medium text-gray-600 border border-gray-300 w-24">합계</th>
                    <th className="px-2 py-1 text-right font-medium text-blue-600 border border-gray-300 w-24">건별합계</th>
                    <th className="px-2 py-1 text-right font-medium text-gray-600 border border-gray-300 w-16 border-r-2 border-r-gray-400">수금</th>
                    {/* 매입 세부 */}
                    <th className="px-2 py-1 text-center font-medium text-gray-600 border border-gray-300 w-16">매입일</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600 border border-gray-300 w-28">매입처</th>
                    <th className="px-2 py-1 text-right font-medium text-gray-600 border border-gray-300 w-12">수량</th>
                    <th className="px-2 py-1 text-right font-medium text-gray-600 border border-gray-300 w-20">단가</th>
                    <th className="px-2 py-1 text-right font-medium text-gray-600 border border-gray-300 w-24">합계</th>
                    <th className="px-2 py-1 text-right font-medium text-purple-600 border border-gray-300 w-24">건별합계</th>
                    <th className="px-2 py-1 text-right font-medium text-gray-600 border border-gray-300 w-16">지급</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row, index) => {
                    const rowSpan = getRowSpan(data.items, index)
                    const isFirstRow = row.rowIndex === 0
                    const bgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'

                    return (
                      <tr key={row.rowKey} className={`hover:bg-blue-50/30 ${bgColor}`}>
                        {/* 품의코드 - rowspan */}
                        {rowSpan > 0 && (
                          <td
                            rowSpan={rowSpan}
                            className="px-2 py-1 font-mono font-medium text-blue-700 border border-gray-300 align-top bg-white"
                          >
                            <Link
                              href={`/sales/approvals`}
                              className="hover:underline"
                            >
                              {row.approvalCode}
                            </Link>
                          </td>
                        )}

                        {/* 매출 정보 */}
                        <td className="px-2 py-1 border border-gray-200 truncate max-w-[100px]" title={row.salesPartNumber || ''}>
                          {row.salesPartNumber || ''}
                        </td>
                        <td className="px-2 py-1 border border-gray-200 truncate max-w-[150px]" title={row.salesItemName || ''}>
                          {row.salesItemName || ''}
                        </td>
                        <td className="px-2 py-1 border border-gray-200 truncate max-w-[100px]" title={row.salesClientCompany || ''}>
                          {row.salesClientCompany || ''}
                        </td>
                        <td className="px-2 py-1 text-right border border-gray-200">
                          {row.salesQuantity || ''}
                        </td>
                        <td className="px-2 py-1 text-right border border-gray-200">
                          {formatNumber(row.salesUnitPrice)}
                        </td>
                        <td className="px-2 py-1 text-right border border-gray-200">
                          {formatNumber(row.salesTotalPrice)}
                        </td>
                        <td className="px-2 py-1 text-right font-medium text-blue-700 border border-gray-200">
                          {row.salesBatchTotal !== null ? formatNumber(row.salesBatchTotal) : ''}
                        </td>
                        <td className="px-2 py-1 text-right text-green-600 border border-gray-200 border-r-2 border-r-gray-400">
                          {formatNumber(row.salesPaidAmount)}
                        </td>

                        {/* 매출계산서 */}
                        <td className="px-1 py-1 text-center bg-yellow-50 border border-gray-200">
                          {editingCell?.rowKey === row.rowKey && editingCell.field === 'salesInvoice' ? (
                            <div className="flex flex-col gap-1">
                              <input
                                type="date"
                                value={editForm.invoiceDate}
                                onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                                className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => row.salesId && updateInvoice('sales', row.salesId)}
                                  className="flex-1 px-1 py-0.5 bg-blue-600 text-white rounded text-xs"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => setEditingCell(null)}
                                  className="flex-1 px-1 py-0.5 bg-gray-300 rounded text-xs"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : row.salesId ? (
                            <button
                              onClick={() => {
                                setEditingCell({ rowKey: row.rowKey, field: 'salesInvoice' })
                                setEditForm({
                                  invoiceDate: row.salesInvoiceDate?.split('T')[0] || '',
                                  invoiceStatus: row.salesInvoiceStatus || '',
                                })
                              }}
                              className={`w-full text-xs ${
                                row.salesInvoiceDate
                                  ? 'text-green-700 font-medium'
                                  : 'text-gray-400 hover:text-blue-600'
                              }`}
                            >
                              {row.salesInvoiceDate ? formatDate(row.salesInvoiceDate) : 'X'}
                            </button>
                          ) : null}
                        </td>

                        {/* 기타사항 */}
                        <td className="px-2 py-1 border border-gray-200 truncate max-w-[80px] text-gray-500" title={row.salesRemarks || ''}>
                          {isFirstRow ? row.salesRemarks : ''}
                        </td>

                        {/* 매입 정보 */}
                        <td className="px-2 py-1 text-center border border-gray-200">
                          {row.purchaseInvoiceDate ? formatDate(row.purchaseInvoiceDate) : ''}
                        </td>
                        <td className="px-2 py-1 border border-gray-200 truncate max-w-[100px]" title={row.purchaseVendorCompany || ''}>
                          {row.purchaseVendorCompany || ''}
                        </td>
                        <td className="px-2 py-1 text-right border border-gray-200">
                          {row.purchaseQuantity || ''}
                        </td>
                        <td className="px-2 py-1 text-right border border-gray-200">
                          {formatNumber(row.purchaseUnitPrice)}
                        </td>
                        <td className="px-2 py-1 text-right border border-gray-200">
                          {formatNumber(row.purchaseTotalPrice)}
                        </td>
                        <td className="px-2 py-1 text-right font-medium text-purple-700 border border-gray-200">
                          {row.purchaseBatchTotal !== null ? formatNumber(row.purchaseBatchTotal) : ''}
                        </td>
                        <td className="px-2 py-1 text-right text-green-600 border border-gray-200">
                          {formatNumber(row.purchasePaidAmount)}
                        </td>

                        {/* 매입계산서 */}
                        <td className="px-1 py-1 text-center bg-yellow-50 border border-gray-200">
                          {editingCell?.rowKey === row.rowKey && editingCell.field === 'purchaseInvoice' ? (
                            <div className="flex flex-col gap-1">
                              <input
                                type="date"
                                value={editForm.invoiceDate}
                                onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                                className="w-full px-1 py-0.5 border border-purple-300 rounded text-xs"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => row.purchaseId && updateInvoice('purchase', row.purchaseId)}
                                  className="flex-1 px-1 py-0.5 bg-purple-600 text-white rounded text-xs"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => setEditingCell(null)}
                                  className="flex-1 px-1 py-0.5 bg-gray-300 rounded text-xs"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : row.purchaseId ? (
                            <button
                              onClick={() => {
                                setEditingCell({ rowKey: row.rowKey, field: 'purchaseInvoice' })
                                setEditForm({
                                  invoiceDate: row.purchaseInvoiceDate?.split('T')[0] || '',
                                  invoiceStatus: row.purchaseInvoiceStatus || '',
                                })
                              }}
                              className={`w-full text-xs ${
                                row.purchaseInvoiceDate
                                  ? 'text-green-700 font-medium'
                                  : 'text-gray-400 hover:text-purple-600'
                              }`}
                            >
                              {row.purchaseInvoiceDate ? formatDate(row.purchaseInvoiceDate) : 'X'}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
