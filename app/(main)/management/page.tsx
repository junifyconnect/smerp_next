'use client'

import { useState } from 'react'
import Link from 'next/link'

type TabType = 'sales-ledger' | 'purchase-ledger' | 'invoice-status' | 'monthly-forecast' | 'company-rank' | 'annual-report'

interface ApiResponse {
  success?: boolean
  error?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export default function ManagementTestPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sales-ledger')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApiResponse | null>(null)

  // 매출장 폼 상태
  const [salesLedgerForm, setSalesLedgerForm] = useState({
    transactionDate: new Date().toISOString().split('T')[0],
    clientCompany: '',
    endUser: '',
    category: 'MA',
    subCategory: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    managerName: '',
    paymentDueDate: '',
  })

  // 매입장 폼 상태
  const [purchaseLedgerForm, setPurchaseLedgerForm] = useState({
    invoiceDate: new Date().toISOString().split('T')[0],
    vendorCompany: '',
    clientCompany: '',
    category: 'MA',
    subCategory: '',
    itemName: '',
    quantity: 1,
    unitPrice: 0,
    ledgerType: 'INVOICE',
    paymentDueDate: '',
  })

  // 계산서 발행현황 폼 상태
  const [invoiceStatusForm, setInvoiceStatusForm] = useState({
    approvalCode: '',
    partNumber: '',
    itemName: '',
    clientCompany: '',
    quantity: 1,
    unitPrice: 0,
    invoiceDate: '',
    invoiceStatus: '',
    yearMonth: new Date().toISOString().slice(2, 7).replace('-', '.'),
  })

