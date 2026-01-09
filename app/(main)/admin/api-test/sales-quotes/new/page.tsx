'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface QuoteItem {
  partNumber: string
  description: string
  quantity: number
  srpPrice: number
  unitPrice: number
  totalPrice: number
}

export default function NewSalesQuotePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    projectName: '',
    managerName: '',
    clientCompany: '',
    clientContact: '',
    clientPhone: '',
    clientFax: '',
    clientMobile: '',
    clientEmail: '',
    quoteDate: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
    validUntil: '견적일로부터 15일',
    deliveryDate: '',
    paymentTerms: '',
    notes: '',
  })

  const [items, setItems] = useState<QuoteItem[]>([
    { partNumber: '', description: '', quantity: 1, srpPrice: 0, unitPrice: 0, totalPrice: 0 },
  ])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
    setItems((prev) => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : newItems[index].quantity
        const price = field === 'unitPrice' ? Number(value) : newItems[index].unitPrice
        newItems[index].totalPrice = qty * price
      }
      return newItems
    })
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { partNumber: '', description: '', quantity: 1, srpPrice: 0, unitPrice: 0, totalPrice: 0 },
    ])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const calculateTotals = () => {
    const total = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    const vat = Math.round(total * 0.1)
    return { total, vat, totalWithVat: total + vat }
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/sales-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: items.map((item) => ({
            partNumber: item.partNumber || undefined,
            description: item.description || undefined,
            quantity: item.quantity,
            srpPrice: item.srpPrice || undefined,
            unitPrice: item.unitPrice || undefined,
          })),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/admin/api-test/sales-quotes/${data.id}`)
      } else {
        alert(data.error || '생성 실패')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/api-test/sales-quotes"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">새 견적서</h1>
            <p className="text-sm text-gray-500 mt-1">견적서 정보를 입력하세요</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              저장 중...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              저장
            </>
          )}
        </button>
      </div>

      {/* 상단 정보: 수신(좌) + 견적정보(우) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 좌측: 수신 (고객 정보) */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">수신</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">회사명</label>
              <input
                type="text"
                value={formData.clientCompany}
                onChange={(e) => handleInputChange('clientCompany', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="고객사명"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
                <input
                  type="text"
                  value={formData.clientContact}
                  onChange={(e) => handleInputChange('clientContact', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="담당자명"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">전화</label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="02-1234-5678"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">팩스</label>
                <input
                  type="tel"
                  value={formData.clientFax}
                  onChange={(e) => handleInputChange('clientFax', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="02-1234-5679"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">휴대폰</label>
                <input
                  type="tel"
                  value={formData.clientMobile}
                  onChange={(e) => handleInputChange('clientMobile', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="010-1234-5678"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@company.com"
              />
            </div>
          </div>

          {/* 우측: 견적 정보 */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">견적 정보</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">견적일</label>
                <input
                  type="text"
                  value={formData.quoteDate}
                  onChange={(e) => handleInputChange('quoteDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="2026.01.09"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">유효기간</label>
                <input
                  type="text"
                  value={formData.validUntil}
                  onChange={(e) => handleInputChange('validUntil', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="견적일로부터 15일"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">납기일</label>
                <input
                  type="text"
                  value={formData.deliveryDate}
                  onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="발주 후 2주"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">결제조건</label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="납품 후 30일"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">견적 담당</label>
                <input
                  type="text"
                  value={formData.managerName}
                  onChange={(e) => handleInputChange('managerName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="담당자명"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트명</label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="프로젝트명 (선택)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 품목 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">품목 목록</h3>
          <button
            onClick={addItem}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            품목 추가
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-y">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-gray-700 w-32">P/N</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-700">Description</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-700 w-20">수량</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-700 w-28">SRP</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-700 w-28">단가</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-700 w-32">합계</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.partNumber}
                      onChange={(e) => handleItemChange(index, 'partNumber', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="품번"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="품목명"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={item.srpPrice || ''}
                      onChange={(e) => handleItemChange(index, 'srpPrice', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={item.unitPrice || ''}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                    {item.totalPrice.toLocaleString()}원
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => removeItem(index)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      disabled={items.length === 1}
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

        <div className="mt-4 pt-4 border-t flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">공급가액</span>
              <span className="font-medium">{totals.total.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">부가세 (10%)</span>
              <span>{totals.vat.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between pt-2 border-t text-base">
              <span className="font-semibold">총 금액</span>
              <span className="font-bold text-blue-600">{totals.totalWithVat.toLocaleString()}원</span>
            </div>
          </div>
        </div>
      </div>

      {/* 비고 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">비고</label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="추가 내용을 입력하세요"
        />
      </div>

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-3">
        <Link
          href="/admin/api-test/sales-quotes"
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
        >
          취소
        </Link>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '견적서 저장'}
        </button>
      </div>
    </div>
  )
}
