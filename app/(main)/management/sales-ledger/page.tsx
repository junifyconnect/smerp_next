'use client'

import { useState } from 'react'
import Link from 'next/link'

interface SalesLedgerItem {
  id: string
  approvalCode?: string
  vendorCode?: string
  transactionDate: string
  clientCompany: string
  endUser?: string
  category: string
  subCategory?: string
  description: string
  quantity: number
  unitPrice: string
  supplyAmount: string
  vatAmount: string
  totalAmount: string
  grossProfit?: string
  paymentDueDate?: string
  paymentDate?: string
  paymentStatus: string
  managerName?: string
  overdueDays?: number
}

interface ApiResponse {
  items?: SalesLedgerItem[]
  total?: number
  summary?: {
    totalSupplyAmount: number
    totalVatAmount: number
    totalAmount: number
    totalGrossProfit: number
    count: number
  }
  error?: string
}

export default function SalesLedgerTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApiResponse | null>(null)

  const [form, setForm] = useState({
    transactionDate: new Date().toISOString().split('T')[0],
    clientCompany: '',
    endUser: '',
    category: 'MA',
    subCategory: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    grossProfit: 0,
    managerName: '',
    paymentDueDate: '',
  })

  const [filter, setFilter] = useState({
    category: '',
    clientCompany: '',
    managerName: '',
    paymentStatus: '',
    startDate: '',
    endDate: '',
    search: '',
  })

  const callApi = async (method: string, url: string, body?: object) => {
    setLoading(true)
    setResult(null)
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      }
      if (body) {
        options.body = JSON.stringify(body)
      }
      const res = await fetch(url, options)
      const data = await res.json()
      setResult(data)
    } catch (error) {
      setResult({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    params.append('limit', '20')
    if (filter.category) params.append('category', filter.category)
    if (filter.clientCompany) params.append('clientCompany', filter.clientCompany)
    if (filter.managerName) params.append('managerName', filter.managerName)
    if (filter.paymentStatus) params.append('paymentStatus', filter.paymentStatus)
    if (filter.startDate) params.append('startDate', filter.startDate)
    if (filter.endDate) params.append('endDate', filter.endDate)
    if (filter.search) params.append('search', filter.search)
    callApi('GET', `/api/management/sales-ledger?${params.toString()}`)
  }

  const formatNumber = (num: string | number) => {
    return Number(num).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매출장 테스트</h1>
          <p className="text-gray-500 mt-1">매출 거래 내역 등록 및 조회</p>
        </div>
        <Link
          href="/admin/api-test"
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          ← 목록으로
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 등록 폼 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">매출장 등록</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">거래일 *</label>
                <input
                  type="date"
                  value={form.transactionDate}
                  onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">구분 *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="MA">MA</option>
                  <option value="상품">상품</option>
                  <option value="건물임대">건물임대</option>
                  <option value="장비임대">장비임대</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">매출처 *</label>
              <input
                type="text"
                value={form.clientCompany}
                onChange={(e) => setForm({ ...form, clientCompany: e.target.value })}
                placeholder="매출처명"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">END-USER</label>
              <input
                type="text"
                value={form.endUser}
                onChange={(e) => setForm({ ...form, endUser: e.target.value })}
                placeholder="최종 사용처"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">거래내용 *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="거래내용 상세"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">수량</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">단가</label>
                <input
                  type="number"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">GP</label>
                <input
                  type="number"
                  value={form.grossProfit}
                  onChange={(e) => setForm({ ...form, grossProfit: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">담당자</label>
                <input
                  type="text"
                  value={form.managerName}
                  onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                  placeholder="담당자명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">결제예정일</label>
                <input
                  type="date"
                  value={form.paymentDueDate}
                  onChange={(e) => setForm({ ...form, paymentDueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <button
              onClick={() => callApi('POST', '/api/management/sales-ledger', form)}
              disabled={loading || !form.clientCompany || !form.description}
              className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50"
            >
              {loading ? '처리중...' : '등록'}
            </button>
          </div>
        </div>

        {/* 조회 필터 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">조회</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">검색</label>
              <input
                type="text"
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                placeholder="품의코드, 매출처, END-USER..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">구분</label>
                <select
                  value={filter.category}
                  onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">전체</option>
                  <option value="MA">MA</option>
                  <option value="상품">상품</option>
                  <option value="건물임대">건물임대</option>
                  <option value="장비임대">장비임대</option>
                </select>
              </div>
              <div>
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
                  <option value="OVERDUE">연체</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">시작일</label>
                <input
                  type="date"
                  value={filter.startDate}
                  onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">종료일</label>
                <input
                  type="date"
                  value={filter.endDate}
                  onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
              >
                조회
              </button>
              <button
                onClick={() => callApi('GET', '/api/management/sales-ledger/overdue')}
                disabled={loading}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 disabled:opacity-50"
              >
                연체 조회
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 결과 */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">결과</h3>

          {result.error ? (
            <div className="text-red-600">{result.error}</div>
          ) : result.summary ? (
            <div className="space-y-4">
              {/* 요약 */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-500">총 건수</div>
                  <div className="text-lg font-bold">{result.summary.count}건</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">공급가액</div>
                  <div className="text-lg font-bold">{formatNumber(result.summary.totalSupplyAmount)}원</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">합계</div>
                  <div className="text-lg font-bold">{formatNumber(result.summary.totalAmount)}원</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">GP</div>
                  <div className="text-lg font-bold text-green-600">{formatNumber(result.summary.totalGrossProfit)}원</div>
                </div>
              </div>

              {/* 목록 */}
              {result.items && result.items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">거래일</th>
                        <th className="px-3 py-2 text-left">매출처</th>
                        <th className="px-3 py-2 text-left">구분</th>
                        <th className="px-3 py-2 text-left">거래내용</th>
                        <th className="px-3 py-2 text-right">합계</th>
                        <th className="px-3 py-2 text-center">상태</th>
                        <th className="px-3 py-2 text-left">담당자</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{item.transactionDate.split('T')[0]}</td>
                          <td className="px-3 py-2">{item.clientCompany}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{item.category}</span>
                          </td>
                          <td className="px-3 py-2 max-w-xs truncate">{item.description}</td>
                          <td className="px-3 py-2 text-right">{formatNumber(item.totalAmount)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              item.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              item.paymentStatus === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {item.paymentStatus === 'PENDING' ? '미결제' :
                               item.paymentStatus === 'COMPLETED' ? '완료' :
                               item.paymentStatus === 'OVERDUE' ? `연체(${item.overdueDays}일)` : item.paymentStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2">{item.managerName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