  // 통계 필터 상태
  const [statsFilter, setStatsFilter] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    type: 'sales',
    startDate: '',
    endDate: '',
  })

  // API 호출
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

  const tabs = [
    { id: 'sales-ledger', label: '매출장' },
    { id: 'purchase-ledger', label: '매입장' },
    { id: 'invoice-status', label: '계산서 발행현황' },
    { id: 'monthly-forecast', label: '월말 입출금 예정' },
    { id: 'company-rank', label: '거래처 순위' },
    { id: 'annual-report', label: '연 마감 통계' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">경영팀 기능 테스트</h1>
          <p className="text-gray-500 mt-1">매출장, 매입장, 통계 등 경영팀 업무 API 테스트</p>
        </div>
        <Link
          href="/admin/api-test"
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          ← 목록으로
        </Link>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType)
                setResult(null)
              }}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 입력 폼 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* 매출장 탭 */}
          {activeTab === 'sales-ledger' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">매출장</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">거래일</label>
                  <input
                    type="date"
                    value={salesLedgerForm.transactionDate}
                    onChange={(e) => setSalesLedgerForm({ ...salesLedgerForm, transactionDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">구분</label>
                  <select
                    value={salesLedgerForm.category}
                    onChange={(e) => setSalesLedgerForm({ ...salesLedgerForm, category: e.target.value })}
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
                <label className="block text-sm text-gray-600 mb-1">매출처</label>
                <input
                  type="text"
                  value={salesLedgerForm.clientCompany}
                  onChange={(e) => setSalesLedgerForm({ ...salesLedgerForm, clientCompany: e.target.value })}
                  placeholder="매출처명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">END-USER</label>
                <input
                  type="text"
                  value={salesLedgerForm.endUser}
                  onChange={(e) => setSalesLedgerForm({ ...salesLedgerForm, endUser: e.target.value })}
                  placeholder="최종 사용처"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">거래내용</label>
                <textarea
                  value={salesLedgerForm.description}
                  onChange={(e) => setSalesLedgerForm({ ...salesLedgerForm, description: e.target.value })}
                  placeholder="거래내용 상세"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">수량</label>
                  <input
                    type="number"
                    value={salesLedgerForm.quantity}
                    onChange={(e) => setSalesLedgerForm({ ...salesLedgerForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">단가</label>
                  <input
                    type="number"
                    value={salesLedgerForm.unitPrice}
                    onChange={(e) => setSalesLedgerForm({ ...salesLedgerForm, unitPrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">담당자</label>
                  <input
                    type="text"
                    value={salesLedgerForm.managerName}
                    onChange={(e) => setSalesLedgerForm({ ...salesLedgerForm, managerName: e.target.value })}
                    placeholder="담당자명"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">결제예정일</label>
                  <input
                    type="date"
                    value={salesLedgerForm.paymentDueDate}
                    onChange={(e) => setSalesLedgerForm({ ...salesLedgerForm, paymentDueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => callApi('POST', '/api/management/sales-ledger', salesLedgerForm)}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50"
                >
                  등록
                </button>
                <button
                  onClick={() => callApi('GET', '/api/management/sales-ledger?limit=10')}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                >
                  목록 조회
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
          )}

          {/* 매입장 탭 */}
          {activeTab === 'purchase-ledger' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">매입장</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">계산서일</label>
                  <input
                    type="date"
                    value={purchaseLedgerForm.invoiceDate}
                    onChange={(e) => setPurchaseLedgerForm({ ...purchaseLedgerForm, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">유형</label>
                  <select
                    value={purchaseLedgerForm.ledgerType}
                    onChange={(e) => setPurchaseLedgerForm({ ...purchaseLedgerForm, ledgerType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="INVOICE">세금계산서</option>
                    <option value="CASH">현금영수증</option>
                    <option value="CARD">법인카드</option>
                    <option value="IMPORT">수입</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">매입처</label>
                <input
                  type="text"
                  value={purchaseLedgerForm.vendorCompany}
                  onChange={(e) => setPurchaseLedgerForm({ ...purchaseLedgerForm, vendorCompany: e.target.value })}
                  placeholder="매입처명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">매출처 (연결)</label>
                  <input
                    type="text"
                    value={purchaseLedgerForm.clientCompany}
                    onChange={(e) => setPurchaseLedgerForm({ ...purchaseLedgerForm, clientCompany: e.target.value })}
                    placeholder="연결된 매출처"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">구분</label>
                  <select
                    value={purchaseLedgerForm.category}
                    onChange={(e) => setPurchaseLedgerForm({ ...purchaseLedgerForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="MA">MA</option>
                    <option value="상품">상품</option>
                    <option value="일반경비">일반경비</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">품목명</label>
                <input
                  type="text"
                  value={purchaseLedgerForm.itemName}
                  onChange={(e) => setPurchaseLedgerForm({ ...purchaseLedgerForm, itemName: e.target.value })}
                  placeholder="품목명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">수량</label>
                  <input
                    type="number"
                    value={purchaseLedgerForm.quantity}
                    onChange={(e) => setPurchaseLedgerForm({ ...purchaseLedgerForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">단가</label>
                  <input
                    type="number"
                    value={purchaseLedgerForm.unitPrice}
                    onChange={(e) => setPurchaseLedgerForm({ ...purchaseLedgerForm, unitPrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => callApi('POST', '/api/management/purchase-ledger', purchaseLedgerForm)}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50"
                >
                  등록
                </button>
                <button
                  onClick={() => callApi('GET', '/api/management/purchase-ledger?limit=10')}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                >
                  목록 조회
                </button>
              </div>
            </div>
          )}

          {/* 계산서 발행현황 탭 */}
          {activeTab === 'invoice-status' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">계산서 발행현황</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">품의코드</label>
                  <input
                    type="text"
                    value={invoiceStatusForm.approvalCode}
                    onChange={(e) => setInvoiceStatusForm({ ...invoiceStatusForm, approvalCode: e.target.value })}
                    placeholder="Y251201-01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">년월</label>
                  <input
                    type="text"
                    value={invoiceStatusForm.yearMonth}
                    onChange={(e) => setInvoiceStatusForm({ ...invoiceStatusForm, yearMonth: e.target.value })}
                    placeholder="25.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">매출처</label>
                <input
                  type="text"
                  value={invoiceStatusForm.clientCompany}
                  onChange={(e) => setInvoiceStatusForm({ ...invoiceStatusForm, clientCompany: e.target.value })}
                  placeholder="매출처명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">품목명</label>
                <input
                  type="text"
                  value={invoiceStatusForm.itemName}
                  onChange={(e) => setInvoiceStatusForm({ ...invoiceStatusForm, itemName: e.target.value })}
                  placeholder="품목명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">수량</label>
                  <input
                    type="number"
                    value={invoiceStatusForm.quantity}
                    onChange={(e) => setInvoiceStatusForm({ ...invoiceStatusForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">단가</label>
                  <input
                    type="number"
                    value={invoiceStatusForm.unitPrice}
                    onChange={(e) => setInvoiceStatusForm({ ...invoiceStatusForm, unitPrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">계산서 발행일</label>
                  <input
                    type="date"
                    value={invoiceStatusForm.invoiceDate}
                    onChange={(e) => setInvoiceStatusForm({ ...invoiceStatusForm, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">발행상태</label>
                  <input
                    type="text"
                    value={invoiceStatusForm.invoiceStatus}
                    onChange={(e) => setInvoiceStatusForm({ ...invoiceStatusForm, invoiceStatus: e.target.value })}
                    placeholder="반품, 발행완료 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => callApi('POST', '/api/management/invoice-status', invoiceStatusForm)}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50"
                >
                  등록
                </button>
                <button
                  onClick={() => callApi('GET', `/api/management/invoice-status?yearMonth=${invoiceStatusForm.yearMonth}&limit=10`)}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                >
                  목록 조회
                </button>
              </div>
            </div>
          )}

          {/* 월말 입출금 예정 탭 */}
          {activeTab === 'monthly-forecast' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">월말 입출금 예정</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">년도</label>
                  <input
                    type="number"
                    value={statsFilter.year}
                    onChange={(e) => setStatsFilter({ ...statsFilter, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">월</label>
                  <select
                    value={statsFilter.month}
                    onChange={(e) => setStatsFilter({ ...statsFilter, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{m}월</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => callApi('GET', `/api/management/stats/monthly-forecast?year=${statsFilter.year}&month=${statsFilter.month}`)}
                disabled={loading}
                className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50"
              >
                조회
              </button>
            </div>
          )}

          {/* 거래처 순위 탭 */}
          {activeTab === 'company-rank' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">거래처 순위</h3>

              <div>
                <label className="block text-sm text-gray-600 mb-1">유형</label>
                <select
                  value={statsFilter.type}
                  onChange={(e) => setStatsFilter({ ...statsFilter, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="sales">매출처 순위</option>
                  <option value="purchase">매입처 순위</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">시작일</label>
                  <input
                    type="date"
                    value={statsFilter.startDate}
                    onChange={(e) => setStatsFilter({ ...statsFilter, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">종료일</label>
                  <input
                    type="date"
                    value={statsFilter.endDate}
                    onChange={(e) => setStatsFilter({ ...statsFilter, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  let url = `/api/management/stats/company-rank?type=${statsFilter.type}`
                  if (statsFilter.startDate) url += `&startDate=${statsFilter.startDate}`
                  if (statsFilter.endDate) url += `&endDate=${statsFilter.endDate}`
                  callApi('GET', url)
                }}
                disabled={loading}
                className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50"
              >
                조회
              </button>
            </div>
          )}

          {/* 연 마감 통계 탭 */}
          {activeTab === 'annual-report' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">연 마감 통계</h3>

              <div>
                <label className="block text-sm text-gray-600 mb-1">년도</label>
                <input
                  type="number"
                  value={statsFilter.year}
                  onChange={(e) => setStatsFilter({ ...statsFilter, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <button
                onClick={() => callApi('GET', `/api/management/stats/annual-report?year=${statsFilter.year}`)}
                disabled={loading}
                className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50"
              >
                조회
              </button>

              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-2">조회 내용:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>총매출 / 총매입 / GP</li>
                  <li>월별 매출/매입 추이</li>
                  <li>품목별(MA/상품) 매출/GP</li>
                  <li>담당자별 매출/GP</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 결과 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">API 응답</h3>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
            </div>
          )}

          {!loading && result && (
            <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-[600px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}

          {!loading && !result && (
            <div className="text-gray-400 text-center py-12">
              왼쪽에서 기능을 테스트하세요
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
