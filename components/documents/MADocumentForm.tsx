'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CustomerSelectModal } from './CustomerSelectModal'

// MA 품목 인터페이스 (엑셀 컬럼 구조에 맞춤)
interface MAItem {
  id?: string
  model?: string            // 모델 (SR250)
  modelType?: string        // M/T (7Y51CTOLWW)
  serialNumber?: string     // S/N
  partNumber?: string       // P/N
  description?: string      // 기기명 & 상세SPEC
  quantity?: number         // 수량
  startDate?: string        // 서비스개시일
  endDate?: string          // 서비스종료일
  monthlyPrice?: number     // 월제안가
  totalPrice?: number       // 계약기간 총계
  // 기존 호환용
  productName?: string
  serviceLevel?: string
  period?: string
}

interface MADocumentFormProps {
  docType: 'MA_QUOTE' | 'MA_APPROVAL'
  basePath: string
  title: string
  documentId?: string
}

const apiPathMap: Record<string, string> = {
  MA_QUOTE: '/api/ma-quotes',
  MA_APPROVAL: '/api/ma-approvals',
}

export function MADocumentForm({ docType, basePath, title, documentId }: MADocumentFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!!documentId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // 거래처 선택 모달
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  // 오늘 날짜
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    // 기본 정보
    clientCompany: '',
    installAddress: '',
    quoteDate: getTodayDate(),
    managerName: '',
    // 서비스 조건
    serviceTerms: '24 * 7 * 365 * 4',
    validUntil: '15일',
    paymentTerms: '',
    specialTerms: '',
  })

  const [items, setItems] = useState<MAItem[]>([
    { model: '', modelType: '', serialNumber: '', partNumber: '', description: '', quantity: 1, startDate: '', endDate: '', monthlyPrice: 0, totalPrice: 0 },
  ])

  // 세션 로드 시 담당자 기본값
  useEffect(() => {
    if (!documentId && session?.user?.name && !formData.managerName) {
      setFormData(prev => ({ ...prev, managerName: session.user.name || '' }))
    }
  }, [session, documentId, formData.managerName])

  // 수정 모드일 때 기존 데이터 로드
  const fetchDocument = useCallback(async () => {
    if (!documentId) return

    setFetching(true)
    try {
      const apiPath = apiPathMap[docType]
      const res = await fetch(`${apiPath}/${documentId}`)
      if (res.ok) {
        const data = await res.json()

        setFormData({
          clientCompany: data.clientCompany || '',
          installAddress: data.deliveryAddress || '',
          quoteDate: data.quoteDate ? new Date(data.quoteDate).toISOString().split('T')[0] : getTodayDate(),
          managerName: data.managerName || data.approvalManager || '',
          serviceTerms: data.serviceTerms || '24 * 7 * 365 * 4',
          validUntil: data.validUntil || '15일',
          paymentTerms: data.paymentTerms || '',
          specialTerms: data.specialTerms || '',
        })

        // MA 품목 로드 (기존 필드명 호환)
        const loadItems = (itemsData: MAItem[]) => {
          return itemsData.map((item: MAItem) => {
            const totalPrice = item.totalPrice || 0
            // monthlyPrice가 없으면 totalPrice/12로 계산
            const monthlyPrice = item.monthlyPrice || Math.round(totalPrice / 12)
            return {
              id: item.id,
              model: item.model || item.productName || '',
              modelType: item.modelType || '',
              serialNumber: item.serialNumber || '',
              partNumber: item.partNumber || '',
              description: item.description || item.serviceLevel || '',
              quantity: item.quantity || 1,
              startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
              endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
              monthlyPrice,
              totalPrice,
            }
          })
        }

        if (data.maItems && data.maItems.length > 0) {
          setItems(loadItems(data.maItems))
        } else if (data.items && data.items.length > 0) {
          setItems(loadItems(data.items))
        }

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

  // 거래처 선택 핸들러
  const handleCustomerSelect = (data: {
    companyName: string
    contactName: string
    phone: string
    email: string
  }) => {
    setFormData(prev => ({
      ...prev,
      clientCompany: data.companyName,
    }))
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index: number, field: keyof MAItem, value: string | number) => {
    setItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }

      // 월제안가 변경 시 계약기간 총계 자동 계산 (12개월)
      if (field === 'monthlyPrice') {
        newItems[index].totalPrice = (Number(value) || 0) * 12
      }

      return newItems
    })
  }

  const addItem = () => {
    setItems([...items, { model: '', modelType: '', serialNumber: '', partNumber: '', description: '', quantity: 1, startDate: '', endDate: '', monthlyPrice: 0, totalPrice: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // 합계 계산
  const calculateTotals = () => {
    const monthlyTotal = items.reduce((sum, item) => sum + (item.monthlyPrice || 0), 0)
    const contractTotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    const contractTotalWithVat = Math.round(contractTotal * 1.1)
    return { monthlyTotal, contractTotal, contractTotalWithVat }
  }

  // 엑셀 업로드 핸들러
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('mode', 'parse')

      const res = await fetch('/api/ma-quotes/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      if (res.ok) {
        const data = await res.json()

        if (data.parsed) {
          const parsed = data.parsed

          setFormData(prev => ({
            ...prev,
            clientCompany: parsed.clientCompany || prev.clientCompany,
            installAddress: parsed.deliveryAddress || prev.installAddress,
            quoteDate: parsed.quoteDate ? new Date(parsed.quoteDate).toISOString().split('T')[0] : prev.quoteDate,
            validUntil: parsed.validUntil || prev.validUntil,
            paymentTerms: parsed.paymentTerms || prev.paymentTerms,
            serviceTerms: parsed.serviceTerms || prev.serviceTerms,
            specialTerms: parsed.specialTerms || prev.specialTerms,
            managerName: parsed.approvalManager || prev.managerName,
          }))

          if (parsed.maItems && parsed.maItems.length > 0) {
            setItems(parsed.maItems.map((item: MAItem) => {
              const totalPrice = item.totalPrice || 0
              const monthlyPrice = item.monthlyPrice || Math.round(totalPrice / 12)
              return {
                model: item.model || item.productName || '',
                modelType: item.modelType || '',
                serialNumber: item.serialNumber || '',
                partNumber: item.partNumber || '',
                description: item.description || item.serviceLevel || '',
                quantity: item.quantity || 1,
                startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
                endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
                monthlyPrice,
                totalPrice,
              }
            }))
          }
        }

        alert('엑셀 파일을 성공적으로 불러왔습니다.')
      } else {
        const error = await res.json()
        alert(`업로드 실패: ${error.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      console.error('엑셀 업로드 실패:', err)
      alert('엑셀 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)

    try {
      const totals = calculateTotals()
      const apiPath = apiPathMap[docType]
      const method = documentId ? 'PATCH' : 'POST'
      const url = documentId ? `${apiPath}/${documentId}` : apiPath

      // 기존 API 호환을 위해 필드명 변환
      const maItems = items.map(item => ({
        ...item,
        productName: item.model,
        serviceLevel: item.description,
      }))

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          deliveryAddress: formData.installAddress,
          approvalManager: formData.managerName,
          maItems,
          totalAmount: totals.contractTotal,
          vatAmount: Math.round(totals.contractTotal * 0.1),
          totalWithVat: totals.contractTotalWithVat,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        router.replace(`${basePath}/${data.id}`)
      } else {
        const error = await response.json()
        alert(`저장 실패: ${error.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      console.error('저장 실패:', err)
      alert('저장 중 오류가 발생했습니다.')
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

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomerModal(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            거래처 검색
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
            id="ma-excel-upload"
          />
          <label
            htmlFor="ma-excel-upload"
            className={`px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer flex items-center gap-2 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploading ? '업로드 중...' : '엑셀 업로드'}
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}>
        {/* 기본 정보 (컴팩트 테이블 스타일) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <table className="text-sm w-full">
            <tbody className="divide-y divide-gray-100">
              {/* 1행: 고객명, 견적일자, 담당자 */}
              <tr>
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">고객명</td>
                <td className="px-2 py-1.5 border-r border-gray-100">
                  <input
                    type="text"
                    value={formData.clientCompany}
                    onChange={(e) => handleInputChange('clientCompany', e.target.value)}
                    className="w-48 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="고객사명"
                  />
                </td>
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">견적일자</td>
                <td className="px-2 py-1.5 border-r border-gray-100">
                  <input
                    type="date"
                    value={formData.quoteDate}
                    onChange={(e) => handleInputChange('quoteDate', e.target.value)}
                    className="w-36 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">담당자</td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={formData.managerName}
                    onChange={(e) => handleInputChange('managerName', e.target.value)}
                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="담당자명"
                  />
                </td>
              </tr>
              {/* 2행: 기계설치주소 */}
              <tr className="bg-gray-50/30">
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">기계설치주소</td>
                <td className="px-2 py-1.5" colSpan={5}>
                  <input
                    type="text"
                    value={formData.installAddress}
                    onChange={(e) => handleInputChange('installAddress', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="기계 설치 주소"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 품목 테이블 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">품목</h3>
            <div className="text-xs text-gray-500">단위: 원, VAT별도</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-20">모델</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-24">M/T</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-24">S/N</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-20">P/N</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">기기명 &amp; 상세SPEC</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-14">수량</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-28">서비스개시일</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-28">서비스종료일</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">월제안가</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-28">계약기간 총계</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.model || ''}
                        onChange={(e) => handleItemChange(index, 'model', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="SR250"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.modelType || ''}
                        onChange={(e) => handleItemChange(index, 'modelType', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="7Y51CTOLWW"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.serialNumber || ''}
                        onChange={(e) => handleItemChange(index, 'serialNumber', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="J32K3421"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.partNumber || ''}
                        onChange={(e) => handleItemChange(index, 'partNumber', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="P/N"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Tech 24x7 4Hr Response"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="1"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="date"
                        value={item.startDate || ''}
                        onChange={(e) => handleItemChange(index, 'startDate', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="date"
                        value={item.endDate || ''}
                        onChange={(e) => handleItemChange(index, 'endDate', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={item.monthlyPrice || ''}
                        onChange={(e) => handleItemChange(index, 'monthlyPrice', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={item.totalPrice || ''}
                        onChange={(e) => handleItemChange(index, 'totalPrice', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
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
          <div className="bg-gray-50 border-t px-4 py-3">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1.5 bg-gray-700 text-white text-xs rounded-lg hover:bg-gray-800 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                품목 추가
              </button>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-xs text-gray-500">월간 합계</div>
                  <div className="text-sm font-medium text-gray-700">{totals.monthlyTotal.toLocaleString()}원</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">계약기간 합계 (VAT별도)</div>
                  <div className="text-base font-bold text-blue-700">{totals.contractTotal.toLocaleString()}원</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">계약기간 합계 (VAT포함)</div>
                  <div className="text-base font-bold text-emerald-700">{totals.contractTotalWithVat.toLocaleString()}원</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 서비스 조건 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <table className="text-sm w-full">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">서비스기간</td>
                <td className="px-2 py-1.5 border-r border-gray-100">
                  <input
                    type="text"
                    value={formData.serviceTerms}
                    onChange={(e) => handleInputChange('serviceTerms', e.target.value)}
                    className="w-48 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="24 * 7 * 365 * 4"
                  />
                </td>
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">견적 유효기간</td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={formData.validUntil}
                    onChange={(e) => handleInputChange('validUntil', e.target.value)}
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="15일"
                  />
                </td>
              </tr>
              <tr className="bg-gray-50/30">
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap align-top">특약사항</td>
                <td className="px-2 py-1.5" colSpan={3}>
                  <input
                    type="text"
                    value={formData.specialTerms}
                    onChange={(e) => handleInputChange('specialTerms', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="정기점검 제외, 장애시 부품 포함 엔지니어 지원"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                저장 중...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {documentId ? '수정' : '저장'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* 거래처 선택 모달 */}
      <CustomerSelectModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={handleCustomerSelect}
      />
    </div>
  )
}
