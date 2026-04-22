'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import QuoteSelectModal from '@/components/modals/QuoteSelectModal'
import VendorAutocomplete from '@/components/inputs/VendorAutocomplete'

// 품목 (제품 하위)
interface Item {
  partNumber: string
  description: string
  quantity: number
  salesUnitPrice: number  // 매출 단가
  purchaseUnitPrice: number  // 매입 단가
  vendorCompany: string  // 매입처
  salesInvoiceRequired: boolean
  purchaseInvoiceRequired: boolean
}

// 제품 그룹 (품목들을 묶어서 통합)
// 실무 규칙(2026-04 정리): 세금은 VAT 10% 고정, 매출 계산서는 제품 단위 고정.
// 매입 계산서는 매입처(vendorCompany)별 자동 그룹핑.
interface ProductGroup {
  id: string
  name: string
  quantity: number
  salesUnitPrice: number  // 매출 단가
  purchaseUnitPrice: number  // 매입 단가
  vendorCompany: string  // 매입처
  category: string  // 상품, MA
  items: Item[]  // 참고용 상세 내역
}

const CATEGORIES = ['상품', 'MA']

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
    // 계산서 관련
    invoiceDate: '',           // 계산서 발행일
    invoiceDueDate: '',        // 계산서 발행예정일
    invoiceEmail: '',          // 계산서 메일
    paymentDate: '',           // 결제일
    // 배송 관련
    deliveryAddress: '',       // 배송주소
    deliveryDate: '',          // 배송일
    receiverName: '',          // 받으실분
    receiverPhone: '',         // 받으실분 연락처
    notes: '',
  })

  // === 제품 그룹 (제품 + 하위 품목) ===
  const [products, setProducts] = useState<ProductGroup[]>([
    { id: `product-init-${Date.now()}`, name: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', category: '상품', items: [] },
  ])

  // === 독립 품목 (제품에 소속되지 않는 품목) ===
  const [standaloneItems, setStandaloneItems] = useState<Item[]>([])

  // 레거시: 기존 flat items (하위 호환용)
  const [items, setItems] = useState<Item[]>([
    { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', salesInvoiceRequired: true, purchaseInvoiceRequired: true },
  ])

  // 숫자 포맷팅 (천 단위 쉼표)
  const formatNumber = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
    if (isNaN(num) || num === 0) return ''
    return num.toLocaleString()
  }

  // 숫자 파싱 (쉼표 제거)
  const parseNumber = (value: string): number => {
    const num = parseInt(value.replace(/,/g, ''), 10)
    return isNaN(num) ? 0 : num
  }

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
          salesInvoiceRequired: true,
          purchaseInvoiceRequired: true,
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
          salesInvoiceRequired: true,
          purchaseInvoiceRequired: true,
        }))
      )
    }
  }

  const handleQuoteSelect = (quote: SalesQuote) => {
    loadQuoteData(quote)
  }

  // textarea 높이 자동 조절 함수
  const adjustTextareaHeights = () => {
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea')
    textareas.forEach((textarea) => {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    })
  }

  // 데이터 변경 시 textarea 높이 자동 조절
  useEffect(() => {
    const timer = setTimeout(adjustTextareaHeights, 50)
    return () => clearTimeout(timer)
  }, [products, standaloneItems, items])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // === 품목 관리 ===
  const handleItemChange = (index: number, field: keyof Item, value: string | number | boolean) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addItem = () => {
    setItems((prev) => [...prev, { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', salesInvoiceRequired: true, purchaseInvoiceRequired: true }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  // === 제품 관리 ===
  const addProduct = () => {
    const newProduct: ProductGroup = {
      id: `temp-${Date.now()}`,
      name: '',
      quantity: 1,
      salesUnitPrice: 0,
      purchaseUnitPrice: 0,
      vendorCompany: '',
      category: '상품',
      items: [],
    }
    setProducts([...products, newProduct])
  }

  const removeProduct = (productIndex: number) => {
    setProducts(products.filter((_, i) => i !== productIndex))
  }

  const handleProductChange = (productIndex: number, field: keyof ProductGroup, value: string | number | boolean) => {
    setProducts(prev => {
      const newProducts = [...prev]
      newProducts[productIndex] = { ...newProducts[productIndex], [field]: value }
      return newProducts
    })
  }

  // 제품 내 품목 관리
  const addProductItem = (productIndex: number) => {
    setProducts(prev => {
      const newProducts = [...prev]
      newProducts[productIndex] = {
        ...newProducts[productIndex],
        items: [...newProducts[productIndex].items, { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', salesInvoiceRequired: true, purchaseInvoiceRequired: true }],
      }
      return newProducts
    })
  }

  const removeProductItem = (productIndex: number, itemIndex: number) => {
    setProducts(prev => {
      const newProducts = [...prev]
      newProducts[productIndex] = {
        ...newProducts[productIndex],
        items: newProducts[productIndex].items.filter((_, i) => i !== itemIndex),
      }
      return newProducts
    })
  }

  const handleProductItemChange = (productIndex: number, itemIndex: number, field: keyof Item, value: string | number | boolean) => {
    setProducts(prev => {
      const newProducts = [...prev]
      const newItems = [...newProducts[productIndex].items]
      newItems[itemIndex] = { ...newItems[itemIndex], [field]: value }
      newProducts[productIndex] = { ...newProducts[productIndex], items: newItems }
      return newProducts
    })
  }

  // === 독립 품목 관리 ===
  const addStandaloneItem = () => {
    setStandaloneItems([...standaloneItems, { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', salesInvoiceRequired: true, purchaseInvoiceRequired: true }])
  }

  const removeStandaloneItem = (index: number) => {
    setStandaloneItems(standaloneItems.filter((_, i) => i !== index))
  }

  const handleStandaloneItemChange = (index: number, field: keyof Item, value: string | number | boolean) => {
    setStandaloneItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }

  // === 금액 계산 ===
  const calcProductSalesTotal = (product: ProductGroup) => product.quantity * product.salesUnitPrice
  const calcSalesItemTotal = (item: Item) => item.quantity * item.salesUnitPrice
  const calcPurchaseItemTotal = (item: Item) => item.quantity * (item.purchaseUnitPrice || 0)

  const calcSalesTotal = () => {
    // 제품별 매출 합계 + 독립 품목 매출 합계
    const productsTotal = products.reduce((sum, p) => sum + calcProductSalesTotal(p), 0)
    const standaloneTotal = standaloneItems.reduce((sum, item) => sum + calcSalesItemTotal(item), 0)
    return productsTotal + standaloneTotal
  }

  const calcPurchaseTotal = () => {
    // 제품 레벨 매입 합계 (일괄 매입)
    const productLevelTotal = products.reduce((sum, p) =>
      sum + (p.purchaseUnitPrice || 0) * (p.quantity || 1), 0)
    // 제품 소속 품목들의 매입 합계
    const productItemsTotal = products.reduce((sum, p) =>
      sum + p.items.reduce((itemSum, item) => itemSum + calcPurchaseItemTotal(item), 0), 0)
    // 독립 품목 매입 합계
    const standaloneTotal = standaloneItems.reduce((sum, item) => sum + calcPurchaseItemTotal(item), 0)
    return productLevelTotal + productItemsTotal + standaloneTotal
  }

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
          // 계산서 관련
          invoiceDate: data.invoiceDate || '',
          invoiceDueDate: data.invoiceDueDate || '',
          invoiceEmail: data.invoiceEmail || '',
          paymentDate: data.paymentDate || '',
          // 배송 관련
          deliveryAddress: data.deliveryAddress || '',
          deliveryDate: data.deliveryDate || '',
          receiverName: data.receiverName || '',
          receiverPhone: data.receiverPhone || '',
          notes: data.notes || '',
        })

        // 새 구조: products로 채우기
        if (data.products && data.products.length > 0) {
          interface UploadedProduct {
            id: string
            name: string
            quantity: number
            salesUnitPrice: number
            unitPrice?: number  // 레거시 호환
            purchaseUnitPrice?: number  // 제품 레벨 매입 단가 (통합 매입용)
            vendorCompany?: string  // 제품 레벨 매입처 (통합 매입용)
            vendorName?: string  // 레거시 호환
            items: {
              partNumber: string
              description: string
              quantity: number
              purchaseUnitPrice: number
              purchasePrice?: number  // 레거시 호환
              vendorCompany: string
              vendorName?: string  // 레거시 호환
            }[]
          }

          const newProducts: ProductGroup[] = data.products.map((p: UploadedProduct) => ({
            id: p.id || `product-${Date.now()}-${Math.random()}`,
            name: p.name || '',
            quantity: p.quantity || 1,
            salesUnitPrice: p.salesUnitPrice || p.unitPrice || 0,
            purchaseUnitPrice: p.purchaseUnitPrice || 0,  // 제품 레벨 매입 (통합 매입)
            vendorCompany: p.vendorCompany || p.vendorName || '',  // 제품 레벨 매입처 (통합 매입)
            category: '상품',
            items: (p.items || []).map((item) => ({
              partNumber: item.partNumber || '',
              description: item.description || '',
              quantity: item.quantity || 1,
              salesUnitPrice: 0, // 품목 레벨에는 매출 정보 없음
              purchaseUnitPrice: item.purchaseUnitPrice || item.purchasePrice || 0,
              vendorCompany: item.vendorCompany || item.vendorName || '',
                  salesInvoiceRequired: true,
              purchaseInvoiceRequired: true,
            })),
          }))

          setProducts(newProducts.length > 0 ? newProducts : [
            { id: `product-${Date.now()}`, name: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', category: '상품', items: [] }
          ])
          setStandaloneItems(data.standaloneItems || [])

          // 통합 모드 비활성화 (새 구조 사용)
          setIsConsolidatedSales(false)
          setIsConsolidatedPurchase(false)
        } else if (data.salesItems && data.salesItems.length > 0) {
          // 레거시 호환: salesItems로 채우기
          const hasPrice = data.salesItems.filter((item: { unitPrice?: number }) => (item.unitPrice || 0) > 0)
          if (hasPrice.length === 1) {
            setIsConsolidatedSales(true)
            setConsolidatedSalesName(hasPrice[0].productName || '제품')
            setConsolidatedSalesQty(hasPrice[0].quantity || 1)
            setConsolidatedSalesPrice(hasPrice[0].unitPrice || 0)

            if (data.purchaseItems && data.purchaseItems.length > 0) {
              const purchaseHasPrice = data.purchaseItems.filter((item: { unitPrice?: number }) => (item.unitPrice || 0) > 0)
              if (purchaseHasPrice.length === 1) {
                setIsConsolidatedPurchase(true)
                setConsolidatedPurchaseVendor(purchaseHasPrice[0].vendorCompany || '')
                setConsolidatedPurchaseAmount(purchaseHasPrice[0].unitPrice || 0)
              }
            }
          } else {
            setIsConsolidatedSales(false)
            setIsConsolidatedPurchase(false)
          }

          const newItems: Item[] = data.salesItems.map((salesItem: { productName?: string; quantity?: number; unitPrice?: number; details?: { partNumber?: string; description?: string; quantity?: number }[] }, idx: number) => {
            const purchaseItem = data.purchaseItems?.[idx]
            return {
              partNumber: salesItem.productName || '',
              description: salesItem.details?.map((d: { partNumber?: string; description?: string; quantity?: number }) =>
                `${d.partNumber ? `[${d.partNumber}] ` : ''}${d.description || ''}`
              ).join('\n') || '',
              quantity: salesItem.quantity || 1,
              salesUnitPrice: salesItem.unitPrice || 0,
              purchaseUnitPrice: purchaseItem?.unitPrice || 0,
              vendorCompany: purchaseItem?.vendorCompany || '',
                  salesInvoiceRequired: true,
              purchaseInvoiceRequired: true,
            }
          })
          setItems(newItems.length > 0 ? newItems : [{ partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', salesInvoiceRequired: true, purchaseInvoiceRequired: true }])
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
      // 제품 그룹 변환 (제품 레벨 + 품목 레벨 매입 정보 포함)
      const convertedProducts = products.map((product, pIdx) => ({
        name: product.name,
        quantity: product.quantity,
        salesUnitPrice: product.salesUnitPrice || 0,
        purchaseUnitPrice: product.purchaseUnitPrice || 0,
        vendorCompany: product.vendorCompany || '',
        category: product.category,
        sortOrder: pIdx,
        items: product.items.map((item, iIdx) => ({
          partNumber: item.partNumber || undefined,
          description: item.description || undefined,
          quantity: item.quantity,
          purchaseUnitPrice: item.purchaseUnitPrice || 0,
          vendorCompany: item.vendorCompany || '',
          salesInvoiceRequired: item.salesInvoiceRequired,
          purchaseInvoiceRequired: item.purchaseInvoiceRequired,
          sortOrder: iIdx,
        })),
      }))

      // 독립 품목 변환
      const convertedStandaloneItems = standaloneItems
        .filter(item => item.partNumber?.trim() || item.description?.trim() || item.salesUnitPrice > 0 || item.purchaseUnitPrice > 0)
        .map((item, idx) => ({
          partNumber: item.partNumber || undefined,
          description: item.description || undefined,
          quantity: item.quantity,
          salesUnitPrice: item.salesUnitPrice || 0,
          purchaseUnitPrice: item.purchaseUnitPrice || 0,
          vendorCompany: item.vendorCompany || '',
          sortOrder: idx,
        }))

      const res = await fetch('/api/sales-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quoteId: quoteId || linkedQuote?.id || undefined,
          dealId: linkedQuote?.dealId,
          // 새 구조: 제품 + 독립 품목
          products: convertedProducts,
          standaloneItems: convertedStandaloneItems,
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
                  <input type="text" value={formData.approvalCode} onChange={(e) => handleInputChange('approvalCode', e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="D251202-01" />
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
              {/* 2행: 품의일자, 담당자/연락처, MT&SN */}
              <tr className="bg-gray-50/30">
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">품의일자</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <input type="date" value={formData.approvalDate} onChange={(e) => handleInputChange('approvalDate', e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">담당자/연락처</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="flex gap-1">
                    <input type="text" value={formData.clientContact} onChange={(e) => handleInputChange('clientContact', e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="담당자명" />
                    <input type="text" value={formData.clientPhone} onChange={(e) => handleInputChange('clientPhone', e.target.value)} className="w-28 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="010-0000-0000" />
                  </div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">MT&S/N</td>
                <td className="px-1.5 py-1">
                  <input type="text" value={formData.paymentTerms} onChange={(e) => handleInputChange('paymentTerms', e.target.value)} className="w-40 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="프로젝트명/용도" />
                </td>
              </tr>
              {/* 3행: 품의담당 */}
              <tr>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">품의담당</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <input type="text" value={formData.managerName} onChange={(e) => handleInputChange('managerName', e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="담당자명" />
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap"></td>
                <td className="px-1.5 py-1 border-r border-gray-100"></td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap"></td>
                <td className="px-1.5 py-1"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ========== 품목 (제품 + 품목 통합 테이블) ========== */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">품목</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addProduct}
                className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
              >
                + 제품 추가
              </button>
              <button
                type="button"
                onClick={addStandaloneItem}
                className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900"
              >
                + 품목 추가
              </button>
            </div>
          </div>

          {/* 통합 테이블: 제품 + 품목 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {/* 단일 헤더 */}
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-24">P/N</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">품목</th>
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
              <tbody>
                {/* 제품들과 그 하위 품목들 */}
                {products.map((product, pIdx) => (
                  <React.Fragment key={product.id || `product-${pIdx}`}>
                    {/* 제품 행 (emerald 배경) - 매출 정보만 */}
                    <tr className="bg-emerald-50 border-b border-emerald-200">
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-600 text-white">
                          제품
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) => handleProductChange(pIdx, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-emerald-300 rounded text-xs bg-white font-medium"
                          placeholder="제품명 (예: R660XS 서버 시스템)"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={product.quantity || ''}
                          onChange={(e) => handleProductChange(pIdx, 'quantity', parseInt(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                          placeholder="0"
                        />
                      </td>
                      {/* 매출 - 제품에서 입력 */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={formatNumber(product.salesUnitPrice || 0)}
                          onChange={(e) => handleProductChange(pIdx, 'salesUnitPrice', parseNumber(e.target.value))}
                          onFocus={(e) => {
                            e.target.value = product.salesUnitPrice?.toString() || ''
                            e.target.select()
                          }}
                          onBlur={(e) => {
                            e.target.value = formatNumber(product.salesUnitPrice || 0)
                          }}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-xs text-right bg-blue-50"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-blue-700 text-xs border-r-2 border-gray-300">
                        {calcProductSalesTotal(product).toLocaleString()}
                      </td>
                      {/* 매입 - 제품에서도 입력 가능 (일괄 매입 시) */}
                      <td className="px-2 py-2">
                        <VendorAutocomplete
                          value={product.vendorCompany || ''}
                          onChange={(val) => handleProductChange(pIdx, 'vendorCompany', val)}
                          className="w-full px-2 py-1 border border-purple-200 rounded text-xs bg-purple-50/50"
                          placeholder="매입처"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={formatNumber(product.purchaseUnitPrice || 0)}
                          onChange={(e) => handleProductChange(pIdx, 'purchaseUnitPrice', parseNumber(e.target.value))}
                          onFocus={(e) => {
                            e.target.value = product.purchaseUnitPrice?.toString() || ''
                            e.target.select()
                          }}
                          onBlur={(e) => {
                            e.target.value = formatNumber(product.purchaseUnitPrice || 0)
                          }}
                          className="w-full px-2 py-1 border border-purple-200 rounded text-xs text-right bg-purple-50/50"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-purple-700 text-xs">
                        {((product.purchaseUnitPrice || 0) * (product.quantity || 1)).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeProduct(pIdx)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="제품 삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>

                    {/* 제품 설정 행: 분류 (세금 VAT 고정, 매출계산서 제품단위 고정) */}
                    <tr className="bg-emerald-50/60 border-b border-emerald-100">
                      <td colSpan={9} className="px-4 py-1.5">
                        <div className="flex items-center gap-4 text-[11px]">
                          {/* 분류 */}
                          <label className="flex items-center gap-1 text-gray-600">
                            <span className="font-medium">분류:</span>
                            <select
                              value={product.category}
                              onChange={(e) => handleProductChange(pIdx, 'category', e.target.value)}
                              className="px-1.5 py-0.5 border border-gray-300 rounded text-[11px] bg-white"
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </label>
                          {/* 매입 계산서: 재설계 후 매입처(vendorCompany)별 자동 그룹핑 */}
                          <span className="text-[11px] text-purple-600">
                            <span className="font-medium">매입계산서:</span> 매입처별 자동 그룹
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* 제품 소속 품목들 - 매입 정보 입력 */}
                    {product.items.map((item, iIdx) => (
                      <tr key={`product-${pIdx}-item-${iIdx}`} className="bg-emerald-50/30 hover:bg-emerald-50/50 border-b border-gray-100">
                        <td className="pl-6 pr-2 py-1.5">
                          <input
                            type="text"
                            value={item.partNumber || ''}
                            onChange={(e) => handleProductItemChange(pIdx, iIdx, 'partNumber', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                            placeholder="P/N"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <textarea
                            value={item.description || ''}
                            onChange={(e) => {
                              handleProductItemChange(pIdx, iIdx, 'description', e.target.value)
                              e.target.style.height = 'auto'
                              e.target.style.height = e.target.scrollHeight + 'px'
                            }}
                            rows={1}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs resize-none overflow-hidden"
                            style={{ minHeight: '26px' }}
                            placeholder="품목명"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => handleProductItemChange(pIdx, iIdx, 'quantity', parseInt(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                            placeholder="0"
                          />
                        </td>
                        {/* 매출 - 품목에는 없음 */}
                        <td className="px-2 py-1.5 text-xs text-gray-400 text-center">-</td>
                        <td className="px-2 py-1.5 text-xs text-gray-400 text-center border-r-2 border-gray-300">-</td>
                        {/* 매입 - 품목에서 입력 */}
                        <td className="px-2 py-1.5">
                          <VendorAutocomplete
                            value={item.vendorCompany || ''}
                            onChange={(val) => handleProductItemChange(pIdx, iIdx, 'vendorCompany', val)}
                            className="w-full px-2 py-1 border border-purple-200 rounded text-xs bg-purple-50/50"
                            placeholder="매입처"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={formatNumber(item.purchaseUnitPrice || 0)}
                            onChange={(e) => handleProductItemChange(pIdx, iIdx, 'purchaseUnitPrice', parseNumber(e.target.value))}
                            onFocus={(e) => {
                              e.target.value = item.purchaseUnitPrice?.toString() || ''
                              e.target.select()
                            }}
                            onBlur={(e) => {
                              e.target.value = formatNumber(item.purchaseUnitPrice || 0)
                            }}
                            className="w-full px-2 py-1 border border-purple-200 rounded text-xs text-right bg-purple-50/50"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium text-purple-700 text-xs">
                          {calcPurchaseItemTotal(item).toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeProductItem(pIdx, iIdx)}
                            className="p-0.5 text-gray-400 hover:text-red-500 rounded"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* 상세 품목 추가 버튼 행 */}
                    <tr className="bg-emerald-50/20 border-b-2 border-emerald-200">
                      <td colSpan={9} className="pl-6 py-1">
                        <button
                          type="button"
                          onClick={() => addProductItem(pIdx)}
                          className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-2 py-0.5 rounded"
                        >
                          + 상세 품목 추가
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}

                {/* 독립 품목들 (제품에 소속되지 않은 품목) */}
                {standaloneItems.map((item, index) => (
                  <tr key={`standalone-${index}`} className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.partNumber || ''}
                        onChange={(e) => handleStandaloneItemChange(index, 'partNumber', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                        placeholder="P/N"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <textarea
                        value={item.description || ''}
                        onChange={(e) => {
                          handleStandaloneItemChange(index, 'description', e.target.value)
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
                        value={item.quantity || ''}
                        onChange={(e) => handleStandaloneItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    {/* 매출 */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={formatNumber(item.salesUnitPrice || 0)}
                        onChange={(e) => handleStandaloneItemChange(index, 'salesUnitPrice', parseNumber(e.target.value))}
                        onFocus={(e) => {
                          e.target.value = item.salesUnitPrice?.toString() || ''
                          e.target.select()
                        }}
                        onBlur={(e) => {
                          e.target.value = formatNumber(item.salesUnitPrice || 0)
                        }}
                        className="w-full px-2 py-1 border border-blue-200 rounded text-xs text-right bg-blue-50/30"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-blue-700 text-xs border-r-2 border-gray-300">
                      {calcSalesItemTotal(item).toLocaleString()}
                    </td>
                    {/* 매입 */}
                    <td className="px-2 py-2">
                      <VendorAutocomplete
                        value={item.vendorCompany}
                        onChange={(val) => handleStandaloneItemChange(index, 'vendorCompany', val)}
                        className="w-full px-2 py-1 border border-purple-200 rounded text-xs bg-purple-50/30"
                        placeholder="매입처"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={formatNumber(item.purchaseUnitPrice || 0)}
                        onChange={(e) => handleStandaloneItemChange(index, 'purchaseUnitPrice', parseNumber(e.target.value))}
                        onFocus={(e) => {
                          e.target.value = item.purchaseUnitPrice?.toString() || ''
                          e.target.select()
                        }}
                        onBlur={(e) => {
                          e.target.value = formatNumber(item.purchaseUnitPrice || 0)
                        }}
                        className="w-full px-2 py-1 border border-purple-200 rounded text-xs text-right bg-purple-50/30"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-purple-700 text-xs">
                      {calcPurchaseItemTotal(item).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeStandaloneItem(index)}
                        className="p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
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

          {/* 합계 영역 */}
          <div className="bg-gray-50 border-t">
            <div className="px-4 py-3 flex justify-end items-center gap-8">
              <div className="text-right">
                <div className="text-xs text-gray-500">매출합계 (VAT별도)</div>
                <div className="text-lg font-bold text-blue-700">
                  {calcSalesTotal().toLocaleString()}원
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">매입합계 (VAT별도)</div>
                <div className="text-lg font-bold text-purple-700">
                  {calcPurchaseTotal().toLocaleString()}원
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">마진</div>
                <div className={`text-lg font-bold ${calcTotalMargin() >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {calcTotalMargin().toLocaleString()}원
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 기타 정보 (계산서/결제/배송/비고) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden inline-block">
          <table className="text-sm">
            <tbody className="divide-y divide-gray-100">
              {/* 1행: 기타 (비고) */}
              <tr>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap align-top">기타</td>
                <td className="px-1.5 py-1" colSpan={5}>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-none"
                    placeholder="특이사항 입력..."
                  />
                </td>
              </tr>
              {/* 2행: 계산서 발행일, 계산서 발행예정일, 결제일 */}
              <tr className="bg-gray-50/30">
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">계산서 발행일</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <input type="date" value={formData.invoiceDate} onChange={(e) => handleInputChange('invoiceDate', e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">계산서 발행예정일</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <input type="date" value={formData.invoiceDueDate} onChange={(e) => handleInputChange('invoiceDueDate', e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">결제일</td>
                <td className="px-1.5 py-1">
                  <input type="text" value={formData.paymentDate} onChange={(e) => handleInputChange('paymentDate', e.target.value)} className="w-40 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="납품 전 선입금 현금 결제" />
                </td>
              </tr>
              {/* 3행: 계산서 메일 */}
              <tr>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">계산서 메일</td>
                <td className="px-1.5 py-1" colSpan={5}>
                  <input type="email" value={formData.invoiceEmail} onChange={(e) => handleInputChange('invoiceEmail', e.target.value)} className="w-72 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="example@company.com" />
                </td>
              </tr>
              {/* 4행: 배송주소 */}
              <tr className="bg-gray-50/30">
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">배송주소</td>
                <td className="px-1.5 py-1" colSpan={5}>
                  <input type="text" value={formData.deliveryAddress} onChange={(e) => handleInputChange('deliveryAddress', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs" placeholder="배송지 주소" />
                </td>
              </tr>
              {/* 5행: 받으실분/연락처, 배송일 */}
              <tr>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">받으실분/연락처</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="flex gap-1">
                    <input type="text" value={formData.receiverName} onChange={(e) => handleInputChange('receiverName', e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="받으실분" />
                    <input type="text" value={formData.receiverPhone} onChange={(e) => handleInputChange('receiverPhone', e.target.value)} className="w-28 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="010-0000-0000" />
                  </div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">배송일</td>
                <td className="px-1.5 py-1" colSpan={3}>
                  <input type="text" value={formData.deliveryDate} onChange={(e) => handleInputChange('deliveryDate', e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="별도 협의" />
                </td>
              </tr>
            </tbody>
          </table>
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
