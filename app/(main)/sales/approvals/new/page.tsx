'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import QuoteSelectModal from '@/components/modals/QuoteSelectModal'

// 통합 품목 (매출 + 매입 정보를 하나의 행에서 처리)
interface ApprovalItem {
  partNumber: string
  description: string
  quantity: number
  // 매출 정보
  salesUnitPrice: number
  // 매입 정보
  purchaseDate: string // 매입일 or 계산서 발행일
  vendor: string // 매입처
  purchaseQuantity: number // 매입 수량
  purchaseUnitPrice: number // 매입단가
}

interface SalesQuote {
  id: string
  projectName?: string
  clientCompany?: string
  clientContact?: string
  clientPhone?: string
  managerName?: string
  paymentTerms?: string
  dealId?: string
  // 통합 견적 정보
  isConsolidated?: boolean
  consolidatedName?: string
  consolidatedPrice?: number
  totalAmount?: number
  items: {
    partNumber?: string
    description?: string
    quantity: number
    unitPrice?: number
  }[]
}

function NewSalesApprovalForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const quoteId = searchParams.get('quoteId')

  const [loading, setLoading] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState(!!quoteId)
  const [linkedQuote, setLinkedQuote] = useState<SalesQuote | null>(null)
  const [uploading, setUploading] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 품의 기본 정보
  const [formData, setFormData] = useState({
    approvalCode: '',
    approvalDate: new Date().toISOString().split('T')[0],
    managerName: '',
    clientCompany: '',
    clientContact: '',
    clientPhone: '',
    endUser: '',
    paymentTerms: '',
    deliveryAddress: '',
    deliveryDate: '',
    invoiceEmail: '',
    receiverName: '',
    receiverPhone: '',
    notes: '',
  })

  // 통합 품목 (매출 + 매입을 한 행에서 처리)
  const [items, setItems] = useState<ApprovalItem[]>([
    { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseDate: '', vendor: '', purchaseQuantity: 1, purchaseUnitPrice: 0 },
  ])

  // 통합 견적 여부 (매출 금액을 통합으로 표시)
  const [isConsolidatedQuote, setIsConsolidatedQuote] = useState(false)
  const [consolidatedSalesPrice, setConsolidatedSalesPrice] = useState(0)

  // 견적서에서 데이터 로드
  useEffect(() => {
    if (quoteId) {
      setLoadingQuote(true)
      fetch(`/api/sales-quotes/${quoteId}`)
        .then((res) => res.json())
        .then((quote: SalesQuote) => {
          loadQuoteData(quote)
        })
        .catch((err) => console.error('견적서 로드 실패:', err))
        .finally(() => setLoadingQuote(false))
    }
  }, [quoteId])

  // 견적서 데이터 로드 함수 (URL 파라미터 & 모달 선택 공통)
  const loadQuoteData = (quote: SalesQuote) => {
    setLinkedQuote(quote)
    setFormData((prev) => ({
      ...prev,
      clientCompany: quote.clientCompany || '',
      clientContact: quote.clientContact || '',
      clientPhone: quote.clientPhone || '',
      managerName: quote.managerName || '',
      paymentTerms: quote.paymentTerms || '',
    }))

    // 통합 견적 여부 확인
    if (quote.isConsolidated) {
      setIsConsolidatedQuote(true)
      setConsolidatedSalesPrice(quote.consolidatedPrice || quote.totalAmount || 0)
      // 개별 품목들을 통합 아이템으로 변환 (매출 단가는 0으로, 통합 금액 사용)
      setItems(
        quote.items.map((item) => ({
          partNumber: item.partNumber || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          salesUnitPrice: 0, // 통합 견적이므로 개별 단가 없음
          purchaseDate: '',
          vendor: '',
          purchaseQuantity: item.quantity || 1,
          purchaseUnitPrice: 0,
        }))
      )
    } else {
      setIsConsolidatedQuote(false)
      setConsolidatedSalesPrice(0)
      // 개별 품목들을 통합 아이템으로 변환
      setItems(
        quote.items.map((item) => ({
          partNumber: item.partNumber || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          salesUnitPrice: Number(item.unitPrice) || 0,
          purchaseDate: '',
          vendor: '',
          purchaseQuantity: item.quantity || 1,
          purchaseUnitPrice: 0,
        }))
      )
    }
  }

  // 견적서 선택 모달에서 선택 시
  const handleQuoteSelect = (quote: SalesQuote) => {
    loadQuoteData(quote)
  }

  // 데이터 로드 후 textarea 높이 자동 조절
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea')
      textareas.forEach((textarea) => {
        textarea.style.height = 'auto'
        textarea.style.height = textarea.scrollHeight + 'px'
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [items])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // ===== 품목 관리 =====
  const handleItemChange = (index: number, field: keyof ApprovalItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addItem = () => {
    setItems((prev) => [...prev, { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseDate: '', vendor: '', purchaseQuantity: 1, purchaseUnitPrice: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  // 금액 계산
  const calcSalesItemTotal = (item: ApprovalItem) => item.quantity * item.salesUnitPrice
  const calcPurchaseItemTotal = (item: ApprovalItem) => item.purchaseQuantity * item.purchaseUnitPrice
  const calcSalesTotal = () => isConsolidatedQuote ? consolidatedSalesPrice : items.reduce((sum, item) => sum + calcSalesItemTotal(item), 0)
  const calcPurchaseTotal = () => items.reduce((sum, item) => sum + calcPurchaseItemTotal(item), 0)
  const calcTotalMargin = () => calcSalesTotal() - calcPurchaseTotal()

  // 엑셀 업로드 처리
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/sales-approvals/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const approval = await res.json()
        router.push(`/sales/approvals/${approval.id}`)
      } else {
        const data = await res.json()
        alert(data.error || '엑셀 업로드에 실패했습니다')
      }
    } catch {
      alert('엑셀 업로드에 실패했습니다')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 품목 변환 (매출 + 매입 통합)
      const convertedItems = items
        .filter((item) => item.description || item.partNumber || item.salesUnitPrice > 0 || item.purchaseUnitPrice > 0)
        .map((item) => ({
          partNumber: item.partNumber,
          productName: item.description || '제품',
          quantity: item.quantity,
          salesUnitPrice: item.salesUnitPrice,
          purchaseDate: item.purchaseDate || undefined,
          vendorCompany: item.vendor || undefined,
          purchaseQuantity: item.purchaseQuantity,
          purchaseUnitPrice: item.purchaseUnitPrice,
        }))

      const res = await fetch('/api/sales-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quoteId: quoteId || linkedQuote?.id || undefined,
          dealId: linkedQuote?.dealId,
          isConsolidated: isConsolidatedQuote,
          consolidatedSalesPrice: isConsolidatedQuote ? consolidatedSalesPrice : undefined,
          items: convertedItems,
        }),
      })

      if (res.ok) {
        const approval = await res.json()
        router.push(`/sales/approvals/${approval.id}`)
      } else {
        const data = await res.json()
        alert(data.error || '품의서 생성에 실패했습니다')
      }
    } catch {
      alert('품의서 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (loadingQuote) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">견적서 정보 로드 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/sales/approvals"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">새 품의서</h1>
            {linkedQuote && (
              <p className="text-sm text-blue-600 mt-1">
                견적서 연동: {linkedQuote.projectName || linkedQuote.clientCompany}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setQuoteModalOpen(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            견적서 불러오기
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
            id="excel-upload"
          />
          <label
            htmlFor="excel-upload"
            className={`px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploading ? '업로드 중...' : '엑셀 업로드'}
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 품의 기본 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">품의 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">품의코드</label>
              <input
                type="text"
                value={formData.approvalCode}
                onChange={(e) => handleInputChange('approvalCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="D251202-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">품의일자</label>
              <input
                type="date"
                value={formData.approvalDate}
                onChange={(e) => handleInputChange('approvalDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">품의담당</label>
              <input
                type="text"
                value={formData.managerName}
                onChange={(e) => handleInputChange('managerName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="담당자명"
              />
            </div>
          </div>
        </div>

        {/* 매출처 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">매출처 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">고객사</label>
              <input
                type="text"
                value={formData.clientCompany}
                onChange={(e) => handleInputChange('clientCompany', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="고객사명"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
              <input
                type="text"
                value={formData.clientContact}
                onChange={(e) => handleInputChange('clientContact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="담당자명"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
              <input
                type="text"
                value={formData.clientPhone}
                onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End User</label>
              <input
                type="text"
                value={formData.endUser}
                onChange={(e) => handleInputChange('endUser', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="최종 사용자"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">결제조건</label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="납품 후 익월 말"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">세금계산서 메일</label>
              <input
                type="email"
                value={formData.invoiceEmail}
                onChange={(e) => handleInputChange('invoiceEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="invoice@company.com"
              />
            </div>
          </div>
        </div>

        {/* 배송 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">배송 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">배송주소</label>
              <input
                type="text"
                value={formData.deliveryAddress}
                onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="배송 주소"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">납기일</label>
              <input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">수령자</label>
              <input
                type="text"
                value={formData.receiverName}
                onChange={(e) => handleInputChange('receiverName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="수령자명"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">수령자 연락처</label>
              <input
                type="text"
                value={formData.receiverPhone}
                onChange={(e) => handleInputChange('receiverPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="010-0000-0000"
              />
            </div>
          </div>
        </div>

        {/* 품목 테이블 (매출 + 매입 통합) */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">품목 목록</h3>
              {isConsolidatedQuote && (
                <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">통합 견적</span>
              )}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              + 품목 추가
            </button>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {/* 매출 영역 헤더 */}
                  <th colSpan={5} className="px-3 py-2 text-center text-blue-700 bg-blue-50 border-r-2 border-gray-300">
                    매출
                  </th>
                  {/* 매입 영역 헤더 */}
                  <th colSpan={5} className="px-3 py-2 text-center text-purple-700 bg-purple-50">
                    매입
                  </th>
                  <th className="w-10"></th>
                </tr>
                <tr className="border-b bg-gray-50">
                  {/* 매출 컬럼 */}
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-28">P/N</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 min-w-[100px]">품목</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16">수량</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-28">단가</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-blue-600 w-28 border-r-2 border-gray-300">합계</th>
                  {/* 매입 컬럼 */}
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-28">매입일/계산서</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-32">매입처</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16">수량</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-28">단가</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-purple-600 w-28">합계</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {/* 매출 영역 */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.partNumber}
                        onChange={(e) => handleItemChange(index, 'partNumber', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
                        placeholder="P/N"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <textarea
                        value={item.description}
                        onChange={(e) => {
                          handleItemChange(index, 'description', e.target.value)
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                        rows={1}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs resize-none overflow-hidden"
                        style={{ minHeight: '32px' }}
                        placeholder="품목명"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-center"
                        min="1"
                      />
                    </td>
                    <td className="px-2 py-2">
                      {isConsolidatedQuote ? (
                        <span className="text-xs text-gray-400">-</span>
                      ) : (
                        <input
                          type="number"
                          value={item.salesUnitPrice}
                          onChange={(e) => handleItemChange(index, 'salesUnitPrice', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-right"
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-blue-700 border-r-2 border-gray-300">
                      {isConsolidatedQuote ? (
                        index === 0 ? (
                          <input
                            type="number"
                            value={consolidatedSalesPrice}
                            onChange={(e) => setConsolidatedSalesPrice(parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs text-right bg-blue-50"
                            placeholder="통합금액"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )
                      ) : (
                        <span className="text-xs">{calcSalesItemTotal(item).toLocaleString()}</span>
                      )}
                    </td>
                    {/* 매입 영역 */}
                    <td className="px-2 py-2 bg-purple-50/30">
                      <input
                        type="text"
                        value={item.purchaseDate}
                        onChange={(e) => handleItemChange(index, 'purchaseDate', e.target.value)}
                        className="w-full px-2 py-1.5 border border-purple-200 rounded text-xs text-center"
                        placeholder="2025.01.16"
                      />
                    </td>
                    <td className="px-2 py-2 bg-purple-50/30">
                      <input
                        type="text"
                        value={item.vendor}
                        onChange={(e) => handleItemChange(index, 'vendor', e.target.value)}
                        className="w-full px-2 py-1.5 border border-purple-200 rounded text-xs"
                        placeholder="매입처"
                      />
                    </td>
                    <td className="px-2 py-2 bg-purple-50/30">
                      <input
                        type="number"
                        value={item.purchaseQuantity}
                        onChange={(e) => handleItemChange(index, 'purchaseQuantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-purple-200 rounded text-xs text-center"
                        min="1"
                      />
                    </td>
                    <td className="px-2 py-2 bg-purple-50/30">
                      <input
                        type="number"
                        value={item.purchaseUnitPrice}
                        onChange={(e) => handleItemChange(index, 'purchaseUnitPrice', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border border-purple-200 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-purple-700 bg-purple-50/30">
                      <span className="text-xs">{calcPurchaseItemTotal(item).toLocaleString()}</span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="품목 삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* 합계 행 */}
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-medium">
                  <td colSpan={4} className="px-3 py-3 text-right text-sm text-gray-600">
                    매출금액 합계(VAT별도)
                  </td>
                  <td className="px-3 py-3 text-right text-blue-700 border-r-2 border-gray-300">
                    <span className="text-base font-bold">{calcSalesTotal().toLocaleString()}</span>
                  </td>
                  <td colSpan={4} className="px-3 py-3 text-right text-sm text-gray-600 bg-purple-50/30">
                    매입금액 합계(VAT별도)
                  </td>
                  <td className="px-3 py-3 text-right text-purple-700 bg-purple-50/30">
                    <span className="text-base font-bold">{calcPurchaseTotal().toLocaleString()}</span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 비고 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">비고</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="특이사항 입력..."
          />
        </div>

        {/* 마진 요약 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">마진 요약</h3>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-blue-600">매출 (VAT별도)</p>
              <p className="text-xl font-bold text-blue-900">{calcSalesTotal().toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-sm text-purple-600">매입 (VAT별도)</p>
              <p className="text-xl font-bold text-purple-900">{calcPurchaseTotal().toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">마진</p>
              <p className={`text-xl font-bold ${calcTotalMargin() >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {calcTotalMargin().toLocaleString()}원
              </p>
              <p className="text-xs text-gray-500">
                ({calcSalesTotal() > 0 ? ((calcTotalMargin() / calcSalesTotal()) * 100).toFixed(1) : 0}%)
              </p>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3">
          <Link
            href="/sales/approvals"
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '품의서 생성'}
          </button>
        </div>
      </form>

      {/* 견적서 선택 모달 */}
      <QuoteSelectModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        onSelect={handleQuoteSelect}
      />
    </div>
  )
}

export default function NewSalesApprovalPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    }>
      <NewSalesApprovalForm />
    </Suspense>
  )
}
