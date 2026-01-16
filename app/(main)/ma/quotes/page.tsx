'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface MAQuoteItem {
  productName?: string
  modelType?: string
  model?: string
  serialNumber?: string
  serviceLevel?: string
  period?: string
  startDate?: string
  endDate?: string
  totalPrice?: number
}

interface MAQuote {
  id: string
  docNumber: string
  status: string
  quoteDate?: string
  managerName?: string
  clientCompany?: string
  clientContact?: string
  validUntil?: string
  paymentTerms?: string
  serviceTerms?: string
  totalAmount?: number
  items: MAQuoteItem[]
  createdAt: string
}

type TabType = 'create' | 'list'

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  SUBMITTED: { label: '제출', color: 'bg-blue-100 text-blue-700' },
  SENT: { label: '발송', color: 'bg-green-100 text-green-700' },
  ACCEPTED: { label: '수주', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '실주', color: 'bg-red-100 text-red-700' },
}

export default function MAQuotesTestPage() {
  const [activeTab, setActiveTab] = useState<TabType>('create')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/api-test" className="text-gray-500 hover:text-gray-700">← 목록</Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MA 견적서 테스트</h1>
          <p className="text-sm text-gray-500">MA Quote - 유지보수 견적서 생성</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { key: 'create', label: 'MA 견적서 생성' },
            { key: 'list', label: '목록 조회' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'create' && <CreateMAQuoteTab />}
      {activeTab === 'list' && <MAQuoteListTab />}
    </div>
  )
}

function CreateMAQuoteTab() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; data?: MAQuote; error?: string } | null>(null)

  const getToday = () => {
    const d = new Date()
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const [formData, setFormData] = useState({
    quoteDate: getToday(),
    managerName: '',
    clientCompany: '',
    clientContact: '',
    clientPhone: '',
    clientEmail: '',
    validUntil: '견적일로부터 30일',
    paymentTerms: '계약 후 선불',
    serviceTerms: '24x7 기술지원',
  })

  const [items, setItems] = useState<MAQuoteItem[]>([
    { productName: '', modelType: '', model: '', serialNumber: '', serviceLevel: '', period: '1년', startDate: '', endDate: '', totalPrice: 0 },
  ])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index: number, field: keyof MAQuoteItem, value: string | number) => {
    setItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }

  const addItem = () => setItems(prev => [...prev, { productName: '', modelType: '', model: '', serialNumber: '', serviceLevel: '', period: '1년', startDate: '', endDate: '', totalPrice: 0 }])
  const removeItem = (i: number) => items.length > 1 && setItems(prev => prev.filter((_, idx) => idx !== i))

  const calculateTotal = () => items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

  const handleSubmit = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/ma-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, items }),
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
              <p className="font-medium text-green-800">MA 견적서가 생성되었습니다!</p>
              <p className="text-sm text-green-700 mt-1">문서번호: {result.data?.docNumber}</p>
            </div>
          ) : (
            <p className="font-medium text-red-800">오류: {result.error}</p>
          )}
        </div>
      )}

      {/* 고객 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">고객 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">고객사</label>
            <input type="text" value={formData.clientCompany} onChange={(e) => handleInputChange('clientCompany', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
            <input type="text" value={formData.clientContact} onChange={(e) => handleInputChange('clientContact', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input type="tel" value={formData.clientPhone} onChange={(e) => handleInputChange('clientPhone', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* 견적 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">견적 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">견적일</label>
            <input type="text" value={formData.quoteDate} onChange={(e) => handleInputChange('quoteDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유효기간</label>
            <input type="text" value={formData.validUntil} onChange={(e) => handleInputChange('validUntil', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">결제조건</label>
            <input type="text" value={formData.paymentTerms} onChange={(e) => handleInputChange('paymentTerms', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">서비스 조건</label>
            <input type="text" value={formData.serviceTerms} onChange={(e) => handleInputChange('serviceTerms', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
            <input type="text" value={formData.managerName} onChange={(e) => handleInputChange('managerName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* 서비스 품목 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">서비스 품목</h3>
          <button onClick={addItem} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">+ 추가</button>
        </div>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 relative">
              <button onClick={() => removeItem(i)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">X</button>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">제품명</label>
                  <input type="text" value={item.productName || ''} onChange={(e) => handleItemChange(i, 'productName', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model Type</label>
                  <input type="text" value={item.modelType || ''} onChange={(e) => handleItemChange(i, 'modelType', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                  <input type="text" value={item.model || ''} onChange={(e) => handleItemChange(i, 'model', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Serial Number</label>
                  <input type="text" value={item.serialNumber || ''} onChange={(e) => handleItemChange(i, 'serialNumber', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Service Level</label>
                  <input type="text" value={item.serviceLevel || ''} onChange={(e) => handleItemChange(i, 'serviceLevel', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">기간</label>
                  <input type="text" value={item.period || ''} onChange={(e) => handleItemChange(i, 'period', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="1년" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">시작일</label>
                  <input type="text" value={item.startDate || ''} onChange={(e) => handleItemChange(i, 'startDate', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="2026-01-01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">종료일</label>
                  <input type="text" value={item.endDate || ''} onChange={(e) => handleItemChange(i, 'endDate', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" placeholder="2026-12-31" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">금액</label>
                  <input type="number" value={item.totalPrice || ''} onChange={(e) => handleItemChange(i, 'totalPrice', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border rounded text-sm text-right" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right text-sm"><span className="text-gray-600">합계: </span><span className="font-bold text-green-600">{calculateTotal().toLocaleString()}원</span></div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={loading} className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
          {loading ? '저장 중...' : 'MA 견적서 생성'}
        </button>
      </div>
    </div>
  )
}

function MAQuoteListTab() {
  const [quotes, setQuotes] = useState<MAQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<MAQuote | null>(null)

  const fetchQuotes = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ma-quotes?limit=20')
      const data = await res.json()
      setQuotes(data.items || [])
    } catch (err) {
      console.error('목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchQuotes() }, [])

  const handleViewDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/ma-quotes/${id}`)
      const data = await res.json()
      setSelectedQuote(data)
    } catch (err) {
      console.error('상세 조회 실패:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/ma-quotes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchQuotes()
        if (selectedQuote?.id === id) setSelectedQuote(null)
      }
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">MA 견적서 목록</h3>
          <button onClick={fetchQuotes} className="text-sm text-green-600 hover:text-green-700">새로고침</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : quotes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">MA 견적서가 없습니다</div>
        ) : (
          <div className="divide-y">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedQuote?.id === quote.id ? 'bg-green-50' : ''}`}
                onClick={() => handleViewDetail(quote.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-600">{quote.docNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[quote.status]?.color || 'bg-gray-100'}`}>
                    {statusLabels[quote.status]?.label || quote.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600">{quote.clientCompany || '-'}</div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{new Date(quote.createdAt).toLocaleDateString('ko-KR')}</span>
                  <span className="font-medium">{quote.totalAmount?.toLocaleString() || 0}원</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">상세 정보</h3>
        </div>

        {selectedQuote ? (
          <div className="p-4 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">문서번호</span><span className="font-medium">{selectedQuote.docNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">고객사</span><span>{selectedQuote.clientCompany || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">담당자</span><span>{selectedQuote.clientContact || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">금액</span><span className="font-medium text-green-600">{selectedQuote.totalAmount?.toLocaleString() || 0}원</span></div>
            </div>

            <div className="pt-4 flex gap-2">
              <button onClick={() => handleDelete(selectedQuote.id)} className="px-4 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200">삭제</button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">목록에서 MA 견적서를 선택하세요</div>
        )}
      </div>
    </div>
  )
}
