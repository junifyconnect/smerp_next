'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface MAApprovalItem {
  smCode?: string
  vendorCode?: string
  customerName?: string
  clientCompany?: string
  salesPrice?: number
  quantity?: number
  billingType?: string
  startDate?: string
  endDate?: string
}

interface MAApprovalPurchaseItem {
  vendorCompany?: string
  purchasePrice?: number
  quantity?: number
  billingType?: string
}

interface MAApproval {
  id: string
  docNumber: string
  status: string
  approvalDate?: string
  managerName?: string
  totalAmount?: number
  createdAt: string
}

type TabType = 'create' | 'list'

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: '승인대기', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: '승인완료', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-700' },
}

export default function MAApprovalsTestPage() {
  const [activeTab, setActiveTab] = useState<TabType>('create')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/api-test" className="text-gray-500 hover:text-gray-700">← 목록</Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MA 품의서 테스트</h1>
          <p className="text-sm text-gray-500">MA Approval - 유지보수 품의서 생성, 승인 관리</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { key: 'create', label: 'MA 품의서 생성' },
            { key: 'list', label: '목록 조회' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'create' && <CreateMAApprovalTab />}
      {activeTab === 'list' && <MAApprovalListTab />}
    </div>
  )
}

function CreateMAApprovalTab() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; data?: MAApproval; error?: string } | null>(null)

  const getToday = () => {
    const d = new Date()
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const [formData, setFormData] = useState({
    approvalDate: getToday(),
    managerName: '',
    notes: '',
  })

  const [items, setItems] = useState<MAApprovalItem[]>([
    { smCode: '', vendorCode: '', customerName: '', clientCompany: '', salesPrice: 0, quantity: 1, billingType: '일시불', startDate: '', endDate: '' },
  ])

  const [purchaseItems, setPurchaseItems] = useState<MAApprovalPurchaseItem[]>([
    { vendorCompany: '', purchasePrice: 0, quantity: 1, billingType: '일시불' },
  ])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index: number, field: keyof MAApprovalItem, value: string | number) => {
    setItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }

  const handlePurchaseItemChange = (index: number, field: keyof MAApprovalPurchaseItem, value: string | number) => {
    setPurchaseItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }

  const addItem = () => setItems(prev => [...prev, { smCode: '', vendorCode: '', customerName: '', clientCompany: '', salesPrice: 0, quantity: 1, billingType: '일시불', startDate: '', endDate: '' }])
  const removeItem = (i: number) => items.length > 1 && setItems(prev => prev.filter((_, idx) => idx !== i))
  const addPurchaseItem = () => setPurchaseItems(prev => [...prev, { vendorCompany: '', purchasePrice: 0, quantity: 1, billingType: '일시불' }])
  const removePurchaseItem = (i: number) => purchaseItems.length > 1 && setPurchaseItems(prev => prev.filter((_, idx) => idx !== i))

  const calcSalesTotal = () => items.reduce((sum, item) => sum + ((item.salesPrice || 0) * (item.quantity || 1)), 0)
  const calcPurchaseTotal = () => purchaseItems.reduce((sum, item) => sum + ((item.purchasePrice || 0) * (item.quantity || 1)), 0)

  const handleSubmit = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/ma-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, items, purchaseItems }),
      })

      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, data })
      } else {
        setResult({ success: false, error: data.error || '생성 실패' })
      }
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : '알 수 없는 오류' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {result.success ? (
            <div>
              <p className="font-medium text-green-800">MA 품의서가 생성되었습니다!</p>
              <p className="text-sm text-green-700 mt-1">문서번호: {result.data?.docNumber}</p>
            </div>
          ) : (
            <p className="font-medium text-red-800">오류: {result.error}</p>
          )}
        </div>
      )}

      {/* 품의 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">품의 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">품의 일자</label>
            <input type="text" value={formData.approvalDate} onChange={(e) => handleInputChange('approvalDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
            <input type="text" value={formData.managerName} onChange={(e) => handleInputChange('managerName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* 매출 품목 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">매출 품목</h3>
          <button onClick={addItem} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700">+ 추가</button>
        </div>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 relative">
              <button onClick={() => removeItem(i)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">X</button>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SM Code</label>
                  <input type="text" value={item.smCode || ''} onChange={(e) => handleItemChange(i, 'smCode', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Code</label>
                  <input type="text" value={item.vendorCode || ''} onChange={(e) => handleItemChange(i, 'vendorCode', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">고객명</label>
                  <input type="text" value={item.customerName || ''} onChange={(e) => handleItemChange(i, 'customerName', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">고객사</label>
                  <input type="text" value={item.clientCompany || ''} onChange={(e) => handleItemChange(i, 'clientCompany', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">매출가</label>
                  <input type="number" value={item.salesPrice || ''} onChange={(e) => handleItemChange(i, 'salesPrice', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border rounded text-sm text-right" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">수량</label>
                  <input type="number" value={item.quantity || 1} onChange={(e) => handleItemChange(i, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-2 py-1.5 border rounded text-sm text-right" min="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">청구방식</label>
                  <input type="text" value={item.billingType || ''} onChange={(e) => handleItemChange(i, 'billingType', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="일시불" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">시작일</label>
                  <input type="text" value={item.startDate || ''} onChange={(e) => handleItemChange(i, 'startDate', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="2026-01-01" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right text-sm"><span className="text-gray-600">매출 합계: </span><span className="font-bold">{calcSalesTotal().toLocaleString()}원</span></div>
      </div>

      {/* 매입 품목 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">매입 품목</h3>
          <button onClick={addPurchaseItem} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700">+ 추가</button>
        </div>
        <div className="space-y-4">
          {purchaseItems.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 relative">
              <button onClick={() => removePurchaseItem(i)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">X</button>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">매입처</label>
                  <input type="text" value={item.vendorCompany || ''} onChange={(e) => handlePurchaseItemChange(i, 'vendorCompany', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">매입가</label>
                  <input type="number" value={item.purchasePrice || ''} onChange={(e) => handlePurchaseItemChange(i, 'purchasePrice', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border rounded text-sm text-right" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">수량</label>
                  <input type="number" value={item.quantity || 1} onChange={(e) => handlePurchaseItemChange(i, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-2 py-1.5 border rounded text-sm text-right" min="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">청구방식</label>
                  <input type="text" value={item.billingType || ''} onChange={(e) => handlePurchaseItemChange(i, 'billingType', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="일시불" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right text-sm"><span className="text-gray-600">매입 합계: </span><span className="font-bold">{calcPurchaseTotal().toLocaleString()}원</span></div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={loading} className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
          {loading ? '저장 중...' : 'MA 품의서 생성'}
        </button>
      </div>
    </div>
  )
}

function MAApprovalListTab() {
  const [approvals, setApprovals] = useState<MAApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApproval, setSelectedApproval] = useState<MAApproval | null>(null)

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ma-approvals?limit=20')
      const data = await res.json()
      setApprovals(data.items || [])
    } catch (err) {
      console.error('목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchApprovals() }, [])

  const handleViewDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/ma-approvals/${id}`)
      const data = await res.json()
      setSelectedApproval(data)
    } catch (err) {
      console.error('상세 조회 실패:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/ma-approvals/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchApprovals()
        if (selectedApproval?.id === id) setSelectedApproval(null)
      }
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">MA 품의서 목록</h3>
          <button onClick={fetchApprovals} className="text-sm text-teal-600 hover:text-teal-700">새로고침</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : approvals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">MA 품의서가 없습니다</div>
        ) : (
          <div className="divide-y">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedApproval?.id === approval.id ? 'bg-teal-50' : ''}`}
                onClick={() => handleViewDetail(approval.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-teal-600">{approval.docNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[approval.status]?.color || 'bg-gray-100'}`}>
                    {statusLabels[approval.status]?.label || approval.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600">{approval.managerName || '-'}</div>
                <div className="text-xs text-gray-500 mt-1">{new Date(approval.createdAt).toLocaleDateString('ko-KR')}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">상세 정보</h3>
        </div>

        {selectedApproval ? (
          <div className="p-4 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">문서번호</span><span className="font-medium">{selectedApproval.docNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">담당자</span><span>{selectedApproval.managerName || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">금액</span><span className="font-medium text-teal-600">{selectedApproval.totalAmount?.toLocaleString() || 0}원</span></div>
            </div>

            <div className="pt-4 flex gap-2">
              <button onClick={() => handleDelete(selectedApproval.id)} className="px-4 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200">삭제</button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">목록에서 MA 품의서를 선택하세요</div>
        )}
      </div>
    </div>
  )
}
