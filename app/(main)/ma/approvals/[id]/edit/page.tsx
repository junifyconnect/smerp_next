'use client'

import { useRouter, useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

// 엑셀 구조: 매출/매입 통합
interface MAApprovalItem {
  id?: string
  smCode?: string           // SM코드
  vendorCode?: string       // 벤더코드
  clientCompany?: string    // 고객사
  salesCompany?: string     // 매출처
  salesPrice?: number       // 매출가
  quantity?: number         // 수량
  salesBillingType?: string // 청구구분(매출)
  startDate?: string        // 계약기간 시작
  endDate?: string          // 계약기간 종료
  purchaseCompany?: string  // 매입처
  purchasePrice?: number    // 매입가
  purchaseBillingType?: string // 청구구분(매입)
}

export default function EditMAApprovalPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    approvalDate: getTodayDate(),
    managerName: '',
    notes: '',
  })

  const [items, setItems] = useState<MAApprovalItem[]>([
    {
      smCode: '',
      vendorCode: '',
      clientCompany: '',
      salesCompany: '',
      salesPrice: 0,
      quantity: 1,
      salesBillingType: '일시불',
      startDate: '',
      endDate: '',
      purchaseCompany: '',
      purchasePrice: 0,
      purchaseBillingType: '총(월간)',
    },
  ])

  const fetchDocument = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch(`/api/ma-approvals/${documentId}`)
      if (res.ok) {
        const data = await res.json()

        setFormData({
          approvalDate: data.approvalDate ? new Date(data.approvalDate).toISOString().split('T')[0] : getTodayDate(),
          managerName: data.managerName || '',
          notes: data.notes || '',
        })

        if (data.items && data.items.length > 0) {
          setItems(data.items.map((item: MAApprovalItem) => ({
            id: item.id,
            smCode: item.smCode || '',
            vendorCode: item.vendorCode || '',
            clientCompany: item.clientCompany || '',
            salesCompany: item.salesCompany || '',
            salesPrice: item.salesPrice || 0,
            quantity: item.quantity || 1,
            salesBillingType: item.salesBillingType || '일시불',
            startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
            endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
            purchaseCompany: item.purchaseCompany || '',
            purchasePrice: item.purchasePrice || 0,
            purchaseBillingType: item.purchaseBillingType || '총(월간)',
          })))
        }

        if (data.status !== 'DRAFT') {
          alert('작성중 상태의 문서만 수정할 수 있습니다.')
          router.push(`/ma/approvals/${documentId}`)
        }
      } else {
        router.push('/ma/approvals')
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push('/ma/approvals')
    } finally {
      setFetching(false)
    }
  }, [documentId, router])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index: number, field: keyof MAApprovalItem, value: string | number) => {
    setItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }

  const addItem = () => {
    setItems([...items, {
      smCode: '',
      vendorCode: '',
      clientCompany: '',
      salesCompany: '',
      salesPrice: 0,
      quantity: 1,
      salesBillingType: '일시불',
      startDate: '',
      endDate: '',
      purchaseCompany: '',
      purchasePrice: 0,
      purchaseBillingType: '총(월간)',
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // 합계 계산
  const calculateTotals = () => {
    const salesTotal = items.reduce((sum, item) => sum + ((item.salesPrice || 0) * (item.quantity || 1)), 0)
    const purchaseTotal = items.reduce((sum, item) => sum + ((item.purchasePrice || 0) * (item.quantity || 1)), 0)
    const margin = salesTotal - purchaseTotal
    const marginRate = salesTotal > 0 ? Math.round((margin / salesTotal) * 100) : 0
    return { salesTotal, purchaseTotal, margin, marginRate }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)

    try {
      const totals = calculateTotals()

      const response = await fetch(`/api/ma-approvals/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items,
          totalAmount: totals.salesTotal,
          purchaseAmount: totals.purchaseTotal,
        }),
      })

      if (response.ok) {
        router.push(`/ma/approvals/${documentId}`)
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
          <h1 className="text-2xl font-bold text-gray-900">MA 품의서 수정</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}>
        {/* 기본 정보 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <table className="text-sm w-full">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">품의일자</td>
                <td className="px-2 py-1.5 border-r border-gray-100">
                  <input
                    type="date"
                    value={formData.approvalDate}
                    onChange={(e) => handleInputChange('approvalDate', e.target.value)}
                    className="w-36 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </td>
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">담당자</td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={formData.managerName}
                    onChange={(e) => handleInputChange('managerName', e.target.value)}
                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="담당자명"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 품목 테이블 (매출/매입 통합) */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">품목</h3>
            <div className="text-xs text-gray-500">단위: 원</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-20">SM코드</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-20">벤더코드</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">고객사</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">매출처</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">매출가</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-12">수량</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16">청구구분</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-28">계약시작</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-28">계약종료</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">매입처</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">매입가</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16">청구구분</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.smCode || ''}
                        onChange={(e) => handleItemChange(index, 'smCode', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.vendorCode || ''}
                        onChange={(e) => handleItemChange(index, 'vendorCode', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.clientCompany || ''}
                        onChange={(e) => handleItemChange(index, 'clientCompany', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="고객사"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.salesCompany || ''}
                        onChange={(e) => handleItemChange(index, 'salesCompany', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="매출처"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={item.salesPrice || ''}
                        onChange={(e) => handleItemChange(index, 'salesPrice', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                        min="1"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.salesBillingType || ''}
                        onChange={(e) => handleItemChange(index, 'salesBillingType', e.target.value)}
                        className="w-full px-2 py-1 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="일시불"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="date"
                        value={item.startDate || ''}
                        onChange={(e) => handleItemChange(index, 'startDate', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="date"
                        value={item.endDate || ''}
                        onChange={(e) => handleItemChange(index, 'endDate', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.purchaseCompany || ''}
                        onChange={(e) => handleItemChange(index, 'purchaseCompany', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="매입처"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={item.purchasePrice || ''}
                        onChange={(e) => handleItemChange(index, 'purchasePrice', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.purchaseBillingType || ''}
                        onChange={(e) => handleItemChange(index, 'purchaseBillingType', e.target.value)}
                        className="w-full px-2 py-1 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                        placeholder="총(월간)"
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
                  <div className="text-xs text-gray-500">매출 합계</div>
                  <div className="text-base font-bold text-blue-700">{totals.salesTotal.toLocaleString()}원</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">매입 합계</div>
                  <div className="text-base font-bold text-red-700">{totals.purchaseTotal.toLocaleString()}원</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">이익</div>
                  <div className={`text-base font-bold ${totals.margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {totals.margin.toLocaleString()}원
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">이익률</div>
                  <div className={`text-base font-bold ${totals.marginRate >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {totals.marginRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 비고 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <table className="text-sm w-full">
            <tbody>
              <tr>
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24 align-top">비고</td>
                <td className="px-2 py-1.5">
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="비고 사항을 입력하세요"
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
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
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
                수정
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
