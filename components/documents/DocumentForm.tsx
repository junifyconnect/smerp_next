'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UilPlus, UilTrashAlt, UilFileAlt, UilEdit } from '@iconscout/react-unicons'
import { DocumentFormTemplate } from './DocumentFormTemplate'

interface DocumentItem {
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
}

const apiPathMap: Record<string, string> = {
  SALES_QUOTE: '/api/sales-quotes',
  SALES_APPROVAL: '/api/sales-approvals',
  SALES_ORDER: '/api/sales-orders',
  MA_QUOTE: '/api/ma-quotes',
  MA_APPROVAL: '/api/ma-approvals',
}

export function DocumentForm({ docType, basePath, title }: DocumentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'web' | 'template'>('web')
  
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
  const [items, setItems] = useState<DocumentItem[]>([
    { partNumber: '', description: '', quantity: 1, srpPrice: 0, unitPrice: 0, totalPrice: 0 },
  ])

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
    const total = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    const vat = Math.round(total * 0.1)
    return { total, vat, totalWithVat: total + vat }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)

    try {
      const totals = calculateTotal()
      const apiPath = apiPathMap[docType]
      const response = await fetch(apiPath, {
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

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '문서 생성에 실패했습니다')
      }

      const data = await response.json()
      router.push(`${basePath}/${data.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '문서 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
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
            <div className="space-y-4">
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">회사</label>
                  <input
                    type="text"
                    value={formData.clientCompany}
                    onChange={(e) => handleInputChange('clientCompany', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="고객사명"
                  />
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
          <div className="space-y-4">
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
                <input
                  type="text"
                  value={formData.deliveryDate}
                  onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="별도협의"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">유효기간</label>
                <input
                  type="text"
                  value={formData.validUntil}
                  onChange={(e) => handleInputChange('validUntil', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="견적일로부터 15일"
                />
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
            <h2 className="text-xl font-bold text-gray-900">품목 목록</h2>
            <button
              type="button"
              onClick={addItem}
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
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">P/N</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Description</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Q&apos;ty</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">SRP</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Price</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700" style={{ width: '140px', minWidth: '140px' }}>Sum</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700" style={{ width: '80px', minWidth: '80px' }}>작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.partNumber || ''}
                        onChange={(e) => handleItemChange(index, 'partNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="품번"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="품목명"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.srpPrice || ''}
                        onChange={(e) => handleItemChange(index, 'srpPrice', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
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
    </div>
  )
}

