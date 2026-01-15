'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

// 하위 품목 (P/N + 설명)
interface ItemDetail {
  partNumber: string
  description: string
  quantity: number
}

// 매출 품목 (매입 정보 포함)
interface SalesItem {
  type: 'single' | 'bundle' // 단일 품목 vs 묶음 품목
  partNumber: string // 단일 품목용 P/N
  productName: string
  quantity: number
  unitPrice: number
  details: ItemDetail[] // 묶음 품목용 하위 품목들
  // 매입 정보 (매출 품목과 1:1 연결)
  purchaseVendor: string // 매입처
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

  // 품목 (매출 + 매입 통합)
  const [items, setItems] = useState<SalesItem[]>([
    { type: 'single', partNumber: '', productName: '', quantity: 1, unitPrice: 0, details: [], purchaseVendor: '', purchaseUnitPrice: 0 },
  ])

  // 견적서에서 데이터 로드
  useEffect(() => {
    if (quoteId) {
      setLoadingQuote(true)
      fetch(`/api/sales-quotes/${quoteId}`)
        .then((res) => res.json())
        .then((quote: SalesQuote) => {
          setLinkedQuote(quote)
          setFormData((prev) => ({
            ...prev,
            clientCompany: quote.clientCompany || '',
            clientContact: quote.clientContact || '',
            clientPhone: quote.clientPhone || '',
            managerName: quote.managerName || '',
            paymentTerms: quote.paymentTerms || '',
          }))
          if (quote.items && quote.items.length > 0) {
            setItems(
              quote.items.map((item) => ({
                type: 'single' as const,
                partNumber: item.partNumber || '',
                productName: item.description || '',
                quantity: item.quantity || 1,
                unitPrice: Number(item.unitPrice) || 0,
                details: [],
                purchaseVendor: '',
                purchaseUnitPrice: 0,
              }))
            )
          }
        })
        .catch((err) => console.error('견적서 로드 실패:', err))
        .finally(() => setLoadingQuote(false))
    }
  }, [quoteId])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // ===== 품목 관리 (매출 + 매입 통합) =====
  const handleItemChange = (index: number, field: keyof Omit<SalesItem, 'details'>, value: string | number) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addSingleItem = () => {
    setItems((prev) => [...prev, { type: 'single', partNumber: '', productName: '', quantity: 1, unitPrice: 0, details: [], purchaseVendor: '', purchaseUnitPrice: 0 }])
  }

