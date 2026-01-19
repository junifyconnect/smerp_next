'use client'

import { useState, useEffect } from 'react'

interface PaymentHistory {
  id: string
  paymentDate: string
  paymentAmount: string
  paymentMethod: string | null
  remarks: string | null
}

interface InvoiceItem {
  id: string
  approvalCode: string | null
  salesApprovalId: string | null
  partNumber: string | null
  itemName: string
  clientCompany?: string
  vendorCompany?: string
  quantity: number
  unitPrice: string
  totalPrice: string
  paidAmount: string
  remainAmount: string | null
  invoiceDate: string | null
  invoiceStatus: string | null
  paymentStatus: string
  remarks: string | null
  yearMonth: string | null
  createdAt: string
  paymentHistories: PaymentHistory[]
}

interface CombinedItem {
  approvalCode: string
  yearMonth: string | null
  sales: InvoiceItem[]
  purchases: InvoiceItem[]
  remarks: string | null
}

interface ApiResponse {
  items: CombinedItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  summary: {
    sales: {
      totalPrice: number
      paidAmount: number
      count: number
    }
    purchase: {
      totalPrice: number
      paidAmount: number
      count: number
    }
  }
}

export default function InvoiceIssuePage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState({
    yearMonth: '',
    search: '',
    salesInvoiceStatus: '',
    purchaseInvoiceStatus: '',
  })

  // 인라인 수정 상태
  const [editingCell, setEditingCell] = useState<{
    type: 'sales' | 'purchase'
    id: string
    field: 'invoiceDate' | 'invoiceStatus'
  } | null>(null)
  const [editValue, setEditValue] = useState('')

  // 결제 모달
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean
    type: 'sales' | 'purchase'
    invoice: InvoiceItem | null
  }>({ isOpen: false, type: 'sales', invoice: null })

  const [paymentForm, setPaymentForm] = useState({
    paymentDate: '',
    paymentAmount: '',
    paymentMethod: '',
    remarks: '',
  })

  // API 경로
  const getApiPath = (type: 'sales' | 'purchase') => {
    return type === 'sales'
      ? '/api/management/sales-invoice-status'
      : '/api/management/purchase-invoice-status'
  }

  // 목록 조회
  const fetchList = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append('limit', '100')
      if (filter.yearMonth) params.append('yearMonth', filter.yearMonth)
      if (filter.search) params.append('search', filter.search)
      if (filter.salesInvoiceStatus) params.append('salesInvoiceStatus', filter.salesInvoiceStatus)
      if (filter.purchaseInvoiceStatus) params.append('purchaseInvoiceStatus', filter.purchaseInvoiceStatus)

      const res = await fetch(`/api/management/invoice-issue?${params.toString()}`)
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

  // 계산서 발행일/상태 업데이트
  const updateInvoice = async (type: 'sales' | 'purchase', id: string, field: string, value: string) => {
    try {
      const updateData: Record<string, unknown> = {}
      if (field === 'invoiceDate') {
        updateData.invoiceDate = value || null
      } else if (field === 'invoiceStatus') {
        updateData.invoiceStatus = value || null
      }

      const res = await fetch(`${getApiPath(type)}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
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

  // 결제내역 추가
  const addPayment = async () => {
    if (!paymentForm.paymentDate || !paymentForm.paymentAmount) {
      alert('결제일과 결제금액은 필수입니다')
      return
    }

    try {
      const res = await fetch(`${getApiPath(paymentModal.type)}/${paymentModal.invoice?.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentDate: paymentForm.paymentDate,
          paymentAmount: Number(paymentForm.paymentAmount),
          paymentMethod: paymentForm.paymentMethod || null,
          remarks: paymentForm.remarks || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || '결제내역 추가 실패')
      }

      setPaymentForm({ paymentDate: '', paymentAmount: '', paymentMethod: '', remarks: '' })
      fetchList()

      // 모달 업데이트
      const updatedRes = await fetch(`${getApiPath(paymentModal.type)}/${paymentModal.invoice?.id}`)
      const updatedInvoice = await updatedRes.json()
      setPaymentModal(prev => ({ ...prev, invoice: updatedInvoice }))
    } catch (err) {
      alert(String(err))
    }
  }

  // 결제내역 삭제
  const deletePayment = async (paymentId: string) => {
    if (!confirm('결제내역을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`${getApiPath(paymentModal.type)}/${paymentModal.invoice?.id}/payment?paymentId=${paymentId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || '결제내역 삭제 실패')
      }

      fetchList()

      // 모달 업데이트
      const updatedRes = await fetch(`${getApiPath(paymentModal.type)}/${paymentModal.invoice?.id}`)
      const updatedInvoice = await updatedRes.json()
      setPaymentModal(prev => ({ ...prev, invoice: updatedInvoice }))
    } catch (err) {
      alert(String(err))
    }
  }

  const formatNumber = (num: number | string) => {
    return Number(num).toLocaleString()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return dateStr.split('T')[0]
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">계산서 발행 현황</h1>
        <p className="text-gray-500 mt-1">품의코드 기준 매출/매입 계산서를 통합 관리합니다</p>
      </div>

      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-blue-500 text-lg">ℹ</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">자동 등록 안내</p>
            <p>품의서가 <span className="font-bold text-green-700">승인(APPROVED)</span>되면 매출/매입 계산서 발행현황에 자동으로 등록됩니다.</p>
          </div>
        </div>
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
          <div className="w-28">
            <label className="block text-sm text-gray-600 mb-1">년월</label>
            <input
              type="text"
              value={filter.yearMonth}
              onChange={(e) => setFilter({ ...filter, yearMonth: e.target.value })}
              placeholder="26.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="w-28">
            <label className="block text-sm text-blue-600 mb-1">매출 발행</label>
            <select
              value={filter.salesInvoiceStatus}
              onChange={(e) => setFilter({ ...filter, salesInvoiceStatus: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-blue-50"
            >
              <option value="">전체</option>
              <option value="발행완료">발행완료</option>
              <option value="미발행">미발행</option>
            </select>
          </div>
          <div className="w-28">
            <label className="block text-sm text-purple-600 mb-1">매입 발행</label>
            <select
              value={filter.purchaseInvoiceStatus}
              onChange={(e) => setFilter({ ...filter, purchaseInvoiceStatus: e.target.value })}
              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-purple-50"
            >
              <option value="">전체</option>
              <option value="발행완료">발행완료</option>
              <option value="미발행">미발행</option>
            </select>
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

      {/* 결과 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* 요약 */}
          <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b text-center">
            <div className="col-span-3 border-r border-gray-300">
              <div className="text-sm font-medium text-blue-700 mb-2">매출</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-xs text-gray-500">건수</div>
                  <div className="text-lg font-bold text-gray-900">{data.summary.sales.count}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">총액</div>
                  <div className="text-lg font-bold text-blue-700">{formatNumber(data.summary.sales.totalPrice)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">입금</div>
                  <div className="text-lg font-bold text-green-600">{formatNumber(data.summary.sales.paidAmount)}</div>
                </div>
              </div>
            </div>
            <div className="col-span-3">
              <div className="text-sm font-medium text-purple-700 mb-2">매입</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-xs text-gray-500">건수</div>
                  <div className="text-lg font-bold text-gray-900">{data.summary.purchase.count}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">총액</div>
                  <div className="text-lg font-bold text-purple-700">{formatNumber(data.summary.purchase.totalPrice)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">출금</div>
                  <div className="text-lg font-bold text-green-600">{formatNumber(data.summary.purchase.paidAmount)}</div>
                </div>
              </div>
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
              <table className="w-full text-xs">
                <thead>
                  {/* 영역 헤더 */}
                  <tr className="border-b bg-gray-100">
                    <th rowSpan={2} className="px-2 py-2 text-left font-medium text-gray-600 w-24 border-r">품의코드</th>
                    <th colSpan={6} className="px-2 py-2 text-center font-bold text-blue-700 bg-blue-50 border-r-2 border-gray-300">
                      매출 계산서
                    </th>
                    <th colSpan={6} className="px-2 py-2 text-center font-bold text-purple-700 bg-purple-50">
                      매입 계산서
                    </th>
                    <th rowSpan={2} className="px-2 py-2 text-left font-medium text-gray-600 w-20 border-l">비고</th>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    {/* 매출 컬럼 */}
                    <th className="px-2 py-2 text-left font-medium text-gray-600 w-24 bg-blue-50/50">매출처</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-600 min-w-[120px] bg-blue-50/50">품목</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600 w-24 bg-blue-50/50">합계</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-600 w-24 bg-blue-50/50">발행일</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-600 w-20 bg-blue-50/50">발행</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-600 w-24 border-r-2 border-gray-300 bg-blue-50/50">입금</th>
                    {/* 매입 컬럼 */}
                    <th className="px-2 py-2 text-left font-medium text-gray-600 w-24 bg-purple-50/50">매입처</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-600 min-w-[120px] bg-purple-50/50">품목</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600 w-24 bg-purple-50/50">합계</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-600 w-24 bg-purple-50/50">발행일</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-600 w-20 bg-purple-50/50">발행</th>
                    <th className="px-2 py-2 text-center font-medium text-gray-600 w-24 bg-purple-50/50">출금</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((item) => {
                    const maxRows = Math.max(item.sales.length, item.purchases.length, 1)

                    return Array.from({ length: maxRows }).map((_, rowIndex) => {
                      const sale = item.sales[rowIndex]
                      const purchase = item.purchases[rowIndex]

                      return (
                        <tr key={`${item.approvalCode}-${rowIndex}`} className="hover:bg-gray-50">
                          {/* 품의코드 - 첫 행에만 표시 */}
                          {rowIndex === 0 && (
                            <td rowSpan={maxRows} className="px-2 py-2 border-r align-top">
                              <div className="font-mono text-blue-600 font-medium">{item.approvalCode || '-'}</div>
                              {item.yearMonth && (
                                <div className="text-gray-400 mt-1">{item.yearMonth}</div>
                              )}
                            </td>
                          )}

                          {/* 매출 영역 */}
                          {sale ? (
                            <>
                              <td className="px-2 py-2 bg-blue-50/30">{sale.clientCompany || '-'}</td>
                              <td className="px-2 py-2 bg-blue-50/30">
                                <div className="truncate max-w-[150px]" title={sale.itemName}>{sale.itemName}</div>
                                {sale.partNumber && <div className="text-gray-400">{sale.partNumber}</div>}
                              </td>
                              <td className="px-2 py-2 text-right font-medium bg-blue-50/30">
                                {formatNumber(sale.totalPrice)}
                              </td>
                              <td className="px-2 py-2 text-center bg-blue-50/30">
                                {editingCell?.type === 'sales' && editingCell.id === sale.id && editingCell.field === 'invoiceDate' ? (
                                  <input
                                    type="date"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => updateInvoice('sales', sale.id, 'invoiceDate', editValue)}
                                    onKeyDown={(e) => e.key === 'Enter' && updateInvoice('sales', sale.id, 'invoiceDate', editValue)}
                                    className="w-full px-1 py-0.5 border rounded text-xs"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    onClick={() => {
                                      setEditingCell({ type: 'sales', id: sale.id, field: 'invoiceDate' })
                                      setEditValue(sale.invoiceDate?.split('T')[0] || '')
                                    }}
                                    className={`cursor-pointer hover:bg-blue-100 px-1 rounded ${sale.invoiceDate ? 'text-green-700' : 'text-gray-400'}`}
                                  >
                                    {formatDate(sale.invoiceDate)}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center bg-blue-50/30">
                                {editingCell?.type === 'sales' && editingCell.id === sale.id && editingCell.field === 'invoiceStatus' ? (
                                  <select
                                    value={editValue}
                                    onChange={(e) => {
                                      setEditValue(e.target.value)
                                      updateInvoice('sales', sale.id, 'invoiceStatus', e.target.value)
                                    }}
                                    className="w-full px-1 py-0.5 border rounded text-xs"
                                    autoFocus
                                  >
                                    <option value="">미발행</option>
                                    <option value="발행완료">완료</option>
                                    <option value="반품">반품</option>
                                  </select>
                                ) : (
                                  <span
                                    onClick={() => {
                                      setEditingCell({ type: 'sales', id: sale.id, field: 'invoiceStatus' })
                                      setEditValue(sale.invoiceStatus || '')
                                    }}
                                    className={`cursor-pointer px-1.5 py-0.5 rounded-full text-xs ${
                                      sale.invoiceStatus === '발행완료'
                                        ? 'bg-green-100 text-green-700'
                                        : sale.invoiceStatus === '반품'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}
                                  >
                                    {sale.invoiceStatus === '발행완료' ? '완료' : sale.invoiceStatus || '미발행'}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center border-r-2 border-gray-300 bg-blue-50/30">
                                <button
                                  onClick={() => setPaymentModal({ isOpen: true, type: 'sales', invoice: sale })}
                                  className={`px-1.5 py-0.5 rounded text-xs ${
                                    sale.paymentStatus === 'COMPLETED'
                                      ? 'bg-green-100 text-green-700'
                                      : sale.paymentStatus === 'PARTIAL'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {formatNumber(sale.paidAmount)}
                                </button>
                              </td>
                            </>
                          ) : (
                            <td colSpan={6} className="px-2 py-2 text-center text-gray-300 border-r-2 border-gray-300 bg-blue-50/30">-</td>
                          )}

                          {/* 매입 영역 */}
                          {purchase ? (
                            <>
                              <td className="px-2 py-2 bg-purple-50/30">{purchase.vendorCompany || '-'}</td>
                              <td className="px-2 py-2 bg-purple-50/30">
                                <div className="truncate max-w-[150px]" title={purchase.itemName}>{purchase.itemName}</div>
                                {purchase.partNumber && <div className="text-gray-400">{purchase.partNumber}</div>}
                              </td>
                              <td className="px-2 py-2 text-right font-medium bg-purple-50/30">
                                {formatNumber(purchase.totalPrice)}
                              </td>
                              <td className="px-2 py-2 text-center bg-purple-50/30">
                                {editingCell?.type === 'purchase' && editingCell.id === purchase.id && editingCell.field === 'invoiceDate' ? (
                                  <input
                                    type="date"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => updateInvoice('purchase', purchase.id, 'invoiceDate', editValue)}
                                    onKeyDown={(e) => e.key === 'Enter' && updateInvoice('purchase', purchase.id, 'invoiceDate', editValue)}
                                    className="w-full px-1 py-0.5 border rounded text-xs"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    onClick={() => {
                                      setEditingCell({ type: 'purchase', id: purchase.id, field: 'invoiceDate' })
                                      setEditValue(purchase.invoiceDate?.split('T')[0] || '')
                                    }}
                                    className={`cursor-pointer hover:bg-purple-100 px-1 rounded ${purchase.invoiceDate ? 'text-green-700' : 'text-gray-400'}`}
                                  >
                                    {formatDate(purchase.invoiceDate)}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center bg-purple-50/30">
                                {editingCell?.type === 'purchase' && editingCell.id === purchase.id && editingCell.field === 'invoiceStatus' ? (
                                  <select
                                    value={editValue}
                                    onChange={(e) => {
                                      setEditValue(e.target.value)
                                      updateInvoice('purchase', purchase.id, 'invoiceStatus', e.target.value)
                                    }}
                                    className="w-full px-1 py-0.5 border rounded text-xs"
                                    autoFocus
                                  >
                                    <option value="">미발행</option>
                                    <option value="발행완료">완료</option>
                                    <option value="반품">반품</option>
                                  </select>
                                ) : (
                                  <span
                                    onClick={() => {
                                      setEditingCell({ type: 'purchase', id: purchase.id, field: 'invoiceStatus' })
                                      setEditValue(purchase.invoiceStatus || '')
                                    }}
                                    className={`cursor-pointer px-1.5 py-0.5 rounded-full text-xs ${
                                      purchase.invoiceStatus === '발행완료'
                                        ? 'bg-green-100 text-green-700'
                                        : purchase.invoiceStatus === '반품'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}
                                  >
                                    {purchase.invoiceStatus === '발행완료' ? '완료' : purchase.invoiceStatus || '미발행'}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center bg-purple-50/30">
                                <button
                                  onClick={() => setPaymentModal({ isOpen: true, type: 'purchase', invoice: purchase })}
                                  className={`px-1.5 py-0.5 rounded text-xs ${
                                    purchase.paymentStatus === 'COMPLETED'
                                      ? 'bg-green-100 text-green-700'
                                      : purchase.paymentStatus === 'PARTIAL'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {formatNumber(purchase.paidAmount)}
                                </button>
                              </td>
                            </>
                          ) : (
                            <td colSpan={6} className="px-2 py-2 text-center text-gray-300 bg-purple-50/30">-</td>
                          )}

                          {/* 비고 - 첫 행에만 표시 */}
                          {rowIndex === 0 && (
                            <td rowSpan={maxRows} className="px-2 py-2 border-l align-top text-gray-500">
                              {item.remarks || '-'}
                            </td>
                          )}
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 결제 모달 */}
      {paymentModal.isOpen && paymentModal.invoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {paymentModal.type === 'sales' ? '입금' : '출금'} 관리
                </h2>
                <button
                  onClick={() => setPaymentModal({ isOpen: false, type: 'sales', invoice: null })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                <span className="font-mono text-blue-600">{paymentModal.invoice.approvalCode}</span>
                {' - '}
                {paymentModal.invoice.itemName}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 금액 현황 */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-500">총 금액</div>
                  <div className="text-lg font-bold">{formatNumber(paymentModal.invoice.totalPrice)}원</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">{paymentModal.type === 'sales' ? '입금' : '출금'} 금액</div>
                  <div className="text-lg font-bold text-green-600">{formatNumber(paymentModal.invoice.paidAmount)}원</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">잔액</div>
                  <div className="text-lg font-bold text-red-600">{formatNumber(paymentModal.invoice.remainAmount || 0)}원</div>
                </div>
              </div>

              {/* 결제 추가 폼 */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3">{paymentModal.type === 'sales' ? '입금' : '출금'} 추가</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{paymentModal.type === 'sales' ? '입금' : '출금'}일 *</label>
                    <input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">금액 *</label>
                    <input
                      type="number"
                      value={paymentForm.paymentAmount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentAmount: e.target.value })}
                      placeholder="금액 입력"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">방법</label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">선택</option>
                      <option value="계좌이체">계좌이체</option>
                      <option value="카드">카드</option>
                      <option value="현금">현금</option>
                      <option value="어음">어음</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">비고</label>
                    <input
                      type="text"
                      value={paymentForm.remarks}
                      onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                      placeholder="선금, 중도금, 잔금 등"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={addPayment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    {paymentModal.type === 'sales' ? '입금' : '출금'} 추가
                  </button>
                </div>
              </div>

              {/* 결제 내역 */}
              <div>
                <h3 className="text-sm font-medium mb-3">{paymentModal.type === 'sales' ? '입금' : '출금'} 내역</h3>
                {paymentModal.invoice.paymentHistories.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    내역이 없습니다.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">일자</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600">금액</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">방법</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">비고</th>
                          <th className="px-4 py-2 text-center font-medium text-gray-600">삭제</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {paymentModal.invoice.paymentHistories.map((payment) => (
                          <tr key={payment.id}>
                            <td className="px-4 py-2">{formatDate(payment.paymentDate)}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatNumber(payment.paymentAmount)}원</td>
                            <td className="px-4 py-2">{payment.paymentMethod || '-'}</td>
                            <td className="px-4 py-2 text-gray-500">{payment.remarks || '-'}</td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => deletePayment(payment.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setPaymentModal({ isOpen: false, type: 'sales', invoice: null })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
