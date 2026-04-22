'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import VendorAutocomplete from '@/components/inputs/VendorAutocomplete'

// 품목 (제품 하위)
interface Item {
  salesItemDetailId?: string   // 매출 품목 상세 ID
  purchaseItemId?: string      // 매입 아이템 ID (버전 추적용)
  purchaseDetailId?: string    // 매입 품목 상세 ID (버전 추적용)
  partNumber: string
  description: string
  quantity: number
  salesUnitPrice: number
  purchaseUnitPrice: number
  vendorCompany: string
  taxType: string
  salesInvoiceRequired: boolean
  purchaseInvoiceRequired: boolean
}

// 제품 그룹 (품목들을 묶어서 통합)
interface ProductGroup {
  id: string
  salesItemId?: string     // 기존 매출 아이템 ID (버전 추적용)
  purchaseItemId?: string  // 기존 매입 아이템 ID (버전 추적용)
  name: string
  quantity: number
  salesUnitPrice: number
  purchaseUnitPrice: number
  vendorCompany: string
  category: string
  taxType: string
  salesInvoiceUnit: string
  // 매입 계산서는 재설계(2026-04) 이후 매입처별 자동 그룹핑. purchaseInvoiceUnit 필드 제거됨.
  items: Item[]
}

const CATEGORIES = ['상품', 'MA']

interface ApiItemDetail {
  id?: string
  partNumber?: string
  description?: string
  quantity?: number
  // 매입 품목 디테일 전용 (새 구조)
  salesItemDetailId?: string
  vendorCompany?: string
  unitPrice?: number | string
  totalPrice?: number | string
}

interface ApiItem {
  id?: string              // 아이템 ID (버전 추적용)
  productName?: string
  quantity?: number
  unitPrice?: number | string
  vendorCompany?: string
  isConsolidated?: boolean
  partNumber?: string | null
  details?: ApiItemDetail[]
  // 매입 아이템 전용
  salesItemId?: string       // 연결된 매출 제품 ID
  salesItemDetailId?: string // 연결된 매출 품목 ID (개별 매입 시)
}