  const addBundleItem = () => {
    setItems((prev) => [...prev, { type: 'bundle', partNumber: '', productName: '', quantity: 1, unitPrice: 0, details: [], purchaseVendor: '', purchaseUnitPrice: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  // 하위 품목 관리
  const addItemDetail = (itemIndex: number) => {
    setItems((prev) => {
      const next = [...prev]
      next[itemIndex] = {
        ...next[itemIndex],
        details: [...next[itemIndex].details, { partNumber: '', description: '', quantity: 1 }],
      }
      return next
    })
  }

  const handleItemDetailChange = (
    itemIndex: number,
    detailIndex: number,
    field: keyof ItemDetail,
    value: string | number
  ) => {
    setItems((prev) => {
      const next = [...prev]
      const details = [...next[itemIndex].details]
      details[detailIndex] = { ...details[detailIndex], [field]: value }
      next[itemIndex] = { ...next[itemIndex], details }
      return next
    })
  }

  const removeItemDetail = (itemIndex: number, detailIndex: number) => {
    setItems((prev) => {
      const next = [...prev]
      next[itemIndex] = {
        ...next[itemIndex],
        details: next[itemIndex].details.filter((_, i) => i !== detailIndex),
      }
      return next
    })
  }

  // 금액 계산
  const calcItemTotal = (item: SalesItem) => item.quantity * item.unitPrice
  const calcPurchaseItemTotal = (item: SalesItem) => item.quantity * item.purchaseUnitPrice
  const calcSalesTotal = () => items.reduce((sum, item) => sum + calcItemTotal(item), 0)
  const calcPurchaseTotal = () => items.reduce((sum, item) => sum + calcPurchaseItemTotal(item), 0)
  const calcMargin = (item: SalesItem) => calcItemTotal(item) - calcPurchaseItemTotal(item)

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
        router.push(`/admin/api-test/sales-approvals/${approval.id}`)
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
      // 매출 품목 변환 (productName + details)
      const convertedItems = items
        .filter((item) => item.productName || item.partNumber || item.unitPrice > 0)
        .map((item) => {
          if (item.type === 'single') {
            return {
              productName: item.productName || '제품',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              details: item.partNumber
                ? [{ partNumber: item.partNumber, description: item.productName, quantity: item.quantity, sortOrder: 0 }]
                : [],
            }
          } else {
            return {
              productName: item.productName || '제품',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              details: item.details
                .filter((d) => d.partNumber || d.description)
                .map((d, idx) => ({
                  partNumber: d.partNumber,
                  description: d.description,
                  quantity: d.quantity,
                  sortOrder: idx,
                })),
            }
          }
        })

      // 매입 품목 변환 (매출 품목에서 매입 정보 추출)
      const convertedPurchaseItems = items
        .filter((item) => item.purchaseVendor || item.purchaseUnitPrice > 0)
        .map((item) => {
          if (item.type === 'single') {
            return {
              productName: item.productName || '제품',
              quantity: item.quantity,
              unitPrice: item.purchaseUnitPrice,
              vendorCompany: item.purchaseVendor,
              details: item.partNumber
                ? [{ partNumber: item.partNumber, description: item.productName, quantity: item.quantity, sortOrder: 0 }]
                : [],
            }
          } else {
            return {
              productName: item.productName || '제품',
              quantity: item.quantity,
              unitPrice: item.purchaseUnitPrice,
              vendorCompany: item.purchaseVendor,
              details: item.details
                .filter((d) => d.partNumber || d.description)
                .map((d, idx) => ({
                  partNumber: d.partNumber,
                  description: d.description,
                  quantity: d.quantity,
                  sortOrder: idx,
                })),
            }
          }
        })

      const res = await fetch('/api/sales-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quoteId: quoteId || undefined,
          dealId: linkedQuote?.dealId,
          items: convertedItems,
          purchaseItems: convertedPurchaseItems,
        }),
      })

      if (res.ok) {
        const approval = await res.json()
        router.push(`/admin/api-test/sales-approvals/${approval.id}`)
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
            href="/admin/api-test/sales-approvals"
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
        <div>
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

        {/* 매출 품목 (계층형) */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">매출 품목 ({items.length}개)</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addSingleItem}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                + 단일 품목
              </button>
              <button
                type="button"
                onClick={addBundleItem}
                className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
              >
                + 묶음 품목
              </button>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {items.map((item, itemIndex) => (
              <div key={itemIndex} className="border border-blue-200 rounded-lg overflow-hidden">
                {/* 단일 품목: P/N + 품목명 + 수량 + 단가 + 매입정보 */}
                {item.type === 'single' ? (
                  <>
                    {/* 매출 정보 */}
                    <div className="bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded mt-1">단일</span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">P/N</label>
                            <input
                              type="text"
                              value={item.partNumber}
                              onChange={(e) => handleItemChange(itemIndex, 'partNumber', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="파트넘버"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">품목명</label>
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleItemChange(itemIndex, 'productName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="품목명 입력"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">수량</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(itemIndex, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right"
                              min="1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">매출단가</label>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(itemIndex, 'unitPrice', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-5">
                          <span className="text-sm font-bold text-blue-700 whitespace-nowrap">
                            {calcItemTotal(item).toLocaleString()}원
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(itemIndex)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="품목 삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* 매입 정보 */}
                    <div className="bg-purple-50 px-4 py-3 border-t border-purple-200">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-purple-600 font-medium">매입</span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <input
                              type="text"
                              value={item.purchaseVendor}
                              onChange={(e) => handleItemChange(itemIndex, 'purchaseVendor', e.target.value)}
                              className="w-full px-2 py-1.5 border border-purple-200 rounded text-sm bg-white"
                              placeholder="매입처"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={item.purchaseUnitPrice}
                              onChange={(e) => handleItemChange(itemIndex, 'purchaseUnitPrice', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-purple-200 rounded text-sm text-right bg-white"
                              placeholder="매입단가"
                            />
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-purple-700">
                              매입: <span className="font-medium">{calcPurchaseItemTotal(item).toLocaleString()}원</span>
                            </span>
                            <span className={`font-bold ${calcMargin(item) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              마진: {calcMargin(item).toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* 묶음 품목: 품목명 + 수량 + 단가 + 하위 품목들 */
                  <>
                    <div className="bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded mt-1">묶음</span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">품목명</label>
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleItemChange(itemIndex, 'productName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="묶음 품목명 (예: 서버 패키지)"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">수량</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(itemIndex, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right"
                              min="1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">단가</label>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(itemIndex, 'unitPrice', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-5">
                          <span className="text-sm font-bold text-blue-700 whitespace-nowrap">
                            {calcItemTotal(item).toLocaleString()}원
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(itemIndex)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="묶음 품목 삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 하위 품목 리스트 */}
                    {item.details.length > 0 && (
                      <div className="bg-white divide-y divide-gray-100">
                        {item.details.map((detail, detailIndex) => (
                          <div key={detailIndex} className="px-4 py-3 flex items-start gap-3">
                            <span className="text-gray-400 mt-2">├</span>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">P/N (시리얼)</label>
                                <input
                                  type="text"
                                  value={detail.partNumber}
                                  onChange={(e) => handleItemDetailChange(itemIndex, detailIndex, 'partNumber', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-gray-50"
                                  placeholder="시리얼번호"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs text-gray-400 mb-1">품목 설명</label>
                                <input
                                  type="text"
                                  value={detail.description}
                                  onChange={(e) => handleItemDetailChange(itemIndex, detailIndex, 'description', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-gray-50"
                                  placeholder="하위 품목 설명"
                                />
                              </div>
                              <div className="flex items-end gap-2">
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-400 mb-1">수량</label>
                                  <input
                                    type="number"
                                    value={detail.quantity}
                                    onChange={(e) => handleItemDetailChange(itemIndex, detailIndex, 'quantity', parseInt(e.target.value) || 1)}
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right bg-gray-50"
                                    min="1"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeItemDetail(itemIndex, detailIndex)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                  title="하위 품목 삭제"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 하위 품목 추가 버튼 */}
                    <div className="px-4 py-2 bg-gray-50 border-t">
                      <button
                        type="button"
                        onClick={() => addItemDetail(itemIndex)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        하위 품목 추가
                      </button>
                    </div>

                    {/* 매입 정보 */}
                    <div className="bg-purple-50 px-4 py-3 border-t border-purple-200">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-purple-600 font-medium">매입</span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <input
                              type="text"
                              value={item.purchaseVendor}
                              onChange={(e) => handleItemChange(itemIndex, 'purchaseVendor', e.target.value)}
                              className="w-full px-2 py-1.5 border border-purple-200 rounded text-sm bg-white"
                              placeholder="매입처"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={item.purchaseUnitPrice}
                              onChange={(e) => handleItemChange(itemIndex, 'purchaseUnitPrice', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-purple-200 rounded text-sm text-right bg-white"
                              placeholder="매입단가"
                            />
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-purple-700">
                              매입: <span className="font-medium">{calcPurchaseItemTotal(item).toLocaleString()}원</span>
                            </span>
                            <span className={`font-bold ${calcMargin(item) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              마진: {calcMargin(item).toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex justify-end">
              <div className="text-sm">
                <span className="text-gray-600">매출 합계: </span>
                <span className="font-bold text-lg">{calcSalesTotal().toLocaleString()}원</span>
                <span className="text-gray-500 ml-2">(VAT포함: {Math.round(calcSalesTotal() * 1.1).toLocaleString()}원)</span>
              </div>
            </div>
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
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-4">마진 요약</h3>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-blue-600">매출 (VAT별도)</p>
              <p className="text-xl font-bold text-blue-900">{calcSalesTotal().toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">매입 (VAT별도)</p>
              <p className="text-xl font-bold text-blue-900">{calcPurchaseTotal().toLocaleString()}원</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">마진</p>
              <p className={`text-xl font-bold ${calcSalesTotal() - calcPurchaseTotal() >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {(calcSalesTotal() - calcPurchaseTotal()).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3">
          <Link
            href="/admin/api-test/sales-approvals"
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
