'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Item {
  partNumber: string
  description: string
  quantity: number
  salesUnitPrice: number
  purchaseUnitPrice: number
  vendorCompany: string
}

interface ApiItem {
  productName?: string
  quantity?: number
  unitPrice?: number | string
  vendorCompany?: string
  details?: ApiItemDetail[]
}

interface ApiItemDetail {
  partNumber?: string
  description?: string
  quantity?: number
}

export default function EditSalesApprovalPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    approvalCode: '',
    approvalDate: '',
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

  // === 통합 품목 (매출+매입) ===
  const [items, setItems] = useState<Item[]>([
    { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '' },
  ])

  // === 통합 견적 (매출) ===
  const [isConsolidatedSales, setIsConsolidatedSales] = useState(false)
  const [consolidatedSalesName, setConsolidatedSalesName] = useState('')
  const [consolidatedSalesQty, setConsolidatedSalesQty] = useState(1)
  const [consolidatedSalesPrice, setConsolidatedSalesPrice] = useState(0)

  // === 통합 매입 ===
  const [isConsolidatedPurchase, setIsConsolidatedPurchase] = useState(false)
  const [consolidatedPurchaseName, setConsolidatedPurchaseName] = useState('')
  const [consolidatedPurchaseQty, setConsolidatedPurchaseQty] = useState(1)
  const [consolidatedPurchaseVendor, setConsolidatedPurchaseVendor] = useState('')
  const [consolidatedPurchaseAmount, setConsolidatedPurchaseAmount] = useState(0)

  const fetchApproval = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-approvals/${id}`)
      if (res.ok) {
        const data = await res.json()

        // DRAFT 상태가 아니면 상세 페이지로 리다이렉트
        if (data.status !== 'DRAFT') {
          router.push(`/sales/approvals/${id}`)
          return
        }

        setFormData({
          approvalCode: data.approvalCode || '',
          approvalDate: data.approvalDate ? data.approvalDate.split('T')[0] : '',
          managerName: data.managerName || '',
          clientCompany: data.clientCompany || '',
          clientContact: data.clientContact || '',
          clientPhone: data.clientPhone || '',
          endUser: data.endUser || '',
          paymentTerms: data.paymentTerms || '',
          deliveryAddress: data.deliveryAddress || '',
          deliveryDate: data.deliveryDate ? data.deliveryDate.split('T')[0] : '',
          invoiceEmail: data.invoiceEmail || '',
          receiverName: data.receiverName || '',
          receiverPhone: data.receiverPhone || '',
          notes: data.notes || '',
        })

        // 통합 매출 체크: items가 1개이고 details가 있으면 통합 모드
        const salesItems = data.items || []
        const purchaseItems = data.purchaseItems || []

        if (salesItems.length === 1 && salesItems[0].details && salesItems[0].details.length > 0) {
          // 통합 매출 모드
          setIsConsolidatedSales(true)
          setConsolidatedSalesName(salesItems[0].productName || '')
          setConsolidatedSalesQty(salesItems[0].quantity || 1)
          setConsolidatedSalesPrice(Number(salesItems[0].unitPrice) || 0)

          // details를 items로 변환
          const loadedItems: Item[] = salesItems[0].details.map((detail: ApiItemDetail, idx: number) => {
            const purchaseItem = purchaseItems[0]?.details?.[idx]
            return {
              partNumber: detail.partNumber || '',
              description: detail.description || '',
              quantity: detail.quantity || 1,
              salesUnitPrice: 0, // 통합이므로 0
              purchaseUnitPrice: 0, // 아래에서 처리
              vendorCompany: '',
            }
          })

          // 통합 매입 체크
          if (purchaseItems.length === 1 && purchaseItems[0].details && purchaseItems[0].details.length > 0) {
            setIsConsolidatedPurchase(true)
            setConsolidatedPurchaseName(purchaseItems[0].productName || '')
            setConsolidatedPurchaseQty(purchaseItems[0].quantity || 1)
            setConsolidatedPurchaseVendor(purchaseItems[0].vendorCompany || '')
            setConsolidatedPurchaseAmount(Number(purchaseItems[0].unitPrice) || 0)
          } else if (purchaseItems.length > 0) {
            // 개별 매입
            loadedItems.forEach((item, idx) => {
              if (purchaseItems[idx]) {
                item.purchaseUnitPrice = Number(purchaseItems[idx].unitPrice) || 0
                item.vendorCompany = purchaseItems[idx].vendorCompany || ''
              }
            })
          }

          setItems(loadedItems.length > 0 ? loadedItems : [
            { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '' }
          ])
        } else {
          // 개별 매출 모드 - 기존 방식
          const loadedItems: Item[] = []
          const maxLen = Math.max(salesItems.length, purchaseItems.length, 1)

          for (let i = 0; i < maxLen; i++) {
            const salesItem = salesItems[i]
            const purchaseItem = purchaseItems[i]

            // details가 있으면 첫번째 detail 사용
            const salesDetail = salesItem?.details?.[0]
            const purchaseDetail = purchaseItem?.details?.[0]

            loadedItems.push({
              partNumber: salesDetail?.partNumber || salesItem?.productName || purchaseDetail?.partNumber || '',
              description: salesDetail?.description || purchaseDetail?.description || '',
              quantity: salesDetail?.quantity || salesItem?.quantity || purchaseItem?.quantity || 1,
              salesUnitPrice: Number(salesItem?.unitPrice) || 0,
              purchaseUnitPrice: Number(purchaseItem?.unitPrice) || 0,
              vendorCompany: purchaseItem?.vendorCompany || '',
            })
          }

          setItems(loadedItems.length > 0 ? loadedItems : [
            { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '' }
          ])
        }
      } else {
        router.push('/sales/approvals')
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push('/sales/approvals')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchApproval()
  }, [fetchApproval])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index: number, field: keyof Item, value: string | number) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addItem = () => {
    setItems((prev) => [...prev, { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const calcSalesItemTotal = (item: Item) => item.quantity * item.salesUnitPrice
  const calcPurchaseItemTotal = (item: Item) => item.quantity * item.purchaseUnitPrice
  const calcSalesTotal = () => items.reduce((sum, item) => sum + calcSalesItemTotal(item), 0)
  const calcPurchaseTotal = () => items.reduce((sum, item) => sum + calcPurchaseItemTotal(item), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // 매출 아이템 구성
      let salesItemsPayload: ApiItem[] = []
      let purchaseItemsPayload: ApiItem[] = []

      if (isConsolidatedSales) {
        // 통합 매출: 하나의 아이템 + details
        salesItemsPayload = [{
          productName: consolidatedSalesName || '통합견적',
          quantity: consolidatedSalesQty || 1,
          unitPrice: consolidatedSalesPrice,
          details: items.map((item, idx) => ({
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            sortOrder: idx,
          })),
        }]
      } else {
        // 개별 매출
        salesItemsPayload = items.filter(item => item.description || item.salesUnitPrice > 0).map((item, idx) => ({
          productName: item.partNumber || item.description || '품목',
          quantity: item.quantity,
          unitPrice: item.salesUnitPrice,
          sortOrder: idx,
          details: [{
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            sortOrder: 0,
          }],
        }))
      }

      if (isConsolidatedPurchase) {
        // 통합 매입
        purchaseItemsPayload = [{
          productName: consolidatedPurchaseName || '통합매입',
          quantity: consolidatedPurchaseQty || 1,
          unitPrice: consolidatedPurchaseAmount,
          vendorCompany: consolidatedPurchaseVendor,
          details: items.map((item, idx) => ({
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            sortOrder: idx,
          })),
        }]
      } else {
        // 개별 매입
        purchaseItemsPayload = items.filter(item => item.description || item.purchaseUnitPrice > 0).map((item, idx) => ({
          productName: item.partNumber || item.description || '품목',
          quantity: item.quantity,
          unitPrice: item.purchaseUnitPrice,
          vendorCompany: item.vendorCompany,
          sortOrder: idx,
          details: [{
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            sortOrder: 0,
          }],
        }))
      }

      const res = await fetch(`/api/sales-approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: salesItemsPayload,
          purchaseItems: purchaseItemsPayload,
        }),
      })

      if (res.ok) {
        router.push(`/sales/approvals/${id}`)
      } else {
        const data = await res.json()
        alert(data.error || '수정에 실패했습니다')
      }
    } catch {
      alert('수정에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link
          href={`/sales/approvals/${id}`}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">품의서 수정</h1>
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
              <input
                type="text"
                value={formData.clientContact}
                onChange={(e) => handleInputChange('clientContact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
              <input
                type="text"
                value={formData.clientPhone}
                onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End User</label>
              <input
                type="text"
                value={formData.endUser}
                onChange={(e) => handleInputChange('endUser', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">결제조건</label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">세금계산서 메일</label>
              <input
                type="email"
                value={formData.invoiceEmail}
                onChange={(e) => handleInputChange('invoiceEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">수령자 연락처</label>
              <input
                type="text"
                value={formData.receiverPhone}
                onChange={(e) => handleInputChange('receiverPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* 통합 품목 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">품목 내역</h3>
            <div className="flex items-center gap-4">
              {/* 통합 견적 토글 */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isConsolidatedSales}
                  onChange={(e) => setIsConsolidatedSales(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-blue-600 font-medium">통합 매출</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isConsolidatedPurchase}
                  onChange={(e) => setIsConsolidatedPurchase(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-purple-600 font-medium">통합 매입</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900"
              >
                + 품목 추가
              </button>
            </div>
          </div>

          {/* 품목 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-24">P/N</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-64">품목</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16">수량</th>
                  {/* 매출 */}
                  <th className="px-2 py-2 text-right text-xs font-medium text-blue-600 w-24">매출단가</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-blue-600 w-28 border-r-2 border-gray-300">매출합계</th>
                  {/* 매입 */}
                  <th className="px-2 py-2 text-left text-xs font-medium text-purple-600 w-28">매입처</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-purple-600 w-24">매입단가</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-purple-600 w-28">매입합계</th>
                  <th className="px-2 py-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* 통합 행 (매출 또는 매입 중 하나라도 통합이면 표시) */}
                {(isConsolidatedSales || isConsolidatedPurchase) && (
                  <tr className="bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                    <td className="px-2 py-2">
                      <span className="text-xs font-medium text-gray-600">통합</span>
                    </td>
                    {/* 통합 매출 */}
                    {isConsolidatedSales ? (
                      <>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={consolidatedSalesName}
                            onChange={(e) => setConsolidatedSalesName(e.target.value)}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-xs bg-blue-50"
                            placeholder="제품명"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={consolidatedSalesQty || 1}
                            onChange={(e) => setConsolidatedSalesQty(parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-xs text-right bg-blue-50"
                            min="1"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={consolidatedSalesPrice || ''}
                            onChange={(e) => setConsolidatedSalesPrice(parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-blue-300 rounded text-xs text-right bg-blue-50"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-blue-700 text-xs border-r-2 border-gray-300">
                          {((consolidatedSalesQty || 1) * (consolidatedSalesPrice || 0)).toLocaleString()}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2 border-r-2 border-gray-300"></td>
                      </>
                    )}
                    {/* 통합 매입 */}
                    {isConsolidatedPurchase ? (
                      <>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={consolidatedPurchaseVendor}
                            onChange={(e) => setConsolidatedPurchaseVendor(e.target.value)}
                            className="w-full px-2 py-1 border border-purple-300 rounded text-xs bg-purple-50"
                            placeholder="매입처"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={consolidatedPurchaseAmount || ''}
                            onChange={(e) => setConsolidatedPurchaseAmount(parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-purple-300 rounded text-xs text-right bg-purple-50"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-purple-700 text-xs">
                          {((consolidatedPurchaseQty || 1) * (consolidatedPurchaseAmount || 0)).toLocaleString()}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2"></td>
                      </>
                    )}
                    <td className="px-2 py-2"></td>
                  </tr>
                )}
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.partNumber}
                        onChange={(e) => handleItemChange(index, 'partNumber', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                        placeholder="P/N"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                        placeholder="품목명"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                        min="1"
                      />
                    </td>
                    {/* 매출 */}
                    <td className="px-2 py-2">
                      {isConsolidatedSales ? (
                        <span className="text-xs text-gray-400 block text-right">-</span>
                      ) : (
                        <input
                          type="number"
                          value={item.salesUnitPrice || ''}
                          onChange={(e) => handleItemChange(index, 'salesUnitPrice', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-blue-200 rounded text-xs text-right bg-blue-50/30"
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-blue-700 text-xs border-r-2 border-gray-300">
                      {isConsolidatedSales ? '-' : calcSalesItemTotal(item).toLocaleString()}
                    </td>
                    {/* 매입 */}
                    <td className="px-2 py-2">
                      {isConsolidatedPurchase ? (
                        <span className="text-xs text-gray-400 block">-</span>
                      ) : (
                        <input
                          type="text"
                          value={item.vendorCompany}
                          onChange={(e) => handleItemChange(index, 'vendorCompany', e.target.value)}
                          className="w-full px-2 py-1 border border-purple-200 rounded text-xs bg-purple-50/30"
                          placeholder="매입처"
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {isConsolidatedPurchase ? (
                        <span className="text-xs text-gray-400 block text-right">-</span>
                      ) : (
                        <input
                          type="number"
                          value={item.purchaseUnitPrice || ''}
                          onChange={(e) => handleItemChange(index, 'purchaseUnitPrice', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-purple-200 rounded text-xs text-right bg-purple-50/30"
                          placeholder="0"
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-purple-700 text-xs">
                      {isConsolidatedPurchase ? '-' : calcPurchaseItemTotal(item).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
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
            </table>
          </div>

          {/* 합계 영역 */}
          <div className="bg-gray-50 border-t">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="px-2 py-3 w-24"></td>
                  <td className="px-2 py-3 w-64"></td>
                  <td className="px-2 py-3 w-16"></td>
                  <td className="px-2 py-3 w-24 text-right text-sm text-gray-500">매출합계</td>
                  <td className="px-2 py-3 w-28 text-right border-r-2 border-gray-300">
                    <div className="text-xs text-gray-500">VAT별도</div>
                    <div className="text-base font-bold text-blue-700">
                      {(isConsolidatedSales
                        ? (consolidatedSalesQty || 1) * (consolidatedSalesPrice || 0)
                        : calcSalesTotal()
                      ).toLocaleString()}원
                    </div>
                  </td>
                  <td className="px-2 py-3 w-28 text-right text-sm text-gray-500">매입합계</td>
                  <td className="px-2 py-3 w-24 text-right">
                    <div className="text-xs text-gray-500">VAT별도</div>
                    <div className="text-base font-bold text-purple-700">
                      {(isConsolidatedPurchase
                        ? (consolidatedPurchaseQty || 1) * (consolidatedPurchaseAmount || 0)
                        : calcPurchaseTotal()
                      ).toLocaleString()}원
                    </div>
                  </td>
                  <td className="px-2 py-3 w-28 text-right">
                    <div className="text-xs text-gray-500">VAT포함</div>
                    <div className="text-base font-bold text-purple-700">
                      {Math.round((isConsolidatedPurchase
                        ? (consolidatedPurchaseQty || 1) * (consolidatedPurchaseAmount || 0)
                        : calcPurchaseTotal()
                      ) * 1.1).toLocaleString()}원
                    </div>
                  </td>
                  <td className="px-2 py-3 w-10"></td>
                </tr>
              </tbody>
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
          {(() => {
            const salesTotal = isConsolidatedSales
              ? (consolidatedSalesQty || 1) * (consolidatedSalesPrice || 0)
              : calcSalesTotal()
            const purchaseTotal = isConsolidatedPurchase
              ? (consolidatedPurchaseQty || 1) * (consolidatedPurchaseAmount || 0)
              : calcPurchaseTotal()
            const margin = salesTotal - purchaseTotal
            return (
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-sm text-blue-600">매출 (VAT별도)</p>
                  <p className="text-xl font-bold text-blue-900">{salesTotal.toLocaleString()}원</p>
                </div>
                <div>
                  <p className="text-sm text-purple-600">매입 (VAT별도)</p>
                  <p className="text-xl font-bold text-purple-900">{purchaseTotal.toLocaleString()}원</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">마진</p>
                  <p className={`text-xl font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {margin.toLocaleString()}원
                  </p>
                  <p className="text-xs text-gray-500">
                    ({salesTotal > 0 ? ((margin / salesTotal) * 100).toFixed(1) : 0}%)
                  </p>
                </div>
              </div>
            )
          })()}
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3">
          <Link
            href={`/sales/approvals/${id}`}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
