'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { BILLING_CYCLE_OPTIONS } from '@/lib/ma/billing-cycle'

// 엑셀 구조: 매출/매입 통합
// BUSINESS_RULES §10: 계약 시작/종료 + 청구 주기 + 월 청구일
interface MAApprovalItem {
  smCode?: string
  vendorCode?: string
  clientCompany?: string
  salesCompany?: string
  salesPrice?: number
  quantity?: number
  salesBillingCycle?: string
  startDate?: string
  endDate?: string
  purchaseCompany?: string
  purchasePrice?: number
  purchaseBillingCycle?: string
  billingDayOfMonth?: number // 매월 청구일 (기본 31 = 말일)
}

export default function NewMAApprovalPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    { smCode: '', vendorCode: '', clientCompany: '', salesCompany: '', salesPrice: 0, quantity: 1, salesBillingCycle: '', startDate: '', endDate: '', purchaseCompany: '', purchasePrice: 0, purchaseBillingCycle: '', billingDayOfMonth: 31 },
  ])

  useEffect(() => {
    if (session?.user?.name && !formData.managerName) {
      setFormData(prev => ({ ...prev, managerName: session.user.name || '' }))
    }
  }, [session, formData.managerName])

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
    setItems([...items, { smCode: '', vendorCode: '', clientCompany: '', salesCompany: '', salesPrice: 0, quantity: 1, salesBillingCycle: '', startDate: '', endDate: '', purchaseCompany: '', purchasePrice: 0, purchaseBillingCycle: '', billingDayOfMonth: 31 }])
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

  // 엑셀 업로드 핸들러 - 파싱만 하고 폼에 채움
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append('file', file)

      const response = await fetch('/api/ma-approvals/parse', {
        method: 'POST',
        body: formDataObj,
      })

      if (response.ok) {
        const data = await response.json()

        // 폼 데이터 채우기
        setFormData(prev => ({
          ...prev,
          approvalDate: data.approvalDate ? data.approvalDate.split('T')[0] : prev.approvalDate,
          managerName: data.managerName || prev.managerName,
          notes: data.notes || '',
        }))

        // 품목 데이터 채우기
        if (data.items && data.items.length > 0) {
          setItems(data.items.map((item: MAApprovalItem) => ({
            smCode: item.smCode || '',
            vendorCode: item.vendorCode || '',
            clientCompany: item.clientCompany || '',
            salesCompany: item.salesCompany || '',
            salesPrice: item.salesPrice || 0,
            quantity: item.quantity || 1,
            salesBillingCycle: item.salesBillingCycle || '',
            startDate: item.startDate ? String(item.startDate).split('T')[0] : '',
            endDate: item.endDate ? String(item.endDate).split('T')[0] : '',
            purchaseCompany: item.purchaseCompany || '',
            purchasePrice: item.purchasePrice || 0,
            purchaseBillingCycle: item.purchaseBillingCycle || '',
            billingDayOfMonth: item.billingDayOfMonth ?? 31,
          })))
        }

        alert('엑셀 데이터를 불러왔습니다. 확인 후 저장해주세요.')
      } else {
        const error = await response.json()
        alert(`파싱 실패: ${error.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      console.error('파싱 실패:', err)
      alert('파일 처리 중 오류가 발생했습니다.')
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

      const response = await fetch('/api/ma-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items,
          totalAmount: totals.salesTotal,
          purchaseAmount: totals.purchaseTotal,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/ma/approvals/${data.id}`)
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
          <h1 className="text-2xl font-bold text-gray-900">새 MA 품의서</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                업로드 중...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                엑셀 업로드
              </>
            )}
          </button>
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
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-20">매출주기</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-28">계약시작</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-28">계약종료</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">매입처</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">매입가</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-20">매입주기</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16" title="매월 청구일 (1~31, 31은 말일)">청구일</th>
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
                      <select
                        value={item.salesBillingCycle || ''}
                        onChange={(e) => handleItemChange(index, 'salesBillingCycle', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                      >
                        <option value="">선택</option>
                        {BILLING_CYCLE_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
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
                      <select
                        value={item.purchaseBillingCycle || ''}
                        onChange={(e) => handleItemChange(index, 'purchaseBillingCycle', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                      >
                        <option value="">선택</option>
                        {BILLING_CYCLE_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={item.billingDayOfMonth ?? 31}
                        onChange={(e) => handleItemChange(index, 'billingDayOfMonth', parseInt(e.target.value) || 31)}
                        className="w-full px-2 py-1 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                        title="매월 청구일 (1~31, 31은 말일로 자동 조정)"
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
                저장
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