function EditSalesApprovalForm() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const isReviseMode = searchParams.get('revise') === 'true'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    approvalCode: '',
    approvalDate: '',
    managerName: '',
    clientCompany: '',
    clientContact: '',
    clientPhone: '',
    endUser: '',
    paymentTerms: '',
    invoiceDate: '',
    invoiceDueDate: '',
    invoiceEmail: '',
    paymentDate: '',
    deliveryAddress: '',
    deliveryDate: '',
    receiverName: '',
    receiverPhone: '',
    notes: '',
  })

  // === 제품 그룹 (제품 + 하위 품목) ===
  const [products, setProducts] = useState<ProductGroup[]>([
    { id: `product-init-${Date.now()}`, name: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', category: '상품', taxType: 'TAX', salesInvoiceUnit: 'PRODUCT', items: [] },
  ])

  // === 독립 품목 (제품에 소속되지 않는 품목) ===
  const [standaloneItems, setStandaloneItems] = useState<Item[]>([])

  // 숫자 포맷팅
  const formatNumber = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
    if (isNaN(num) || num === 0) return ''
    return num.toLocaleString()
  }

  const parseNumber = (value: string): number => {
    const num = parseInt(value.replace(/,/g, ''), 10)
    return isNaN(num) ? 0 : num
  }

  const fetchApproval = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-approvals/${id}`)
      if (res.ok) {
        const data = await res.json()

        // DRAFT 상태가 아니면 상세 페이지로 리다이렉트 (revise 모드 제외)
        if (data.status !== 'DRAFT' && !isReviseMode) {
          router.push(`/sales/approvals/${id}`)
          return
        }

        // revise 모드인데 최신 버전이 아니면 리다이렉트
        if (isReviseMode && data.isLatest === false) {
          alert('이전 버전은 수정할 수 없습니다. 최신 버전에서 수정해주세요.')
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
          invoiceDate: data.invoiceDate ? data.invoiceDate.split('T')[0] : '',
          invoiceDueDate: data.invoiceDueDate ? data.invoiceDueDate.split('T')[0] : '',
          invoiceEmail: data.invoiceEmail || '',
          paymentDate: data.paymentDate || '',
          deliveryAddress: data.deliveryAddress || '',
          deliveryDate: data.deliveryDate || '',
          receiverName: data.receiverName || '',
          receiverPhone: data.receiverPhone || '',
          notes: data.notes || '',
        })

        // 데이터 변환: API 응답 → ProductGroup 구조
        const salesItems: ApiItem[] = data.items || []
        const purchaseItems: ApiItem[] = data.purchaseItems || []

        if (salesItems.length > 0) {
          // 통합 매입용: salesItemId로 그룹핑
          const consolidatedPurchaseByItemId = new Map<string, ApiItem>()
          // 개별 매입용: salesItemDetailId로 맵핑 (purchaseItem 레벨에서)
          const individualPurchaseByDetailId = new Map<string, ApiItem>()
          // 매입 Detail ID 맵: salesItemDetailId → purchaseDetailId
          const purchaseDetailIdMap = new Map<string, string>()

          purchaseItems.forEach(pi => {
            if (pi.isConsolidated && pi.salesItemId) {
              // 통합 매입: salesItemId로 맵핑
              consolidatedPurchaseByItemId.set(pi.salesItemId, pi)
              // 통합 매입의 details도 맵에 추가
              pi.details?.forEach(pd => {
                if (pd.salesItemDetailId && pd.id) {
                  purchaseDetailIdMap.set(pd.salesItemDetailId, pd.id)
                }
              })
            } else if (!pi.isConsolidated && pi.salesItemDetailId) {
              // 개별 매입: salesItemDetailId로 맵핑 (purchaseItem 레벨)
              individualPurchaseByDetailId.set(pi.salesItemDetailId, pi)
              // 개별 매입의 첫 번째 detail ID 저장
              const firstDetail = pi.details?.[0]
              if (firstDetail?.id) {
                purchaseDetailIdMap.set(pi.salesItemDetailId, firstDetail.id)
              }
            }
          })

          // 각 salesItem을 제품으로 변환
          const loadedProducts: ProductGroup[] = salesItems.map((salesItem, idx) => {
            // 통합 매입 찾기
            const productPurchase = salesItem.id ? consolidatedPurchaseByItemId.get(salesItem.id) : undefined

            // details를 하위 품목으로 변환
            const itemDetails: Item[] = (salesItem.details || []).map((detail) => {
              // 개별 매입 찾기 (detail.id로 purchaseItem 찾기)
              const individualPurchase = detail.id ? individualPurchaseByDetailId.get(detail.id) : undefined
              // 개별 매입이 있으면 그거 사용, 없으면 통합 매입 사용
              const effectivePurchase = individualPurchase || productPurchase
              // 매입 Detail ID 찾기
              const purchaseDetailId = detail.id ? purchaseDetailIdMap.get(detail.id) : undefined

              const purchaseUnitPrice = Number(effectivePurchase?.unitPrice) || 0
              const purchaseVendor = effectivePurchase?.vendorCompany || ''

              return {
                salesItemDetailId: detail.id,
                purchaseItemId: effectivePurchase?.id,
                purchaseDetailId,
                partNumber: detail.partNumber || '',
                description: detail.description || '',
                quantity: detail.quantity || 1,
                salesUnitPrice: 0,
                purchaseUnitPrice,
                vendorCompany: purchaseVendor,
                taxType: 'TAX',
                salesInvoiceRequired: true,
                purchaseInvoiceRequired: true,
              }
            })

            return {
              id: `product-${idx}-${Date.now()}`,
              salesItemId: salesItem.id,
              purchaseItemId: productPurchase?.id,
              name: salesItem.productName || '',
              quantity: salesItem.quantity || 1,
              salesUnitPrice: Number(salesItem.unitPrice) || 0,
              purchaseUnitPrice: Number(productPurchase?.unitPrice) || 0,
              vendorCompany: productPurchase?.vendorCompany || '',
              category: '상품',
              taxType: 'TAX',
              salesInvoiceUnit: 'PRODUCT',
              items: itemDetails,
            }
          })

          setProducts(loadedProducts.length > 0 ? loadedProducts : [
            { id: `product-${Date.now()}`, name: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', category: '상품', taxType: 'TAX', salesInvoiceUnit: 'PRODUCT', items: [] }
          ])
        }
        setStandaloneItems([])
      } else {
        router.push('/sales/approvals')
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push('/sales/approvals')
    } finally {
      setLoading(false)
    }
  }, [id, router, isReviseMode])

  useEffect(() => {
    fetchApproval()
  }, [fetchApproval])

  // textarea 높이 자동 조절
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea')
      textareas.forEach((textarea) => {
        textarea.style.height = 'auto'
        textarea.style.height = textarea.scrollHeight + 'px'
      })
    }, 50)
    return () => clearTimeout(timer)
  }, [products, standaloneItems])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // === 제품 관리 ===
  const addProduct = () => {
    setProducts([...products, {
      id: `product-${Date.now()}`,
      name: '',
      quantity: 1,
      salesUnitPrice: 0,
      purchaseUnitPrice: 0,
      vendorCompany: '',
      category: '상품',
      taxType: 'TAX',
      salesInvoiceUnit: 'PRODUCT',
      items: [],
    }])
  }

  const removeProduct = (pIdx: number) => {
    setProducts(products.filter((_, i) => i !== pIdx))
  }

  const handleProductChange = (pIdx: number, field: keyof ProductGroup, value: string | number | boolean) => {
    setProducts(prev => {
      const newProducts = [...prev]
      newProducts[pIdx] = { ...newProducts[pIdx], [field]: value }
      return newProducts
    })
  }

  // 제품 내 품목 관리
  const addProductItem = (pIdx: number) => {
    setProducts(prev => {
      const newProducts = [...prev]
      newProducts[pIdx] = {
        ...newProducts[pIdx],
        items: [...newProducts[pIdx].items, { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', taxType: 'TAX', salesInvoiceRequired: true, purchaseInvoiceRequired: true }],
      }
      return newProducts
    })
  }

  const removeProductItem = (pIdx: number, iIdx: number) => {
    setProducts(prev => {
      const newProducts = [...prev]
      newProducts[pIdx] = {
        ...newProducts[pIdx],
        items: newProducts[pIdx].items.filter((_, i) => i !== iIdx),
      }
      return newProducts
    })
  }

  const handleProductItemChange = (pIdx: number, iIdx: number, field: keyof Item, value: string | number | boolean) => {
    setProducts(prev => {
      const newProducts = [...prev]
      const newItems = [...newProducts[pIdx].items]
      newItems[iIdx] = { ...newItems[iIdx], [field]: value }
      newProducts[pIdx] = { ...newProducts[pIdx], items: newItems }
      return newProducts
    })
  }

  // === 독립 품목 관리 ===
  const addStandaloneItem = () => {
    setStandaloneItems([...standaloneItems, { partNumber: '', description: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', taxType: 'TAX', salesInvoiceRequired: true, purchaseInvoiceRequired: true }])
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
    const productsTotal = products.reduce((sum, p) => sum + calcProductSalesTotal(p), 0)
    const standaloneTotal = standaloneItems.reduce((sum, item) => sum + calcSalesItemTotal(item), 0)
    return productsTotal + standaloneTotal
  }

  const calcPurchaseTotal = () => {
    const productLevelTotal = products.reduce((sum, p) => sum + (p.purchaseUnitPrice || 0) * (p.quantity || 1), 0)
    const productItemsTotal = products.reduce((sum, p) => sum + p.items.reduce((itemSum, item) => itemSum + calcPurchaseItemTotal(item), 0), 0)
    const standaloneTotal = standaloneItems.reduce((sum, item) => sum + calcPurchaseItemTotal(item), 0)
    return productLevelTotal + productItemsTotal + standaloneTotal
  }

  const calcTotalMargin = () => calcSalesTotal() - calcPurchaseTotal()

  // 엑셀 업로드
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

        setFormData(prev => ({
          ...prev,
          approvalCode: data.approvalCode || prev.approvalCode,
          approvalDate: data.approvalDate || prev.approvalDate,
          managerName: data.managerName || '',
          clientCompany: data.clientCompany || '',
          clientContact: data.clientContact || '',
          clientPhone: data.clientPhone || '',
          endUser: data.endUser || '',
          paymentTerms: data.paymentTerms || '',
          invoiceDate: data.invoiceDate || '',
          invoiceDueDate: data.invoiceDueDate || '',
          invoiceEmail: data.invoiceEmail || '',
          paymentDate: data.paymentDate || '',
          deliveryAddress: data.deliveryAddress || '',
          deliveryDate: data.deliveryDate || '',
          receiverName: data.receiverName || '',
          receiverPhone: data.receiverPhone || '',
          notes: data.notes || '',
        }))

        if (data.products && data.products.length > 0) {
          interface UploadedProduct {
            id: string
            name: string
            quantity: number
            salesUnitPrice: number
            purchaseUnitPrice?: number
            vendorCompany?: string
            items: {
              partNumber: string
              description: string
              quantity: number
              purchaseUnitPrice: number
              vendorCompany: string
            }[]
          }

          const newProducts: ProductGroup[] = data.products.map((p: UploadedProduct) => ({
            id: p.id || `product-${Date.now()}-${Math.random()}`,
            name: p.name || '',
            quantity: p.quantity || 1,
            salesUnitPrice: p.salesUnitPrice || 0,
            purchaseUnitPrice: p.purchaseUnitPrice || 0,
            vendorCompany: p.vendorCompany || '',
            category: '상품',
            taxType: 'TAX',
            salesInvoiceUnit: 'PRODUCT',
            items: (p.items || []).map((item) => ({
              partNumber: item.partNumber || '',
              description: item.description || '',
              quantity: item.quantity || 1,
              salesUnitPrice: 0,
              purchaseUnitPrice: item.purchaseUnitPrice || 0,
              vendorCompany: item.vendorCompany || '',
              taxType: 'TAX',
              salesInvoiceRequired: true,
              purchaseInvoiceRequired: true,
            })),
          }))

          setProducts(newProducts.length > 0 ? newProducts : [
            { id: `product-${Date.now()}`, name: '', quantity: 1, salesUnitPrice: 0, purchaseUnitPrice: 0, vendorCompany: '', category: '상품', taxType: 'TAX', salesInvoiceUnit: 'PRODUCT', items: [] }
          ])
          setStandaloneItems(data.standaloneItems || [])
        }
      }
    } catch (err) {
      console.error('엑셀 업로드 실패:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // products를 API가 기대하는 items/purchaseItems 형식으로 변환
      const salesItemsPayload = [
        // 제품들 → 매출 아이템
        ...products.map((product, pIdx) => ({
          sourceItemId: product.salesItemId,  // 기존 아이템 ID (버전 추적용)
          productName: product.name || '제품',
          quantity: product.quantity || 1,
          unitPrice: product.salesUnitPrice || 0,
          isConsolidated: product.items.length > 0,
          partNumber: product.items.length === 0 ? null : null,
          sortOrder: pIdx,
          details: product.items.map((item, iIdx) => ({
            partNumber: item.partNumber || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            sortOrder: iIdx,
          })),
        })),
        // 독립 품목들 → 매출 아이템
        ...standaloneItems
          .filter(item => item.partNumber?.trim() || item.description?.trim() || item.salesUnitPrice > 0)
          .map((item, idx) => ({
            productName: item.description || item.partNumber || '품목',
            quantity: item.quantity || 1,
            unitPrice: item.salesUnitPrice || 0,
            isConsolidated: false,
            partNumber: item.partNumber || null,
            sortOrder: products.length + idx,
            details: [{
              partNumber: item.partNumber || '',
              description: item.description || '',
              quantity: item.quantity || 1,
              sortOrder: 0,
            }],
          })),
      ]

      // 매입 아이템 구조:
      // - 통합 매입: 아이템 1개 + 디테일 N개
      // - 개별 매입: 아이템 N개 + 디테일 각 1개
      const purchaseItemsPayload: {
        sourceItemId?: string
        salesItemIndex?: number
        salesItemDetailIndex?: number  // 개별 매입 시 매출 품목 인덱스
        productName: string
        quantity: number
        unitPrice: number
        vendorCompany: string
        isConsolidated: boolean
        sortOrder: number
        details: {
          sourceDetailId?: string  // 버전 추적용
          partNumber: string
          description: string
          quantity: number
          sortOrder: number
        }[]
      }[] = []

      let purchaseSortOrder = 0

      products.forEach((product, pIdx) => {
        if (product.items.length > 0) {
          // 하위 품목이 있는 경우
          const hasProductLevelPurchase = product.purchaseUnitPrice > 0 || product.vendorCompany
          const itemsWithPurchase = product.items.filter(item =>
            item.purchaseUnitPrice > 0 || item.vendorCompany
          )

          if (hasProductLevelPurchase) {
            // 통합 매입: 아이템 1개 + 디테일 N개
            purchaseItemsPayload.push({
              sourceItemId: product.purchaseItemId,
              salesItemIndex: pIdx,
              productName: product.name || '제품',
              quantity: product.quantity || 1,
              unitPrice: product.purchaseUnitPrice || 0,
              vendorCompany: product.vendorCompany || '',
              isConsolidated: true,
              sortOrder: purchaseSortOrder++,
              details: product.items.map((item, iIdx) => ({
                sourceDetailId: item.purchaseDetailId,  // 버전 추적용
                partNumber: item.partNumber || '',
                description: item.description || '',
                quantity: item.quantity || 1,
                sortOrder: iIdx,
              })),
            })
          } else if (itemsWithPurchase.length > 0) {
            // 개별 매입: 아이템 N개 + 디테일 각 1개
            product.items.forEach((item, iIdx) => {
              if (item.purchaseUnitPrice > 0 || item.vendorCompany) {
                purchaseItemsPayload.push({
                  salesItemIndex: pIdx,
                  salesItemDetailIndex: iIdx,  // 매출 품목 인덱스
                  productName: item.description || item.partNumber || '품목',
                  quantity: item.quantity || 1,
                  unitPrice: item.purchaseUnitPrice || 0,
                  vendorCompany: item.vendorCompany || '',
                  isConsolidated: false,
                  sortOrder: purchaseSortOrder++,
                  details: [{
                    sourceDetailId: item.purchaseDetailId,  // 버전 추적용
                    partNumber: item.partNumber || '',
                    description: item.description || '',
                    quantity: item.quantity || 1,
                    sortOrder: 0,
                  }],
                })
              }
            })
          }
        } else {
          // 하위 품목이 없는 경우: 제품 레벨로 통합 매입
          if (product.purchaseUnitPrice > 0 || product.vendorCompany) {
            purchaseItemsPayload.push({
              sourceItemId: product.purchaseItemId,
              salesItemIndex: pIdx,
              productName: product.name || '제품',
              quantity: product.quantity || 1,
              unitPrice: product.purchaseUnitPrice || 0,
              vendorCompany: product.vendorCompany || '',
              isConsolidated: true,
              sortOrder: purchaseSortOrder++,
              details: [],
            })
          }
        }
      })

      // 독립 품목들 → 매입 아이템 (통합 취급)
      standaloneItems
        .filter(item => item.partNumber?.trim() || item.description?.trim() || item.purchaseUnitPrice > 0)
        .forEach((item, idx) => {
          if (item.purchaseUnitPrice > 0 || item.vendorCompany) {
            purchaseItemsPayload.push({
              salesItemIndex: products.length + idx,  // 독립 품목은 제품 다음 인덱스
              productName: item.description || item.partNumber || '품목',
              quantity: item.quantity || 1,
              unitPrice: item.purchaseUnitPrice || 0,
              vendorCompany: item.vendorCompany || '',
              isConsolidated: true,  // 독립 품목은 통합 취급
              sortOrder: purchaseSortOrder++,
              details: [{
                partNumber: item.partNumber || '',
                description: item.description || '',
                quantity: item.quantity || 1,
                sortOrder: 0,
              }],
            })
          }
        })

      const payload = {
        ...formData,
        items: salesItemsPayload,
        purchaseItems: purchaseItemsPayload,
      }

      let res: Response
      if (isReviseMode) {
        res = await fetch(`/api/sales-approvals/${id}/revise`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/sales-approvals/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        const data = await res.json()
        router.push(`/sales/approvals/${isReviseMode ? data.id : id}`)
      } else {
        const data = await res.json()
        alert(data.error || (isReviseMode ? '새 버전 생성에 실패했습니다' : '수정에 실패했습니다'))
      }
    } catch {
      alert(isReviseMode ? '새 버전 생성에 실패했습니다' : '수정에 실패했습니다')
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
      <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-gray-900">
              {isReviseMode ? '품의서 새 버전 작성' : '품의서 수정'}
            </h1>
            {isReviseMode && (
              <p className="text-sm text-orange-600 mt-1">저장 시 새 버전이 생성됩니다 (서명 정보 초기화)</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
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
        {/* 기본 정보 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden inline-block">
          <table className="text-sm">
            <tbody className="divide-y divide-gray-100">
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

        {/* 품목 (제품 + 품목 통합 테이블) */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">품목</h3>
            <div className="flex items-center gap-2">
              <button type="button" onClick={addProduct} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">
                + 제품 추가
              </button>
              <button type="button" onClick={addStandaloneItem} className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900">
                + 품목 추가
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-24">P/N</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">품목</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16">수량</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-blue-600 w-24">매출단가</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-blue-600 w-28 border-r-2 border-gray-300">매출합계</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-purple-600 w-28">매입처</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-purple-600 w-24">매입단가</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-purple-600 w-28">매입합계</th>
                  <th className="px-2 py-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, pIdx) => (
                  <React.Fragment key={product.id || `product-${pIdx}`}>
                    {/* 제품 행 */}
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
                          placeholder="제품명"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={product.quantity || ''}
                          onChange={(e) => handleProductChange(pIdx, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={formatNumber(product.salesUnitPrice || 0)}
                          onChange={(e) => handleProductChange(pIdx, 'salesUnitPrice', parseNumber(e.target.value))}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-xs text-right bg-blue-50"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-blue-700 text-xs border-r-2 border-gray-300">
                        {calcProductSalesTotal(product).toLocaleString()}
                      </td>
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
                          className="w-full px-2 py-1 border border-purple-200 rounded text-xs text-right bg-purple-50/50"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-purple-700 text-xs">
                        {((product.purchaseUnitPrice || 0) * (product.quantity || 1)).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button type="button" onClick={() => removeProduct(pIdx)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded">
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
                          <label className="flex items-center gap-1 text-gray-600">
                            <span className="font-medium">분류:</span>
                            <select value={product.category || '상품'} onChange={(e) => handleProductChange(pIdx, 'category', e.target.value)} className="px-1.5 py-0.5 border border-gray-300 rounded text-[11px] bg-white">
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </label>
                          <span className="text-[11px] text-purple-600">
                            <span className="font-medium">매입계산서:</span> 매입처별 자동 그룹
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* 제품 소속 품목들 */}
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
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-xs text-gray-400 text-center">-</td>
                        <td className="px-2 py-1.5 text-xs text-gray-400 text-center border-r-2 border-gray-300">-</td>
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
                            className="w-full px-2 py-1 border border-purple-200 rounded text-xs text-right bg-purple-50/50"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium text-purple-700 text-xs">
                          {calcPurchaseItemTotal(item).toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button type="button" onClick={() => removeProductItem(pIdx, iIdx)} className="p-0.5 text-gray-400 hover:text-red-500 rounded">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* 상세 품목 추가 버튼 */}
                    <tr className="bg-emerald-50/20 border-b-2 border-emerald-200">
                      <td colSpan={9} className="pl-6 py-1">
                        <button type="button" onClick={() => addProductItem(pIdx)} className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-2 py-0.5 rounded">
                          + 상세 품목 추가
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}

                {/* 독립 품목들 */}
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
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={formatNumber(item.salesUnitPrice || 0)}
                        onChange={(e) => handleStandaloneItemChange(index, 'salesUnitPrice', parseNumber(e.target.value))}
                        className="w-full px-2 py-1 border border-blue-200 rounded text-xs text-right bg-blue-50/30"
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-blue-700 text-xs border-r-2 border-gray-300">
                      {calcSalesItemTotal(item).toLocaleString()}
                    </td>
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
                        className="w-full px-2 py-1 border border-purple-200 rounded text-xs text-right bg-purple-50/30"
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-purple-700 text-xs">
                      {calcPurchaseItemTotal(item).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => removeStandaloneItem(index)} className="p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded">
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
                <div className="text-lg font-bold text-blue-700">{calcSalesTotal().toLocaleString()}원</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">매입합계 (VAT별도)</div>
                <div className="text-lg font-bold text-purple-700">{calcPurchaseTotal().toLocaleString()}원</div>
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

        {/* 기타 정보 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden inline-block">
          <table className="text-sm">
            <tbody className="divide-y divide-gray-100">
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
              <tr>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">계산서 메일</td>
                <td className="px-1.5 py-1" colSpan={5}>
                  <input type="email" value={formData.invoiceEmail} onChange={(e) => handleInputChange('invoiceEmail', e.target.value)} className="w-72 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="example@company.com" />
                </td>
              </tr>
              <tr className="bg-gray-50/30">
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">배송주소</td>
                <td className="px-1.5 py-1" colSpan={5}>
                  <input type="text" value={formData.deliveryAddress} onChange={(e) => handleInputChange('deliveryAddress', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs" placeholder="배송지 주소" />
                </td>
              </tr>
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
            href={`/sales/approvals/${id}`}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-3 text-white rounded-lg disabled:opacity-50 ${
              isReviseMode
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving
              ? (isReviseMode ? '생성 중...' : '저장 중...')
              : (isReviseMode ? '새 버전 생성' : '저장')
            }
          </button>
        </div>
      </form>
    </div>
  )
}

export default function EditSalesApprovalPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    }>
      <EditSalesApprovalForm />
    </Suspense>
  )
}
