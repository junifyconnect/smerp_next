'use client'

import { UilEdit, UilFileAlt, UilPlus, UilSearch, UilTrashAlt } from '@iconscout/react-unicons'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CustomerSelectModal } from './CustomerSelectModal'
import { DocumentFormTemplate } from './DocumentFormTemplate'

interface DocumentItem {
  id?: string
  partNumber?: string
  description?: string
  quantity: number
  srpPrice?: number
  unitPrice?: number
  totalPrice?: number
}

// 제품 그룹 (품목들을 묶어서 통합 견적)
interface ProductGroup {
  id: string
  name: string
  quantity: number
  srpPrice?: number
  unitPrice?: number
  totalPrice?: number
  items: DocumentItem[] // 참고용 상세 내역
}

interface DocumentFormProps {
  docType: 'SALES_QUOTE' | 'SALES_APPROVAL' | 'SALES_ORDER' | 'MA_QUOTE' | 'MA_APPROVAL'
  basePath: string
  title: string
  documentId?: string // 수정 모드일 때 문서 ID
}

const apiPathMap: Record<string, string> = {
  SALES_QUOTE: '/api/sales-quotes',
  SALES_APPROVAL: '/api/sales-approvals',
  SALES_ORDER: '/api/sales-orders',
  MA_QUOTE: '/api/ma-quotes',
  MA_APPROVAL: '/api/ma-approvals',
}

