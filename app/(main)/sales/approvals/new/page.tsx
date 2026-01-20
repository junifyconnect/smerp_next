'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import QuoteSelectModal from '@/components/modals/QuoteSelectModal'

// 통합 품목 (매출+매입 같이)
interface Item {
  partNumber: string
  description: string
  quantity: number
  salesUnitPrice: number  // 매출 단가
  purchaseUnitPrice: number  // 매입 단가
  vendorCompany: string  // 매입처
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

  // 품의코드 자동생성
  useEffect(() => {
    fetch('/api/sales-approvals/next-code')
      .then((res) => res.json())
      .then((data) => {
        if (data.approvalCode) {
          setFormData((prev) => ({ ...prev, approvalCode: data.approvalCode }))
        }
      })
      .catch((err) => console.error('품의코드 생성 실패:', err))
  }, [])

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

    // 품목 설정
    if (quote.isConsolidated) {
      setIsConsolidatedSales(true)
      setConsolidatedSalesName(quote.consolidatedName || '')
      setConsolidatedSalesPrice(quote.consolidatedPrice || quote.totalAmount || 0)
      setItems(
        quote.items.map((item) => ({
          partNumber: item.partNumber || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          salesUnitPrice: 0,
          purchaseUnitPrice: 0,
          vendorCompany: '',
        }))
      )
    } else {
      setIsConsolidatedSales(false)
      setItems(
        quote.items.map((item) => ({
          partNumber: item.partNumber || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          salesUnitPrice: Number(item.unitPrice) || 0,
          purchaseUnitPrice: 0,
          vendorCompany: '',
        }))
      )
    }
  }

  const handleQuoteSelect = (quote: SalesQuote) => {
    loadQuoteData(quote)
  }

  // textarea 높이 자동 조절
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

  // === 품목 관리 ===
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

  // === 금액 계산 ===
  const calcSalesItemTotal = (item: Item) => item.quantity * item.salesUnitPrice
  const calcPurchaseItemTotal = (item: Item) => item.quantity * item.purchaseUnitPrice

  const calcSalesTotal = () =>
    isConsolidatedSales
      ? consolidatedSalesPrice
      : items.reduce((sum, item) => sum + calcSalesItemTotal(item), 0)

  const calcPurchaseTotal = () =>
    isConsolidatedPurchase
      ? consolidatedPurchaseAmount
      : items.reduce((sum, item) => sum + calcPurchaseItemTotal(item), 0)

  const calcTotalMargin = () => calcSalesTotal() - calcPurchaseTotal()

  // 엑셀 업로드 (파싱된 데이터로 폼 채우기)
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await fetch('/api/sales-approvals/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (res.ok) {
        const data = await res.json()

        // 기본 정보 채우기
        setFormData({
          approvalCode: data.approvalCode || formData.approvalCode,
          approvalDate: data.approvalDate || formData.approvalDate,
          managerName: data.managerName || '',
          clientCompany: data.clientCompany || '',
          clientContact: data.clientContact || '',
          clientPhone: data.clientPhone || '',
          endUser: data.endUser || '',
          paymentTerms: data.paymentTerms || '',
          deliveryAddress: data.deliveryAddress || '',
          deliveryDate: data.deliveryDate || '',
          invoiceEmail: data.invoiceEmail || '',
          receiverName: data.receiverName || '',
          receiverPhone: data.receiverPhone || '',
          notes: data.notes || '',
        })

        // 품목 데이터 채우기
        if (data.salesItems && data.salesItems.length > 0) {
          const newItems: Item[] = data.salesItems.map((salesItem: { productName?: string; quantity?: number; unitPrice?: number }, idx: number) => {
            const purchaseItem = data.purchaseItems?.[idx]
            return {
              partNumber: salesItem.productName || '',
              description: '',
              quantity: salesItem.quantity || 1,
              salesUnitPrice: salesItem.unitPrice || 0,
              purchaseUnitPrice: purchaseItem?.unitPrice || 0,
              vendorCompany: purchaseItem?.vendorCompany || '',
            }
          })
          setItems(newItems.length > 0 ? newItems : [{ partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '' }])
        }

      } else {
        const errorData = await res.json()
        console.error('엑셀 업로드 실패:', errorData.error)
      }
    } catch (err) {
      console.error('엑셀 업로드 실패:', err)
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
      // 매출 품목 변환
      const convertedSalesItems = items
        .filter((item) => item.description || item.partNumber || item.salesUnitPrice > 0)
        .map((item) => ({
          partNumber: item.partNumber,
          productName: item.description || '제품',
          quantity: item.quantity,
          unitPrice: item.salesUnitPrice,
        }))

      // 매입 데이터 변환
      const convertedPurchaseGroups = [{
        vendorName: items[0]?.vendorCompany || '',
        isConsolidated: isConsolidatedPurchase,
        consolidatedAmount: isConsolidatedPurchase ? consolidatedPurchaseAmount : undefined,
        items: isConsolidatedPurchase
          ? undefined
          : items
              .filter((i) => i.description || i.partNumber || i.purchaseUnitPrice > 0)
              .map((i) => ({
                partNumber: i.partNumber,
                productName: i.description || '제품',
                quantity: i.quantity,
                unitPrice: i.purchaseUnitPrice,
                vendorCompany: i.vendorCompany,
              })),
      }]

      const res = await fetch('/api/sales-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quoteId: quoteId || linkedQuote?.id || undefined,
          dealId: linkedQuote?.dealId,
          // 매출
          isConsolidatedSales,
          consolidatedSalesName: isConsolidatedSales ? consolidatedSalesName : undefined,
          consolidatedSalesPrice: isConsolidatedSales ? consolidatedSalesPrice : undefined,
          salesItems: convertedSalesItems,
          // 매입
          purchaseGroups: convertedPurchaseGroups,
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

      <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }} className="space-y-3">
        {/* 기본 정보 (컴팩트 테이블 스타일) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden inline-block">
          <table className="text-sm">
            <tbody className="divide-y divide-gray-100">
              {/* 1행: 품의코드, 매출처, End User */}
              <tr>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">품의코드</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <input type="text" value={formData.approvalCode} onChange={(e) => handleInputChange('approvalCode', e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="Y251202-01" />
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">매출처</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <input type="text" value={formData.clientCompany} onChange={(e) => handleInputChange('clientCompany', e.target.value)} className="w-40 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="고객사명" />
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">End User</td>
                <td className="px-1.5 py-1">
                  <input type="text" value={formData.endUser} onChange={(e) => handleInputChange('endUser', e.target.value)} className="w-40 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="최종 사용자" />
                </td>
              </tr>
              {/* 2행: 품의일자, 담당자, MT&SN */}
              <tr className="bg-gray-50/30">
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">품의일자</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <input type="date" value={formData.approvalDate} onChange={(e) => handleInputChange('approvalDate', e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">담당자</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <input type="text" value={formData.clientContact} onChange={(e) => handleInputChange('clientContact', e.target.value)} className="w-40 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="담당자명" />
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">MT&SN</td>
                <td className="px-1.5 py-1">
                  <input type="text" value={formData.paymentTerms} onChange={(e) => handleInputChange('paymentTerms', e.target.value)} className="w-40 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="" />
                </td>
              </tr>
              {/* 3행: 품의담당, 연락처 */}
              <tr>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">품의담당</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <input type="text" value={formData.managerName} onChange={(e) => handleInputChange('managerName', e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="담당자명" />
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">연락처</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <input type="text" value={formData.clientPhone} onChange={(e) => handleInputChange('clientPhone', e.target.value)} className="w-40 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="010-0000-0000" />
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap"></td>
                <td className="px-1.5 py-1"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ========== 품목 (매출+매입 통합) ========== */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-semibold text-gray-900">품목</h3>
              {/* 매출 유형 선택 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">매출:</span>
                <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-blue-200">
                  <button
                    type="button"
                    onClick={() => setIsConsolidatedSales(false)}
                    className={`px-2 py-0.5 text-xs rounded transition-all ${
                      !isConsolidatedSales
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    개별
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConsolidatedSales(true)
                      if (!consolidatedSalesPrice) {
                        const total = items.reduce((sum, item) => sum + item.quantity * item.salesUnitPrice, 0)
                        setConsolidatedSalesPrice(total)
                      }
                      if (!consolidatedSalesName && items[0]?.description) {
                        setConsolidatedSalesName(items[0].description + (items.length > 1 ? ' 외' : ''))
                      }
                    }}
                    className={`px-2 py-0.5 text-xs rounded transition-all ${
                      isConsolidatedSales
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    통합
                  </button>
                </div>
              </div>
              {/* 매입 유형 선택 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">매입:</span>
                <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-purple-200">
                  <button
                    type="button"
                    onClick={() => setIsConsolidatedPurchase(false)}
                    className={`px-2 py-0.5 text-xs rounded transition-all ${
                      !isConsolidatedPurchase
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    개별
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConsolidatedPurchase(true)
                      if (!consolidatedPurchaseAmount) {
                        const total = items.reduce((sum, item) => sum + item.quantity * item.purchaseUnitPrice, 0)
                        setConsolidatedPurchaseAmount(total)
                      }
                    }}
                    className={`px-2 py-0.5 text-xs rounded transition-all ${
                      isConsolidatedPurchase
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    통합
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900"
            >
              + 품목 추가
            </button>
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
                      <textarea
                        value={item.description}
                        onChange={(e) => {
                          handleItemChange(index, 'description', e.target.value)
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                        rows={1}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs resize-none overflow-hidden"
                        style={{ minHeight: '28px' }}
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

          {/* 합계 영역 - 테이블 컬럼에 맞춤 */}
          <div className="bg-gray-50 border-t">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  {/* P/N + 품목 + 수량 영역 */}
                  <td className="px-2 py-3 w-24"></td>
                  <td className="px-2 py-3 w-64"></td>
                  <td className="px-2 py-3 w-16"></td>
                  {/* 매출 합계 */}
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
                  {/* 매입 합계 */}
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
