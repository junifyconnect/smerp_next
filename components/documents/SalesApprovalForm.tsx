'use client'

import { UilEdit, UilFileAlt, UilPlus, UilTrashAlt } from '@iconscout/react-unicons'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SalesApprovalTemplate } from './SalesApprovalTemplate'

export interface SalesItem {
  partNumber?: string
  description?: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
}

export interface PurchaseItem {
  dateOrInvoice?: string
  vendor?: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
}

interface SalesApprovalFormProps {
  basePath: string
  title: string
}

export function SalesApprovalForm({ basePath, title }: SalesApprovalFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'web' | 'template'>('web')

  const getToday = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}.${m}.${day}`
  }

  const [formData, setFormData] = useState({
    invoiceIssueDate: '',
    approvalCode: '',
    approvalDate: getToday(),
    approvalOwner: '',

    salesContactLine: '',
    endUser: '',
    mtSn: '',

    // 기타/계산서/배송
    etc: '',
    invoicePlannedDate: '',
    invoiceEmail: '',
    paymentDue: '',
    shippingAddress: '',
    shippingReceiver: '',
    shippingReceiverPhone: '',
    shippingDate: '',
  })

  const [salesItems, setSalesItems] = useState<SalesItem[]>([
    { partNumber: '', description: '', quantity: 1, unitPrice: 0, totalPrice: 0 },
  ])

  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([
    { dateOrInvoice: '', vendor: '', quantity: 1, unitPrice: 0, totalPrice: 0 },
  ])

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSalesItemChange = (index: number, field: keyof SalesItem, value: string | number) => {
    setSalesItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        const q = field === 'quantity' ? Number(value) : next[index].quantity
        const u = field === 'unitPrice' ? Number(value) : next[index].unitPrice || 0
        next[index].totalPrice = q * u
      }
      return next
    })
  }

  const handlePurchaseItemChange = (index: number, field: keyof PurchaseItem, value: string | number) => {
    setPurchaseItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        const q = field === 'quantity' ? Number(value) : next[index].quantity
        const u = field === 'unitPrice' ? Number(value) : next[index].unitPrice || 0
        next[index].totalPrice = q * u
      }
      return next
    })
  }

  const addSalesItem = () => {
    setSalesItems((prev) => [...prev, { partNumber: '', description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }])
  }

  const removeSalesItem = (index: number) => {
    setSalesItems((prev) => prev.filter((_, i) => i !== index))
  }

  const addPurchaseItem = () => {
    setPurchaseItems((prev) => [...prev, { dateOrInvoice: '', vendor: '', quantity: 1, unitPrice: 0, totalPrice: 0 }])
  }

  const removePurchaseItem = (index: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index))
  }

  const calcSalesTotal = () =>
    salesItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

  const calcPurchaseTotals = () => {
    const total = purchaseItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    const vat = Math.round(total * 0.1)
    return { total, vat, totalWithVat: total + vat }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const salesTotal = calcSalesTotal()
      const purchaseTotals = calcPurchaseTotals()

      const res = await fetch('/api/sales-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          salesItems,
          purchaseItems,
          salesTotalAmount: salesTotal,
          purchaseTotalAmount: purchaseTotals.total,
          purchaseTotalWithVat: purchaseTotals.totalWithVat,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '품의서 생성에 실패했습니다')
      }

      const data = await res.json()
      router.push(`${basePath}/${data.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '품의서 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const salesTotal = calcSalesTotal()
  const purchaseTotals = calcPurchaseTotals()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center gap-3">
          {/* 모드 토글 */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('web')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                mode === 'web'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UilEdit size={18} />
              웹 모드
            </button>
            <button
              type="button"
              onClick={() => setMode('template')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                mode === 'template'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UilFileAlt size={18} />
              양식 모드
            </button>
          </div>
          <button
            type="button"
            onClick={() => router.push(basePath)}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
          >
            취소
          </button>
        </div>
      </div>

      {mode === 'template' ? (
        <SalesApprovalTemplate
          formData={formData}
          salesItems={salesItems}
          purchaseItems={purchaseItems}
          salesTotal={salesTotal}
          purchaseTotals={{ total: purchaseTotals.total, totalWithVat: purchaseTotals.totalWithVat }}
          onDataChange={handleInputChange}
          onSalesItemChange={handleSalesItemChange}
          onPurchaseItemChange={handlePurchaseItemChange}
          onAddRow={() => {
            addSalesItem()
            addPurchaseItem()
          }}
        />
      ) : (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 계산서 발행/품의 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">품의 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">계산서 발행일</label>
              <input
                type="text"
                value={formData.invoiceIssueDate}
                onChange={(e) => handleInputChange('invoiceIssueDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="예: 2025.12.02"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">품의 코드</label>
              <input
                type="text"
                value={formData.approvalCode}
                onChange={(e) => handleInputChange('approvalCode', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="예: 0251202-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">품의 일자</label>
              <input
                type="text"
                value={formData.approvalDate}
                onChange={(e) => handleInputChange('approvalDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="예: 2025.12.02"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">품의 담당</label>
              <input
                type="text"
                value={formData.approvalOwner}
                onChange={(e) => handleInputChange('approvalOwner', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="예: 김대훈"
              />
            </div>
          </div>
        </div>

        {/* 매출처 / 장비 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">매출처 / 장비 정보</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">매출처 / 담당 / 연락처</label>
              <input
                type="text"
                value={formData.salesContactLine}
                onChange={(e) => handleInputChange('salesContactLine', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="예: 서버메이트 / 김대훈 팀장 / 010-1234-5678"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End User</label>
                <input
                  type="text"
                  value={formData.endUser}
                  onChange={(e) => handleInputChange('endUser', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="End User 정보를 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">MT&amp;S/N</label>
                <input
                  type="text"
                  value={formData.mtSn}
                  onChange={(e) => handleInputChange('mtSn', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="모델타입 / 시리얼넘버 등"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 매출 품목 테이블 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">매출 품목</h2>
            <button
              type="button"
              onClick={addSalesItem}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UilPlus size={20} />
              품목 추가
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700" style={{ width: '120px', minWidth: '120px' }}>P/N</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700" style={{ width: '200px', minWidth: '150px' }}>품목</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700" style={{ width: '80px', minWidth: '80px' }}>수량</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700" style={{ width: '120px', minWidth: '100px' }}>단가</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700" style={{ width: '140px', minWidth: '140px' }}>합계</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700" style={{ width: '80px', minWidth: '80px' }}>작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {salesItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3" style={{ width: '120px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={item.partNumber || ''}
                        onChange={(e) => handleSalesItemChange(index, 'partNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="P/N"
                      />
                    </td>
                    <td className="px-4 py-3" style={{ width: '200px', minWidth: '150px' }}>
                      <textarea
                        value={item.description || ''}
                        onChange={(e) => handleSalesItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="품목 상세"
                        rows={2}
                      />
                    </td>
                    <td className="px-4 py-3" style={{ width: '80px', minWidth: '80px' }}>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleSalesItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        min={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                      />
                    </td>
                    <td className="px-4 py-3" style={{ width: '120px', minWidth: '100px' }}>
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => handleSalesItemChange(index, 'unitPrice', parseInt(e.target.value) || 0)}
                        min={0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900" style={{ width: '140px', minWidth: '140px' }}>
                      {(item.totalPrice || 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-center" style={{ width: '80px', minWidth: '80px' }}>
                      <button
                        type="button"
                        onClick={() => removeSalesItem(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <UilTrashAlt size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 매출 합계 */}
          <div className="mt-4 flex justify-end">
            <div className="text-right">
              <div className="text-sm text-gray-600">매출금액 합계(VAT별도)</div>
              <div className="text-xl font-bold text-gray-900">
                {salesTotal.toLocaleString()}원
              </div>
            </div>
          </div>
        </div>

        {/* 매입 품목 테이블 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">매입 품목</h2>
            <button
              type="button"
              onClick={addPurchaseItem}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UilPlus size={20} />
              품목 추가
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700" style={{ width: '150px', minWidth: '120px' }}>매입일 or 계산서 발행</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700" style={{ width: '200px', minWidth: '150px' }}>매입처</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700" style={{ width: '80px', minWidth: '80px' }}>수량</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700" style={{ width: '120px', minWidth: '100px' }}>단가</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700" style={{ width: '140px', minWidth: '140px' }}>합계</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700" style={{ width: '80px', minWidth: '80px' }}>작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchaseItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3" style={{ width: '150px', minWidth: '120px' }}>
                      <input
                        type="text"
                        value={item.dateOrInvoice || ''}
                        onChange={(e) => handlePurchaseItemChange(index, 'dateOrInvoice', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="예: 2025.12.02"
                      />
                    </td>
                    <td className="px-4 py-3" style={{ width: '200px', minWidth: '150px' }}>
                      <input
                        type="text"
                        value={item.vendor || ''}
                        onChange={(e) => handlePurchaseItemChange(index, 'vendor', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="매입처"
                      />
                    </td>
                    <td className="px-4 py-3" style={{ width: '80px', minWidth: '80px' }}>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handlePurchaseItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        min={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                      />
                    </td>
                    <td className="px-4 py-3" style={{ width: '120px', minWidth: '100px' }}>
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => handlePurchaseItemChange(index, 'unitPrice', parseInt(e.target.value) || 0)}
                        min={0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900" style={{ width: '140px', minWidth: '140px' }}>
                      {(item.totalPrice || 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-center" style={{ width: '80px', minWidth: '80px' }}>
                      <button
                        type="button"
                        onClick={() => removePurchaseItem(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <UilTrashAlt size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 매입 합계 */}
          <div className="mt-4 flex justify-end">
            <div className="space-y-1 text-right">
              <div>
                <span className="text-sm text-gray-600 mr-2">매입금액 합계(VAT별도)</span>
                <span className="text-base font-bold text-gray-900">
                  {purchaseTotals.total.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 mr-2">매입금액 합계(VAT포함)</span>
                <span className="text-base font-bold text-gray-900">
                  {purchaseTotals.totalWithVat.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 기타 / 계산서 / 배송 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">기타</h2>
            <textarea
              value={formData.etc}
              onChange={(e) => handleInputChange('etc', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder="기타 내용을 입력하세요"
            />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">계산서 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">계산서 발행예정일</label>
                <input
                  type="text"
                  value={formData.invoicePlannedDate}
                  onChange={(e) => handleInputChange('invoicePlannedDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="예: 납품 이후 발행"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">계산서 메일</label>
                <input
                  type="email"
                  value={formData.invoiceEmail}
                  onChange={(e) => handleInputChange('invoiceEmail', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="계산서 수신 메일"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">결제일</label>
                <input
                  type="text"
                  value={formData.paymentDue}
                  onChange={(e) => handleInputChange('paymentDue', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="예: 계산서 발행 후 익월 말 현금"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">배송 정보</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">배송주소</label>
                <input
                  type="text"
                  value={formData.shippingAddress}
                  onChange={(e) => handleInputChange('shippingAddress', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="배송 주소를 입력하세요"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">받으실분</label>
                  <input
                    type="text"
                    value={formData.shippingReceiver}
                    onChange={(e) => handleInputChange('shippingReceiver', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                  <input
                    type="text"
                    value={formData.shippingReceiverPhone}
                    onChange={(e) => handleInputChange('shippingReceiverPhone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">배송일</label>
                <input
                  type="text"
                  value={formData.shippingDate}
                  onChange={(e) => handleInputChange('shippingDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="예: 별도협의"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push(basePath)}
            className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
      )}
    </div>
  )
}