export function DocumentForm({ docType, basePath, title, documentId }: DocumentFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!!documentId)
  const [mode, setMode] = useState<'web' | 'template'>('web')

  // 엑셀 업로드 관련
  const excelInputRef = useRef<HTMLInputElement>(null)
  const [parsingExcel, setParsingExcel] = useState(false)

  // 거래처 선택 모달 상태
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  // 오늘 날짜를 YYYY.MM.DD 형식으로 가져오기
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}.${month}.${day}`
  }

  const [formData, setFormData] = useState({
    title: '',
    projectName: '',
    clientCompany: '',
    clientContact: '',
    clientPhone: '',
    clientFax: '',
    clientCP: '',
    clientEmail: '',
    // Sales 품의서용 한 줄 필드 (매출처/담당/연락처)
    salesContactLine: '',
    vendorCompany: '',
    vendorContact: '',
    vendorPhone: '',
    vendorEmail: '',
    quoteDate: getTodayDate(),
    deliveryDate: '',
    validUntil: '',
    paymentTerms: '',
    managerName: '',
    managerPhone: '',
    notes: '',
  })

  // 세션 로드 시 견적담당 기본값 설정 (신규 작성 시에만)
  useEffect(() => {
    if (!documentId && session?.user?.name && !formData.managerName) {
      setFormData(prev => ({ ...prev, managerName: session.user.name || '' }))
    }
  }, [session, documentId, formData.managerName])

  // 제품 그룹 목록 (기본값: 빈 제품 1개)
  const [products, setProducts] = useState<ProductGroup[]>([
    { id: `product-init-${Date.now()}`, name: '', quantity: 1, srpPrice: 0, unitPrice: 0, items: [] },
  ])

  // 독립 품목 (제품에 소속되지 않는 품목) - 기본값 없음
  const [standaloneItems, setStandaloneItems] = useState<DocumentItem[]>([])

  // 레거시: 기존 flat items (하위 호환용)
  const [items, setItems] = useState<DocumentItem[]>([
    { partNumber: '', description: '', quantity: 1, srpPrice: 0, unitPrice: 0, totalPrice: 0 },
  ])

  // 통합 견적 상태 (레거시 - 전체 통합용)
  const [isConsolidated, setIsConsolidated] = useState(false)
  const [consolidatedName, setConsolidatedName] = useState('')
  const [consolidatedPrice, setConsolidatedPrice] = useState<number | ''>(0)

  // 납기일 별도 협의 상태
  const [isDeliveryTBD, setIsDeliveryTBD] = useState(false)

  // 항상 새 구조 사용 (제품 + 품목)
  const useNewStructure = true

  // 수정 모드일 때 기존 데이터 로드
  const fetchDocument = useCallback(async () => {
    if (!documentId) return

    setFetching(true)
    try {
      const apiPath = apiPathMap[docType]
      const res = await fetch(`${apiPath}/${documentId}`)
      if (res.ok) {
        const data = await res.json()

        // 폼 데이터 설정
        setFormData({
          title: data.title || '',
          projectName: data.projectName || '',
          clientCompany: data.clientCompany || '',
          clientContact: data.clientContact || '',
          clientPhone: data.clientPhone || '',
          clientFax: data.clientFax || '',
          clientCP: data.clientMobile || '',
          clientEmail: data.clientEmail || '',
          salesContactLine: '',
          vendorCompany: data.vendorCompany || '',
          vendorContact: data.vendorContact || '',
          vendorPhone: data.vendorPhone || '',
          vendorEmail: data.vendorEmail || '',
          quoteDate: data.quoteDate ? new Date(data.quoteDate).toISOString().split('T')[0].replace(/-/g, '.') : getTodayDate(),
          deliveryDate: data.deliveryDate === '별도협의' ? '' : (data.deliveryDate ? new Date(data.deliveryDate).toISOString().split('T')[0].replace(/-/g, '.') : ''),
          validUntil: data.validUntil || '',
          paymentTerms: data.paymentTerms || '',
          managerName: data.managerName || '',
          managerPhone: '',
          notes: data.notes || '',
        })

        // 새 구조: 제품 그룹 로드
        if (data.products && data.products.length > 0) {
          setProducts(data.products.map((product: any) => ({
            id: product.id,
            name: product.name || '',
            quantity: product.quantity || 1,
            srpPrice: product.srpPrice || 0,
            unitPrice: product.unitPrice || product.consolidatedPrice || 0, // consolidatedPrice fallback
            totalPrice: product.totalPrice || product.consolidatedPrice || 0,
            items: (product.items || []).map((item: any) => ({
              id: item.id,
              partNumber: item.partNumber || '',
              description: item.description || '',
              quantity: item.quantity || 1,
              srpPrice: item.srpPrice || 0,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || 0,
            })),
          })))
        }

        // 독립 품목 설정 (items 중 productId가 null인 것들)
        if (data.items && data.items.length > 0) {
          const standalone = data.items.filter((item: any) => !item.productId)
          if (standalone.length > 0) {
            setStandaloneItems(standalone.map((item: any) => ({
              id: item.id,
              partNumber: item.partNumber || '',
              description: item.description || '',
              quantity: item.quantity || 1,
              srpPrice: item.srpPrice || 0,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || 0,
            })))
          }

          // 레거시: 모든 items (하위 호환용)
          setItems(data.items.map((item: any) => ({
            id: item.id,
            partNumber: item.partNumber || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            srpPrice: item.srpPrice || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
          })))
        }

        // 통합 견적 설정 (레거시)
        if (data.isConsolidated) {
          setIsConsolidated(true)
          setConsolidatedName(data.consolidatedName || '')
          setConsolidatedPrice(data.consolidatedPrice || 0)
        }

        // 납기일이 null이면 별도협의로 설정
        if (!data.deliveryDate) {
          setIsDeliveryTBD(true)
        }

        // DRAFT 상태가 아니면 수정 불가
        if (data.status !== 'DRAFT') {
          alert('작성중 상태의 문서만 수정할 수 있습니다.')
          router.push(`${basePath}/${documentId}`)
        }
      } else {
        router.push(basePath)
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push(basePath)
    } finally {
      setFetching(false)
    }
  }, [documentId, docType, basePath, router])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

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

  // 거래처 모달에서 선택 시 폼 자동 채우기
  const handleCustomerSelect = (data: {
    companyName: string
    contactName: string
    phone: string
    fax: string
    mobile: string
    email: string
  }) => {
    setFormData(prev => ({
      ...prev,
      clientCompany: data.companyName,
      clientContact: data.contactName,
      clientPhone: data.phone,
      clientFax: data.fax,
      clientCP: data.mobile,
      clientEmail: data.email,
    }))
  }

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value: string): string => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '')

    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 7) {
      // 02-1234 또는 010-1234 형식
      if (numbers.startsWith('02')) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2)}`
      } else {
        return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
      }
    } else if (numbers.length <= 10) {
      // 02-1234-5678 형식
      if (numbers.startsWith('02')) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`
      } else {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
      }
    } else {
      // 010-1234-5678 형식 (11자리)
      if (numbers.startsWith('02')) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`
      } else {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
      }
    }
  }

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

  // 날짜 포맷팅 함수 (20260107 -> 2026.01.07)
  const formatDate = (value: string): string => {
    // 숫자만 추출 (최대 8자리)
    const numbers = value.replace(/[^\d]/g, '').slice(0, 8)

    if (numbers.length <= 4) {
      return numbers
    } else if (numbers.length <= 6) {
      // YYYY.MM 형식
      return `${numbers.slice(0, 4)}.${numbers.slice(4)}`
    } else if (numbers.length <= 8) {
      // YYYY.MM.DD 형식
      return `${numbers.slice(0, 4)}.${numbers.slice(4, 6)}.${numbers.slice(6, 8)}`
    } else {
      // 8자리까지만
      return `${numbers.slice(0, 4)}.${numbers.slice(4, 6)}.${numbers.slice(6, 8)}`
    }
  }

  const handleInputChange = (field: string, value: string) => {
    // 전화번호 필드는 포맷팅 적용
    if (field === 'clientPhone' || field === 'clientFax' || field === 'clientCP' || field === 'managerPhone') {
      const formatted = formatPhoneNumber(value)
      setFormData((prev) => ({ ...prev, [field]: formatted }))
    } else if (field === 'quoteDate') {
      // 견적일 필드는 날짜 포맷팅 적용
      // 숫자만 추출 (최대 8자리)
      const numbers = value.replace(/[^\d]/g, '').slice(0, 8)

      if (numbers.length === 0) {
        setFormData((prev) => ({ ...prev, [field]: '' }))
      } else if (numbers.length === 8) {
        // 8자리 완성 시 YYYY.MM.DD 형식으로 포맷팅
        const year = numbers.slice(0, 4)
        const month = numbers.slice(4, 6)
        const day = numbers.slice(6, 8)
        // 유효한 날짜인지 확인
        if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
          setFormData((prev) => ({ ...prev, [field]: `${year}.${month}.${day}` }))
        } else {
          // 유효하지 않아도 포맷팅은 적용
          setFormData((prev) => ({ ...prev, [field]: `${year}.${month}.${day}` }))
        }
      } else {
        // 입력 중이면 포맷팅 적용
        const formatted = formatDate(value)
        setFormData((prev) => ({ ...prev, [field]: formatted }))
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleItemChange = (index: number, field: keyof DocumentItem, value: string | number) => {
    setItems((prev) => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }

      // 금액 자동 계산
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? Number(value) : newItems[index].quantity
        const unitPrice = field === 'unitPrice' ? Number(value) : newItems[index].unitPrice || 0
        newItems[index].totalPrice = quantity * unitPrice
      }

      return newItems
    })
  }

  const addItem = () => {
    setItems([...items, { partNumber: '', description: '', quantity: 1, srpPrice: 0, unitPrice: 0, totalPrice: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // 제품 추가
  const addProduct = () => {
    const newProduct: ProductGroup = {
      id: `temp-${Date.now()}`,
      name: '',
      quantity: 1,
      srpPrice: 0,
      unitPrice: 0,
      totalPrice: 0,
      items: [], // 참고용 상세 내역 (선택)
    }
    setProducts([...products, newProduct])
  }

  // 제품 삭제
  const removeProduct = (productIndex: number) => {
    setProducts(products.filter((_, i) => i !== productIndex))
  }

  // 제품 필드 변경
  const handleProductChange = (productIndex: number, field: keyof ProductGroup, value: string | number) => {
    setProducts(prev => {
      const newProducts = [...prev]
      newProducts[productIndex] = { ...newProducts[productIndex], [field]: value }

      // 금액 자동 계산
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? Number(value) : newProducts[productIndex].quantity
        const unitPrice = field === 'unitPrice' ? Number(value) : newProducts[productIndex].unitPrice || 0
        newProducts[productIndex].totalPrice = quantity * unitPrice
      }

      return newProducts
    })
  }

  // 제품 내 품목 변경
  const handleProductItemChange = (productIndex: number, itemIndex: number, field: keyof DocumentItem, value: string | number) => {
    setProducts(prev => {
      const newProducts = [...prev]
      const newItems = [...newProducts[productIndex].items]
      newItems[itemIndex] = { ...newItems[itemIndex], [field]: value }

      // 금액 자동 계산
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? Number(value) : newItems[itemIndex].quantity
        const unitPrice = field === 'unitPrice' ? Number(value) : newItems[itemIndex].unitPrice || 0
        newItems[itemIndex].totalPrice = quantity * unitPrice
      }

      newProducts[productIndex] = { ...newProducts[productIndex], items: newItems }
      return newProducts
    })
  }

  // 제품 내 품목 추가
  const addProductItem = (productIndex: number) => {
    setProducts(prev => {
      const newProducts = [...prev]
      newProducts[productIndex] = {
        ...newProducts[productIndex],
        items: [...newProducts[productIndex].items, { partNumber: '', description: '', quantity: 1, srpPrice: 0, unitPrice: 0, totalPrice: 0 }],
      }
      return newProducts
    })
  }

  // 제품 내 품목 삭제
  const removeProductItem = (productIndex: number, itemIndex: number) => {
    setProducts(prev => {
      const newProducts = [...prev]
      if (newProducts[productIndex].items.length > 1) {
        newProducts[productIndex] = {
          ...newProducts[productIndex],
          items: newProducts[productIndex].items.filter((_, i) => i !== itemIndex),
        }
      }
      return newProducts
    })
  }

  // 독립 품목 변경
  const handleStandaloneItemChange = (index: number, field: keyof DocumentItem, value: string | number) => {
    setStandaloneItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }

      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? Number(value) : newItems[index].quantity
        const unitPrice = field === 'unitPrice' ? Number(value) : newItems[index].unitPrice || 0
        newItems[index].totalPrice = quantity * unitPrice
      }

      return newItems
    })
  }

  // 독립 품목 추가
  const addStandaloneItem = () => {
    setStandaloneItems([...standaloneItems, { partNumber: '', description: '', quantity: 1, srpPrice: 0, unitPrice: 0, totalPrice: 0 }])
  }

  // 독립 품목 삭제 (항상 삭제 가능)
  const removeStandaloneItem = (index: number) => {
    setStandaloneItems(standaloneItems.filter((_, i) => i !== index))
  }

  const calculateTotal = () => {
    if (useNewStructure) {
      // 새 구조: 제품별 합계 + 독립 품목 합계
      let total = 0

      // 제품별 합계 (제품의 totalPrice 사용)
      for (const product of products) {
        total += product.totalPrice || 0
      }

      // 독립 품목 합계
      total += standaloneItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

      const vat = Math.round(total * 0.1)
      return { total, vat, totalWithVat: total + vat }
    } else {
      // 레거시: 통합 견적일 경우 통합 금액 사용
      const total = isConsolidated
        ? (typeof consolidatedPrice === 'number' ? consolidatedPrice : 0)
        : items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
      const vat = Math.round(total * 0.1)
      return { total, vat, totalWithVat: total + vat }
    }
  }

  // 엑셀 파일 파싱 핸들러
  const handleExcelParse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParsingExcel(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('file', file)

      const res = await fetch('/api/sales-quotes/parse', {
        method: 'POST',
        body: formDataToSend,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '파싱에 실패했습니다')
      }

      const parsed = await res.json()

      // 파싱된 데이터로 폼 채우기
      setFormData(prev => ({
        ...prev,
        projectName: parsed.projectName || prev.projectName,
        managerName: parsed.managerName || prev.managerName,
        clientCompany: parsed.clientCompany || prev.clientCompany,
        clientContact: parsed.clientContact || prev.clientContact,
        clientPhone: parsed.clientPhone || prev.clientPhone,
        clientFax: parsed.clientFax || prev.clientFax,
        clientCP: parsed.clientMobile || prev.clientCP,
        clientEmail: parsed.clientEmail || prev.clientEmail,
        paymentTerms: parsed.paymentTerms || prev.paymentTerms,
        notes: parsed.notes || prev.notes,
      }))

      // 날짜 설정
      if (parsed.quoteDate) {
        handleInputChange('quoteDate', new Date(parsed.quoteDate).toISOString().split('T')[0])
      }
      if (parsed.validUntil) {
        handleInputChange('validUntil', parsed.validUntil)
      }
      if (parsed.deliveryDate) {
        handleInputChange('deliveryDate', new Date(parsed.deliveryDate).toISOString().split('T')[0])
        setIsDeliveryTBD(false)
      }

      // 제품 그룹 처리 (새 구조)
      if (parsed.products && parsed.products.length > 0) {
        // 파싱된 products 데이터 사용
        const newProducts: ProductGroup[] = parsed.products.map((product: {
          name: string
          quantity: number
          srpPrice?: number
          unitPrice?: number
          totalPrice?: number
          items: DocumentItem[]
        }, idx: number) => ({
          id: `product-${Date.now()}-${idx}`,
          name: product.name || '제품',
          quantity: product.quantity || 1,
          srpPrice: product.srpPrice || 0,
          unitPrice: product.unitPrice || 0,
          totalPrice: product.totalPrice || 0,
          items: product.items?.map((item: DocumentItem) => ({
            partNumber: item.partNumber || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            srpPrice: item.srpPrice || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
          })) || [],
        }))

        setProducts(newProducts)
        setStandaloneItems([])
      } else if (parsed.items && parsed.items.length > 0) {
        // 레거시 형식: items를 제품으로 변환
        const productName = parsed.items[0]?.description || parsed.projectName || '제품'
        const productTotal = parsed.totalAmount || 0

        const newProduct: ProductGroup = {
          id: `product-${Date.now()}`,
          name: productName,
          quantity: 1,
          srpPrice: 0,
          unitPrice: productTotal,
          totalPrice: productTotal,
          items: parsed.items.map((item: DocumentItem) => ({
            partNumber: item.partNumber || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            srpPrice: item.srpPrice || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
          })),
        }

        setProducts([newProduct])
        setStandaloneItems([])
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '엑셀 파싱에 실패했습니다')
    } finally {
      setParsingExcel(false)
      if (excelInputRef.current) {
        excelInputRef.current.value = ''
      }
    }
  }

  // 거래처 자동 저장 (견적서 저장 시 호출)
  const autoSaveCustomer = async () => {
    // 회사명이 없으면 스킵
    if (!formData.clientCompany.trim()) return

    try {
      // 기존 거래처 검색
      const searchRes = await fetch(`/api/customers?search=${encodeURIComponent(formData.clientCompany)}&includeContacts=true&limit=1`)
      if (!searchRes.ok) return

      const searchData = await searchRes.json()
      const existingCustomer = searchData.items?.find(
        (c: { companyName: string }) => c.companyName === formData.clientCompany
      )

      if (existingCustomer) {
        // 기존 거래처가 있으면 담당자만 추가 (동일 이름이 없을 경우)
        if (formData.clientContact.trim()) {
          const hasContact = existingCustomer.contacts?.some(
            (contact: { name: string }) => contact.name === formData.clientContact
          )
          if (!hasContact) {
            await fetch(`/api/customers/${existingCustomer.id}/contacts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: formData.clientContact,
                phone: formData.clientPhone,
                mobile: formData.clientCP,
                email: formData.clientEmail,
              }),
            })
          }
        }
      } else {
        // 새 거래처 생성
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: formData.clientCompany,
            phone: formData.clientPhone,
            fax: formData.clientFax,
            contacts: formData.clientContact.trim() ? [{
              name: formData.clientContact,
              phone: formData.clientPhone,
              mobile: formData.clientCP,
              email: formData.clientEmail,
              isDefault: true,
            }] : [],
          }),
        })
      }
    } catch (err) {
      // 거래처 저장 실패해도 견적서 저장은 계속 진행
      console.error('거래처 자동 저장 실패:', err)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)

    try {
      // 거래처 자동 저장 (백그라운드)
      autoSaveCustomer()

      const totals = calculateTotal()
      const apiPath = apiPathMap[docType]

      // 수정 모드일 때는 PATCH, 생성 모드일 때는 POST
      const method = documentId ? 'PATCH' : 'POST'
      const url = documentId ? `${apiPath}/${documentId}` : apiPath

      // 요청 바디 구성
      const requestBody: Record<string, unknown> = {
        ...formData,
        deliveryDate: isDeliveryTBD ? '별도협의' : formData.deliveryDate,
      }

      if (useNewStructure) {
        // 새 구조: 제품 그룹 + 독립 품목
        requestBody.products = products.map((product, pIdx) => ({
          name: product.name,
          quantity: product.quantity,
          srpPrice: product.srpPrice || undefined,
          unitPrice: product.unitPrice || undefined,
          isConsolidated: true, // 제품은 항상 통합 견적
          consolidatedPrice: product.totalPrice || 0,
          sortOrder: pIdx,
          items: product.items.map((item, iIdx) => ({
            partNumber: item.partNumber || undefined,
            description: item.description || undefined,
            quantity: item.quantity,
            srpPrice: item.srpPrice || undefined,
            unitPrice: item.unitPrice || undefined,
            sortOrder: iIdx,
          })),
        }))
        // 빈 독립 품목 필터링 (partNumber와 description이 모두 비어있으면 제외)
        requestBody.standaloneItems = standaloneItems
          .filter(item => item.partNumber?.trim() || item.description?.trim())
          .map((item, idx) => ({
            partNumber: item.partNumber || undefined,
            description: item.description || undefined,
            quantity: item.quantity,
            srpPrice: item.srpPrice || undefined,
            unitPrice: item.unitPrice || undefined,
            sortOrder: idx,
          }))
      } else {
        // 레거시: 기존 flat items 구조
        requestBody.isConsolidated = isConsolidated
        requestBody.consolidatedName = isConsolidated ? consolidatedName : undefined
        requestBody.consolidatedPrice = isConsolidated ? (typeof consolidatedPrice === 'number' ? consolidatedPrice : 0) : undefined
        requestBody.items = items.map((item) => ({
          id: item.id,
          partNumber: item.partNumber || undefined,
          description: item.description || undefined,
          quantity: item.quantity,
          srpPrice: item.srpPrice || undefined,
          unitPrice: item.unitPrice || undefined,
        }))
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || (documentId ? '문서 수정에 실패했습니다' : '문서 생성에 실패했습니다'))
      }

      const data = await response.json()
      router.push(`${basePath}/${data.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : (documentId ? '문서 수정에 실패했습니다' : '문서 생성에 실패했습니다'))
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const totals = calculateTotal()

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push(basePath)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {/* 모드 토글 */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 ml-auto">
          <button
            type="button"
            onClick={() => setMode('web')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-all ${mode === 'web'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UilEdit size={16} />
            웹
          </button>
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-all ${mode === 'template'
              ? 'bg-green-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UilFileAlt size={16} />
            양식
          </button>
        </div>
        {/* 엑셀 업로드 버튼 (신규 작성 시에만) */}
        {!documentId && docType === 'SALES_QUOTE' && (
          <>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelParse}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              disabled={parsingExcel}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {parsingExcel ? '파싱 중...' : '엑셀 불러오기'}
            </button>
          </>
        )}
      </div>

      {mode === 'template' ? (
        <div>
          <DocumentFormTemplate
            formData={formData}
            items={items}
            totals={totals}
            onDataChange={handleInputChange}
            onItemChange={handleItemChange}
            onAddItem={addItem}
            onRemoveItem={removeItem}
          />
          {/* 양식 모드 저장 버튼 */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => router.push(basePath)}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }} className="space-y-3">
          {/* 기본 정보 (컴팩트 테이블 스타일) */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden inline-block">
            <table className="text-sm">
              <tbody className="divide-y divide-gray-100">
                {/* 1행: 회사, 참조, 전화 */}
                <tr>
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">회사</td>
                  <td className="px-1.5 py-1 border-r border-gray-100">
                    <div className="flex gap-1">
                      <input type="text" value={formData.clientCompany} onChange={(e) => handleInputChange('clientCompany', e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="고객사명" />
                      <button type="button" onClick={() => setShowCustomerModal(true)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700" title="거래처 검색">
                        <UilSearch size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">참조</td>
                  <td className="px-1.5 py-1 border-r border-gray-100">
                    <input type="text" value={formData.clientContact} onChange={(e) => handleInputChange('clientContact', e.target.value)} className="w-28 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="담당자명" />
                  </td>
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">전화</td>
                  <td className="px-1.5 py-1">
                    <input type="tel" value={formData.clientPhone} onChange={(e) => handleInputChange('clientPhone', e.target.value)} className="w-32 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="02-1234-5678" />
                  </td>
                </tr>
                {/* 2행: Fax, CP, E-mail */}
                <tr className="bg-gray-50/30">
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">Fax</td>
                  <td className="px-1.5 py-1 border-r border-gray-100">
                    <input type="tel" value={formData.clientFax} onChange={(e) => handleInputChange('clientFax', e.target.value)} className="w-36 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="02-1234-5679" />
                  </td>
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">C P</td>
                  <td className="px-1.5 py-1 border-r border-gray-100">
                    <input type="tel" value={formData.clientCP} onChange={(e) => handleInputChange('clientCP', e.target.value)} className="w-28 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="010-1234-5678" />
                  </td>
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">E-mail</td>
                  <td className="px-1.5 py-1">
                    <input type="email" value={formData.clientEmail} onChange={(e) => handleInputChange('clientEmail', e.target.value)} className="w-48 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="contact@company.com" />
                  </td>
                </tr>
                {/* 3행: 견적일, 납기일, 유효기간 */}
                <tr>
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">견적일</td>
                  <td className="px-1.5 py-1 border-r border-gray-100">
                    <input
                      type="text"
                      value={formData.quoteDate}
                      onChange={(e) => handleInputChange('quoteDate', e.target.value)}
                      onKeyDown={(e) => {
                        if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                          e.preventDefault()
                        }
                      }}
                      maxLength={10}
                      className="w-28 px-2 py-1 border border-gray-300 rounded text-xs"
                      placeholder="2026.01.07"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">납기일</td>
                  <td className="px-1.5 py-1 border-r border-gray-100">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={isDeliveryTBD ? '별도협의' : formData.deliveryDate}
                        onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                        disabled={isDeliveryTBD}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-xs disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="2026.01.16"
                      />
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDeliveryTBD}
                          onChange={(e) => {
                            setIsDeliveryTBD(e.target.checked)
                            if (e.target.checked) {
                              handleInputChange('deliveryDate', '')
                            }
                          }}
                          className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-500">별도협의</span>
                      </label>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">유효기간</td>
                  <td className="px-1.5 py-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">견적일로부터</span>
                      <input type="number" value={formData.validUntil} onChange={(e) => handleInputChange('validUntil', e.target.value)} min="1" className="w-12 px-2 py-1 border border-gray-300 rounded text-xs text-center" placeholder="15" />
                      <span className="text-xs text-gray-500">일</span>
                    </div>
                  </td>
                </tr>
                {/* 4행: 결제조건, 견적담당, 프로젝트명 */}
                <tr className="bg-gray-50/30">
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">결제조건</td>
                  <td className="px-1.5 py-1 border-r border-gray-100">
                    <input type="text" value={formData.paymentTerms} onChange={(e) => handleInputChange('paymentTerms', e.target.value)} className="w-44 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="결제조건" />
                  </td>
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">견적담당</td>
                  <td className="px-1.5 py-1 border-r border-gray-100">
                    <input type="text" value={formData.managerName} onChange={(e) => handleInputChange('managerName', e.target.value)} className="w-32 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="담당자명" />
                  </td>
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">프로젝트</td>
                  <td className="px-1.5 py-1">
                    <input type="text" value={formData.projectName} onChange={(e) => handleInputChange('projectName', e.target.value)} className="w-48 px-2 py-1 border border-gray-300 rounded text-xs" placeholder="프로젝트명" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 품목 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-semibold text-gray-900">품목</h3>
              </div>
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
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-28">P/N</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Description</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16">Q&apos;ty</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">SRP</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">Price</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-28">Sum</th>
                    <th className="px-2 py-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* 제품들과 그 하위 품목들 */}
                  {products.map((product, pIdx) => (
                    <React.Fragment key={product.id || `product-${pIdx}`}>
                      {/* 제품 행 (emerald 배경으로 구분) */}
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
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={formatNumber(product.srpPrice || 0)}
                            onChange={(e) => handleProductChange(pIdx, 'srpPrice', parseNumber(e.target.value))}
                            onFocus={(e) => {
                              e.target.value = product.srpPrice?.toString() || ''
                              e.target.select()
                            }}
                            onBlur={(e) => {
                              e.target.value = formatNumber(product.srpPrice || 0)
                            }}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={formatNumber(product.unitPrice || 0)}
                            onChange={(e) => handleProductChange(pIdx, 'unitPrice', parseNumber(e.target.value))}
                            onFocus={(e) => {
                              e.target.value = product.unitPrice?.toString() || ''
                              e.target.select()
                            }}
                            onBlur={(e) => {
                              e.target.value = formatNumber(product.unitPrice || 0)
                            }}
                            className="w-full px-2 py-1 border border-emerald-300 rounded text-xs text-right bg-emerald-100 font-medium"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-bold text-emerald-700 text-xs">
                          {(product.totalPrice || 0).toLocaleString()}
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

                      {/* 제품 소속 품목들 (들여쓰기로 구분) */}
                      {product.items.map((item, iIdx) => (
                        <tr key={item.id || `product-${pIdx}-item-${iIdx}`} className="bg-emerald-50/30 hover:bg-emerald-50/50 border-b border-gray-100">
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
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={formatNumber(item.srpPrice || 0)}
                              onChange={(e) => handleProductItemChange(pIdx, iIdx, 'srpPrice', parseNumber(e.target.value))}
                              onFocus={(e) => {
                                e.target.value = item.srpPrice?.toString() || ''
                                e.target.select()
                              }}
                              onBlur={(e) => {
                                e.target.value = formatNumber(item.srpPrice || 0)
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={formatNumber(item.unitPrice || 0)}
                              onChange={(e) => handleProductItemChange(pIdx, iIdx, 'unitPrice', parseNumber(e.target.value))}
                              onFocus={(e) => {
                                e.target.value = item.unitPrice?.toString() || ''
                                e.target.select()
                              }}
                              onBlur={(e) => {
                                e.target.value = formatNumber(item.unitPrice || 0)
                              }}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right text-gray-500 text-xs">
                            {(item.totalPrice || 0).toLocaleString()}
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
                        <td colSpan={7} className="pl-6 py-1">
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
                    <tr key={item.id || `standalone-${index}`} className="hover:bg-gray-50 border-b border-gray-100">
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
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={formatNumber(item.srpPrice || 0)}
                          onChange={(e) => handleStandaloneItemChange(index, 'srpPrice', parseNumber(e.target.value))}
                          onFocus={(e) => {
                            e.target.value = item.srpPrice?.toString() || ''
                            e.target.select()
                          }}
                          onBlur={(e) => {
                            e.target.value = formatNumber(item.srpPrice || 0)
                          }}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={formatNumber(item.unitPrice || 0)}
                          onChange={(e) => handleStandaloneItemChange(index, 'unitPrice', parseNumber(e.target.value))}
                          onFocus={(e) => {
                            e.target.value = item.unitPrice?.toString() || ''
                            e.target.select()
                          }}
                          onBlur={(e) => {
                            e.target.value = formatNumber(item.unitPrice || 0)
                          }}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-gray-700 text-xs">
                        {(item.totalPrice || 0).toLocaleString()}
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
              <div className="px-4 py-3 flex justify-end items-center gap-4">
                <span className="text-sm text-gray-500">합계 (VAT별도)</span>
                <span className="text-xl font-bold text-blue-700">
                  {totals.total.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* 기타 정보 */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden inline-block">
            <table className="text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap align-top">기타</td>
                  <td className="px-1.5 py-1">
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                      className="w-[600px] min-h-[80px] px-2 py-1 border border-gray-300 rounded text-xs"
                      placeholder="견적서의 상세 내역 or 견적서 추가 내용"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push(basePath)}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      )}

      {/* 거래처 선택 모달 */}
      <CustomerSelectModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={handleCustomerSelect}
      />
    </div>
  )
}

