'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type TabType = 'sales' | 'purchase'

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

interface ApiResponse {
  items: InvoiceItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  summary: {
    totalPrice: number
    paidAmount: number
    count: number
  }
}

export default function InvoiceStatusTestPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sales')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState({
    yearMonth: '',
    search: '',
    invoiceStatus: '',
    paymentStatus: '',
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    invoiceDate: '',
    invoiceStatus: '',
  })

  // 결제 모달
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean
    invoiceId: string
    invoice: InvoiceItem | null
  }>({ isOpen: false, invoiceId: '', invoice: null })

  const [paymentForm, setPaymentForm] = useState({
    paymentDate: '',
    paymentAmount: '',
    paymentMethod: '',
    remarks: '',
  })

  // API 경로
  const getApiPath = () => {
    return activeTab === 'sales'
      ? '/api/management/sales-invoice-status'
      : '/api/management/purchase-invoice-status'
  }

  // 목록 조회
  const fetchList = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append('limit', '50')
      if (filter.yearMonth) params.append('yearMonth', filter.yearMonth)
      if (filter.search) params.append('search', filter.search)
      if (filter.invoiceStatus) params.append('invoiceStatus', filter.invoiceStatus)
      if (filter.paymentStatus) params.append('paymentStatus', filter.paymentStatus)

      const res = await fetch(`${getApiPath()}?${params.toString()}`)
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

  // 초기 로드 및 탭 변경 시
  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // 계산서 발행일/상태 업데이트
  const updateInvoice = async (id: string) => {
    try {
      const res = await fetch(`${getApiPath()}/${id}`, {
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

      setEditingId(null)
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
      const res = await fetch(`${getApiPath()}/${paymentModal.invoiceId}/payment`, {
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
      const updatedRes = await fetch(`${getApiPath()}/${paymentModal.invoiceId}`)
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
      const res = await fetch(`${getApiPath()}/${paymentModal.invoiceId}/payment?paymentId=${paymentId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || '결제내역 삭제 실패')
      }

      fetchList()

      // 모달 업데이트
      const updatedRes = await fetch(`${getApiPath()}/${paymentModal.invoiceId}`)
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

  const getCompanyField = (item: InvoiceItem) => {
    return activeTab === 'sales' ? item.clientCompany : item.vendorCompany
  }

  const getCompanyLabel = () => {
    return activeTab === 'sales' ? '매출처' : '매입처'
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">계산서 발행현황</h1>
          <p className="text-gray-500 mt-1">승인된 품의서의 매출/매입 계산서 발행 상태 관리</p>
        </div>
        <Link
          href="/admin/api-test"
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          ← 목록으로
        </Link>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          매출 계산서
        </button>
        <button
          onClick={() => setActiveTab('purchase')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'purchase'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          매입 계산서
        </button>
      </div>

      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-blue-500 text-lg">i</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">자동 등록 안내</p>
            <p>품의서가 <span className="font-bold text-green-700">APPROVED</span> 되면 매출/매입 계산서 발행현황에 자동 등록됩니다.</p>
            <p>이 페이지에서는 계산서 발행일, 발행 상태, 결제 내역을 관리합니다.</p>
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
          <div className="w-32">
            <label className="block text-sm text-gray-600 mb-1">발행상태</label>
            <select
              value={filter.invoiceStatus}
              onChange={(e) => setFilter({ ...filter, invoiceStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">전체</option>
              <option value="발행완료">발행완료</option>
              <option value="미발행">미발행</option>
              <option value="반품">반품</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm text-gray-600 mb-1">결제상태</label>
            <select
              value={filter.paymentStatus}
              onChange={(e) => setFilter({ ...filter, paymentStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">전체</option>
              <option value="PENDING">미결제</option>
              <option value="PARTIAL">부분결제</option>
              <option value="COMPLETED">결제완료</option>
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
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
            <div>
              <div className="text-sm text-gray-500">총 건수</div>
              <div className="text-xl font-bold text-gray-900">{data.summary.count}건</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">총 금액</div>
              <div className="text-xl font-bold text-blue-700">{formatNumber(data.summary.totalPrice)}원</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">결제 금액</div>
              <div className="text-xl font-bold text-green-700">{formatNumber(data.summary.paidAmount)}원</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">페이지</div>
              <div className="text-xl font-bold text-gray-900">{data.page} / {data.totalPages}</div>
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
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">품의코드</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{getCompanyLabel()}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">품목</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">수량</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">금액</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">결제/잔액</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">발행일</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">발행상태</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">결제상태</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-blue-600">{item.approvalCode || '-'}</span>
                      </td>
                      <td className="px-4 py-3">{getCompanyField(item)}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="truncate" title={item.itemName}>{item.itemName}</div>
                        {item.partNumber && (
                          <div className="text-xs text-gray-400">{item.partNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatNumber(item.totalPrice)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-green-600">{formatNumber(item.paidAmount)}</div>
                        <div className="text-xs text-gray-400">잔액: {formatNumber(item.remainAmount || 0)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {editingId === item.id ? (
                          <input
                            type="date"
                            value={editForm.invoiceDate}
                            onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        ) : (
                          <span className={item.invoiceDate ? 'text-green-700' : 'text-gray-400'}>
                            {formatDate(item.invoiceDate)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === item.id ? (
                          <select
                            value={editForm.invoiceStatus}
                            onChange={(e) => setEditForm({ ...editForm, invoiceStatus: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">미발행</option>
                            <option value="발행완료">발행완료</option>
                            <option value="반품">반품</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            item.invoiceStatus === '발행완료'
                              ? 'bg-green-100 text-green-700'
                              : item.invoiceStatus === '반품'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {item.invoiceStatus || '미발행'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          item.paymentStatus === 'COMPLETED'
                            ? 'bg-green-100 text-green-700'
                            : item.paymentStatus === 'PARTIAL'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.paymentStatus === 'COMPLETED' ? '결제완료'
                            : item.paymentStatus === 'PARTIAL' ? '부분결제'
                            : '미결제'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingId === item.id ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => updateInvoice(item.id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => {
                                setEditingId(item.id)
                                setEditForm({
                                  invoiceDate: item.invoiceDate?.split('T')[0] || '',
                                  invoiceStatus: item.invoiceStatus || '',
                                })
                              }}
                              className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => setPaymentModal({ isOpen: true, invoiceId: item.id, invoice: item })}
                              className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200"
                            >
                              결제
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
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
                <h2 className="text-lg font-bold">결제 관리</h2>
                <button
                  onClick={() => setPaymentModal({ isOpen: false, invoiceId: '', invoice: null })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  X
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
                  <div className="text-sm text-gray-500">결제 금액</div>
                  <div className="text-lg font-bold text-green-600">{formatNumber(paymentModal.invoice.paidAmount)}원</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">잔액</div>
                  <div className="text-lg font-bold text-red-600">{formatNumber(paymentModal.invoice.remainAmount || 0)}원</div>
                </div>
              </div>

              {/* 결제 추가 폼 */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3">결제 추가</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">결제일 *</label>
                    <input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">결제금액 *</label>
                    <input
                      type="number"
                      value={paymentForm.paymentAmount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentAmount: e.target.value })}
                      placeholder="금액 입력"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">결제방법</label>
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
                    결제 추가
                  </button>
                </div>
              </div>

              {/* 결제 내역 */}
              <div>
                <h3 className="text-sm font-medium mb-3">결제 내역</h3>
                {paymentModal.invoice.paymentHistories.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    결제 내역이 없습니다.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">결제일</th>
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
                onClick={() => setPaymentModal({ isOpen: false, invoiceId: '', invoice: null })}
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
