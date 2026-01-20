'use client'

import { UilEdit, UilFileAlt, UilPlus, UilSearch, UilTrashAlt } from '@iconscout/react-unicons'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
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
  const [items, setItems] = useState<DocumentItem[]>([
    { partNumber: '', description: '', quantity: 1, srpPrice: 0, unitPrice: 0, totalPrice: 0 },
  ])

  // 통합 견적 상태
  const [isConsolidated, setIsConsolidated] = useState(false)
  const [consolidatedName, setConsolidatedName] = useState('') // 통합 품명
  const [consolidatedPrice, setConsolidatedPrice] = useState<number | ''>(0) // 통합 금액

  // 납기일 별도 협의 상태
  const [isDeliveryTBD, setIsDeliveryTBD] = useState(false)

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

        // 품목 설정
        if (data.items && data.items.length > 0) {
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

        // 통합 견적 설정
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

  const calculateTotal = () => {
    // 통합 견적일 경우 통합 금액 사용
    const total = isConsolidated
      ? (typeof consolidatedPrice === 'number' ? consolidatedPrice : 0)
      : items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    const vat = Math.round(total * 0.1)
    return { total, vat, totalWithVat: total + vat }
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

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // 납기일: 별도 협의 체크 시 문자열로 전송
          deliveryDate: isDeliveryTBD ? '별도협의' : formData.deliveryDate,
          // 통합 견적 정보
          isConsolidated,
          consolidatedName: isConsolidated ? consolidatedName : undefined,
          consolidatedPrice: isConsolidated ? (typeof consolidatedPrice === 'number' ? consolidatedPrice : 0) : undefined,
          // 품목 (통합 견적일 때도 참고용으로 저장)
          items: items.map((item) => ({
            id: item.id,
            partNumber: item.partNumber || undefined,
            description: item.description || undefined,
            quantity: item.quantity,
            srpPrice: item.srpPrice || undefined,
            unitPrice: item.unitPrice || undefined,
          })),
        }),
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center gap-3">
          {/* 모드 토글 */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('web')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${mode === 'web'
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
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${mode === 'template'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <UilFileAlt size={18} />
              양식 모드
            </button>
          </div>
          <button
            onClick={() => router.push(basePath)}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
          >
            취소
          </button>
        </div>
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
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={() => router.push(basePath)}
              className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 고객 정보 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">고객 정보</h2>
            {docType === 'SALES_APPROVAL' ? (
              // Sales 품의서: 매출처/담당/연락처 한 줄 입력
              <div className="space-y-4 max-w-3xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    매출처 / 담당 / 연락처
                  </label>
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
                      value={formData.projectName}
                      onChange={(e) => handleInputChange('projectName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      placeholder="End User 정보를 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">MT&S/N</label>
                    <input
                      type="text"
                      value={formData.clientCompany}
                      onChange={(e) => handleInputChange('clientCompany', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      placeholder="모델타입 / 시리얼넘버 등"
                    />
                  </div>
                </div>
              </div>
            ) : (
              // 기본 견적서용 고객 정보
              <div className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">회사</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.clientCompany}
                        onChange={(e) => handleInputChange('clientCompany', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                        placeholder="고객사명"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCustomerModal(true)}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        title="거래처 검색"
                      >
                        <UilSearch size={18} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">참조</label>
                    <input
                      type="text"
                      value={formData.clientContact}
                      onChange={(e) => handleInputChange('clientContact', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      placeholder="담당자명"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">전화</label>
                    <input
                      type="tel"
                      value={formData.clientPhone}
                      onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      placeholder="02-1234-5678"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fax</label>
                    <input
                      type="tel"
                      value={formData.clientFax}
                      onChange={(e) => handleInputChange('clientFax', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      placeholder="02-1234-5679"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">C P</label>
                    <input
                      type="tel"
                      value={formData.clientCP}
                      onChange={(e) => handleInputChange('clientCP', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      placeholder="010-1234-5678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                    <input
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      placeholder="contact@company.com"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 견적 정보 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">견적 정보</h2>
            <div className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">견적일</label>
                  <input
                    type="text"
                    value={formData.quoteDate}
                    onChange={(e) => handleInputChange('quoteDate', e.target.value)}
                    onKeyDown={(e) => {
                      // 숫자, 백스페이스, 삭제, 탭, 화살표 키만 허용
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    maxLength={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="20260107"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">납기일</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={isDeliveryTBD ? '별도협의' : formData.deliveryDate}
                      onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                      disabled={isDeliveryTBD}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="2026.01.16"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDeliveryTBD}
                        onChange={(e) => {
                          setIsDeliveryTBD(e.target.checked)
                          if (e.target.checked) {
                            handleInputChange('deliveryDate', '')
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">별도 협의</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">유효기간</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 whitespace-nowrap">견적일로부터</span>
                    <input
                      type="number"
                      value={formData.validUntil}
                      onChange={(e) => handleInputChange('validUntil', e.target.value)}
                      min="1"
                      className="w-20 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-center"
                      placeholder="15"
                    />
                    <span className="text-gray-600 whitespace-nowrap">일 이내</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">결제조건</label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="결제조건 입력"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">견적담당</label>
                  <input
                    type="text"
                    value={formData.managerName}
                    onChange={(e) => handleInputChange('managerName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="담당자명"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">프로젝트명</label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => handleInputChange('projectName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="프로젝트명"
                  />
                </div>
              </div>
              {formData.managerPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">담당자 연락처</label>
                  <input
                    type="tel"
                    value={formData.managerPhone}
                    onChange={(e) => handleInputChange('managerPhone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="070-8892-1455"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 품목 목록 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900">품목 목록</h2>
                {/* 견적 유형 선택 */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setIsConsolidated(false)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${!isConsolidated
                      ? 'bg-white text-blue-700 shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    개별 품목
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConsolidated(true)
                      // 통합 시 기존 품목 합계를 기본값으로
                      const total = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
                      setConsolidatedPrice(total)
                      // 통합 품명 기본값 설정
                      if (!consolidatedName && items[0]?.description) {
                        setConsolidatedName(items[0].description + (items.length > 1 ? ' 외' : ''))
                      }
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${isConsolidated
                      ? 'bg-white text-emerald-700 shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    통합 견적
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UilPlus size={20} />
                품목 추가
              </button>
            </div>

            {/* 통합 견적 설정 */}
            {isConsolidated && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-emerald-700 font-medium">통합 견적</span>
                  <span className="text-xs text-emerald-600">여러 품목을 하나의 대표 품명과 금액으로 표시합니다</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">대표 품명 *</label>
                    <input
                      type="text"
                      value={consolidatedName}
                      onChange={(e) => setConsolidatedName(e.target.value)}
                      className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      placeholder="예: IBM DS8000 HDD 외"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">통합 금액 (VAT별도) *</label>
                    <input
                      type="number"
                      value={consolidatedPrice || ''}
                      onChange={(e) => setConsolidatedPrice(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-right"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700" style={{ width: '120px', minWidth: '120px' }}>P/N</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700" style={{ width: '200px', minWidth: '150px' }}>Description</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700" style={{ width: '80px', minWidth: '80px' }}>Q&apos;ty</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700" style={{ width: '120px', minWidth: '100px' }}>SRP</th>
                    {!isConsolidated && (
                      <>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700" style={{ width: '120px', minWidth: '100px' }}>Price</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700" style={{ width: '140px', minWidth: '140px' }}>Sum</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-700" style={{ width: '80px', minWidth: '80px' }}>작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="px-4 py-3" style={{ width: '120px', minWidth: '120px' }}>
                        <input
                          type="text"
                          value={item.partNumber || ''}
                          onChange={(e) => handleItemChange(index, 'partNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="품번"
                        />
                      </td>
                      <td className="px-4 py-3" style={{ width: '200px', minWidth: '150px' }}>
                        <textarea
                          value={item.description || ''}
                          onChange={(e) => {
                            handleItemChange(index, 'description', e.target.value)
                            // 자동 높이 조절
                            e.target.style.height = 'auto'
                            e.target.style.height = e.target.scrollHeight + 'px'
                          }}
                          onFocus={(e) => {
                            // 포커스 시 높이 조절
                            e.target.style.height = 'auto'
                            e.target.style.height = e.target.scrollHeight + 'px'
                          }}
                          rows={1}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none overflow-hidden"
                          placeholder="품목명"
                          style={{ minHeight: '38px' }}
                        />
                      </td>
                      <td className="px-4 py-3" style={{ width: '80px', minWidth: '80px' }}>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                        />
                      </td>
                      <td className="px-4 py-3" style={{ width: '120px', minWidth: '100px' }}>
                        <input
                          type="number"
                          value={item.srpPrice || ''}
                          onChange={(e) => handleItemChange(index, 'srpPrice', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                          placeholder="0"
                        />
                      </td>
                      {!isConsolidated && (
                        <>
                          <td className="px-4 py-3" style={{ width: '120px', minWidth: '100px' }}>
                            <input
                              type="number"
                              value={item.unitPrice || ''}
                              onChange={(e) => handleItemChange(index, 'unitPrice', parseInt(e.target.value) || 0)}
                              min="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900" style={{ width: '140px', minWidth: '140px' }}>
                            {(item.totalPrice || 0).toLocaleString()}원
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-center" style={{ width: '80px', minWidth: '80px' }}>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
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

            {/* 금액 요약 - 품목 목록 박스 내부 하단 */}
            <div className="mt-6 pt-6 border-t-2 border-gray-200">
              <div className="flex justify-end">
                <dl className="w-96 space-y-3">
                  <div className="flex justify-between items-center py-2 px-4 rounded-lg">
                    <dt className="text-base font-medium text-gray-700">제안금액(VAT별도)</dt>
                    <dd className="text-base font-bold text-gray-900">{totals.total.toLocaleString()}원</dd>
                  </div>
                  <div className="flex justify-between items-center py-3 px-5 rounded-lg">
                    <dt className="text-lg font-bold text-gray-900">제안금액(VAT포함)</dt>
                    <dd className="text-xl font-bold text-gray-900">{totals.totalWithVat.toLocaleString()}원</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* 기타사항 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">기타사항</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base max-w-3xl"
              placeholder="견적서의 상세 내역 or 견적서 추가 내용"
            />
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

      {/* 거래처 선택 모달 */}
      <CustomerSelectModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={handleCustomerSelect}
      />
    </div>
  )
}

