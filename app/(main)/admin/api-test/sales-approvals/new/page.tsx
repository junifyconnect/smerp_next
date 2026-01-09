'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface SalesItem {
  partNumber: string
  description: string
  quantity: number
  unitPrice: number
}

interface PurchaseItem {
  partNumber: string
  description: string
  quantity: number
  unitPrice: number
  vendorCompany: string
  purchaseDate: string
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

export default function NewSalesApprovalPage() {
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

  // 매출 품목
  const [items, setItems] = useState<SalesItem[]>([
    { partNumber: '', description: '', quantity: 1, unitPrice: 0 },
  ])

  // 매입 품목
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([
    { partNumber: '', description: '', quantity: 1, unitPrice: 0, vendorCompany: '', purchaseDate: '' },
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
                partNumber: item.partNumber || '',
                description: item.description || '',
                quantity: item.quantity || 1,
                unitPrice: Number(item.unitPrice) || 0,
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

  // 매출 품목 관리
  const handleItemChange = (index: number, field: keyof SalesItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addItem = () => {
    setItems((prev) => [...prev, { partNumber: '', description: '', quantity: 1, unitPrice: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  // 매입 품목 관리
  const handlePurchaseItemChange = (index: number, field: keyof PurchaseItem, value: string | number) => {
    setPurchaseItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addPurchaseItem = () => {
    setPurchaseItems((prev) => [
      ...prev,
      { partNumber: '', description: '', quantity: 1, unitPrice: 0, vendorCompany: '', purchaseDate: '' },
    ])
  }

  const removePurchaseItem = (index: number) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  // 금액 계산
  const calcItemTotal = (item: SalesItem | PurchaseItem) => item.quantity * item.unitPrice
  const calcSalesTotal = () => items.reduce((sum, item) => sum + calcItemTotal(item), 0)
  const calcPurchaseTotal = () => purchaseItems.reduce((sum, item) => sum + calcItemTotal(item), 0)

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
      const res = await fetch('/api/sales-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quoteId: quoteId || undefined,
          dealId: linkedQuote?.dealId,
          items: items.filter((item) => item.description || item.unitPrice > 0),
          purchaseItems: purchaseItems.filter((item) => item.description || item.unitPrice > 0),
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

        {/* 매출 품목 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">매출 품목</h3>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              + 품목 추가
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">P/N</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">품목</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-24">수량</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-32">단가</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-32">합계</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.partNumber}
                        onChange={(e) => handleItemChange(index, 'partNumber', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="P/N"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="품목명"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right"
                        min="1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right"
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium">
                      {calcItemTotal(item).toLocaleString()}원
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

        {/* 매입 품목 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">매입 품목</h3>
            <button
              type="button"
              onClick={addPurchaseItem}
              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
            >
              + 품목 추가
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">P/N</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">품목</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">매입처</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-24">수량</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-32">단가</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-32">합계</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchaseItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.partNumber}
                        onChange={(e) => handlePurchaseItemChange(index, 'partNumber', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="P/N"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handlePurchaseItemChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="품목명"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.vendorCompany}
                        onChange={(e) => handlePurchaseItemChange(index, 'vendorCompany', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        placeholder="매입처"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handlePurchaseItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right"
                        min="1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handlePurchaseItemChange(index, 'unitPrice', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right"
                      />
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-medium">
                      {calcItemTotal(item).toLocaleString()}원
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removePurchaseItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex justify-end">
              <div className="text-sm">
                <span className="text-gray-600">매입 합계: </span>
                <span className="font-bold text-lg">{calcPurchaseTotal().toLocaleString()}원</span>
                <span className="text-gray-500 ml-2">(VAT포함: {Math.round(calcPurchaseTotal() * 1.1).toLocaleString()}원)</span>
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
