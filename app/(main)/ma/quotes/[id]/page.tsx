'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface MAItem {
  id: string
  model?: string            // 모델
  modelType?: string        // M/T
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
}

interface MAQuote {
  id: string
  quoteNumber: string
  status: string
  quoteDate?: string
  managerName?: string
  clientCompany?: string
  deliveryAddress?: string
  validUntil?: string
  serviceTerms?: string
  specialTerms?: string
  totalAmount?: number
  vatAmount?: number
  totalWithVat?: number
  items: MAItem[]
  createdAt: string
  updatedAt?: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: '발송', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: '수주', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '실주', color: 'bg-red-100 text-red-700' },
}

export default function MAQuoteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [quote, setQuote] = useState<MAQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/ma-quotes/${id}`)
      if (res.ok) {
        const data = await res.json()
        setQuote(data)
      } else {
        router.push('/ma/quotes')
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push('/ma/quotes')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchQuote()
  }, [fetchQuote])

  const handleStatusChange = async (newStatus: string) => {
    if (!quote) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/ma-quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchQuote()
      } else {
        alert('상태 변경에 실패했습니다.')
      }
    } catch (err) {
      console.error('상태 변경 실패:', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/ma-quotes/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/ma/quotes')
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR')
  }

  // 합계 계산
  const calculateTotals = () => {
    if (!quote) return { monthlyTotal: 0, contractTotal: 0, contractTotalWithVat: 0 }
    const contractTotal = quote.totalAmount || quote.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    // monthlyTotal: 각 품목의 monthlyPrice 합계, 없으면 totalPrice/12로 계산
    const monthlyTotal = quote.items.reduce((sum, item) => {
      const monthly = item.monthlyPrice || Math.round((item.totalPrice || 0) / 12)
      return sum + monthly
    }, 0)
    const contractTotalWithVat = quote.totalWithVat || Math.round(contractTotal * 1.1)
    return { monthlyTotal, contractTotal, contractTotalWithVat }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">견적서를 찾을 수 없습니다</div>
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/ma/quotes"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{quote.quoteNumber}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[quote.status]?.color || 'bg-gray-100'}`}>
                {statusLabels[quote.status]?.label || quote.status}
              </span>
            </div>
            {quote.clientCompany && (
              <p className="text-sm text-gray-600 mt-1">{quote.clientCompany}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {quote.status === 'DRAFT' && (
            <>
              <Link
                href={`/ma/quotes/${id}/edit`}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수정
              </Link>
              <button
                onClick={() => handleStatusChange('SENT')}
                disabled={updatingStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                발송 처리
              </button>
            </>
          )}
          {quote.status === 'SENT' && (
            <>
              <button
                onClick={() => handleStatusChange('ACCEPTED')}
                disabled={updatingStatus}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                수주
              </button>
              <button
                onClick={() => handleStatusChange('REJECTED')}
                disabled={updatingStatus}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
              >
                실주
              </button>
            </>
          )}
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            삭제
          </button>
        </div>
      </div>

      {/* 기본 정보 (컴팩트 테이블 스타일) */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="text-sm w-full">
          <tbody className="divide-y divide-gray-100">
            {/* 1행: 고객명, 견적일자, 담당자 */}
            <tr>
              <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">고객명</td>
              <td className="px-3 py-2 border-r border-gray-100">
                <span className="text-sm font-medium">{quote.clientCompany || '-'}</span>
              </td>
              <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">견적일자</td>
              <td className="px-3 py-2 border-r border-gray-100">
                <span className="text-sm">{formatDate(quote.quoteDate)}</span>
              </td>
              <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">담당자</td>
              <td className="px-3 py-2">
                <span className="text-sm">{quote.managerName || '-'}</span>
              </td>
            </tr>
            {/* 2행: 기계설치주소 */}
            <tr className="bg-gray-50/30">
              <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">기계설치주소</td>
              <td className="px-3 py-2" colSpan={5}>
                <span className="text-sm">{quote.deliveryAddress || '-'}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 품목 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-24">서비스개시일</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-24">서비스종료일</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">월제안가</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-28">계약기간 총계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quote.items.map((item) => {
                // monthlyPrice가 없으면 totalPrice / 12로 계산
                const monthlyPrice = item.monthlyPrice || Math.round((item.totalPrice || 0) / 12)
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-center text-xs">{item.model || item.productName || '-'}</td>
                    <td className="px-2 py-2 text-center text-xs">{item.modelType || '-'}</td>
                    <td className="px-2 py-2 text-center text-xs">{item.serialNumber || '-'}</td>
                    <td className="px-2 py-2 text-center text-xs">{item.partNumber || '-'}</td>
                    <td className="px-2 py-2 text-xs">{item.description || item.serviceLevel || '-'}</td>
                    <td className="px-2 py-2 text-center text-xs">{item.quantity || 1}</td>
                    <td className="px-2 py-2 text-center text-xs text-red-600 font-medium">{formatDate(item.startDate)}</td>
                    <td className="px-2 py-2 text-center text-xs text-red-600 font-medium">{formatDate(item.endDate)}</td>
                    <td className="px-2 py-2 text-right text-xs">{monthlyPrice.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right text-xs font-medium">{(item.totalPrice || 0).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 합계 영역 */}
        <div className="bg-gray-50 border-t px-4 py-3">
          <div className="flex justify-end items-center gap-8">
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

      {/* 서비스 조건 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="text-sm w-full">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">서비스기간</td>
              <td className="px-3 py-2 border-r border-gray-100">
                <span className="text-sm">{quote.serviceTerms || '24 * 7 * 365 * 4'}</span>
              </td>
              <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">견적 유효기간</td>
              <td className="px-3 py-2">
                <span className="text-sm">{quote.validUntil || '15일'}</span>
              </td>
            </tr>
            <tr className="bg-gray-50/30">
              <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">특약사항</td>
              <td className="px-3 py-2" colSpan={3}>
                <span className="text-sm text-red-600">{quote.specialTerms || '-'}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 메타 정보 */}
      <div className="flex justify-end">
        <div className="flex gap-6 text-sm text-gray-500">
          <span>생성일: {new Date(quote.createdAt).toLocaleString('ko-KR')}</span>
          {quote.updatedAt && (
            <span>수정일: {new Date(quote.updatedAt).toLocaleString('ko-KR')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
