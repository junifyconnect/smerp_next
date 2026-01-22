'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

// 엑셀 구조: 매출/매입 통합
interface MAApprovalItem {
  id: string
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

interface MAApproval {
  id: string
  docNumber: string
  status: string
  approvalDate?: string
  managerName?: string
  notes?: string
  totalAmount?: number
  purchaseAmount?: number
  items: MAApprovalItem[]
  createdAt: string
  updatedAt?: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: '승인대기', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: '승인완료', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-700' },
}

export default function MAApprovalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [approval, setApproval] = useState<MAApproval | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchApproval = useCallback(async () => {
    try {
      const res = await fetch(`/api/ma-approvals/${id}`)
      if (res.ok) {
        const data = await res.json()
        setApproval(data)
      } else {
        router.push('/ma/approvals')
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push('/ma/approvals')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchApproval()
  }, [fetchApproval])

  const handleStatusChange = async (newStatus: string) => {
    if (!approval) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/ma-approvals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchApproval()
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
      const res = await fetch(`/api/ma-approvals/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/ma/approvals')
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
    if (!approval) return { salesTotal: 0, purchaseTotal: 0, margin: 0, marginRate: 0 }
    const items = approval.items || []
    const salesTotal = items.reduce((sum, item) => sum + ((item.salesPrice || 0) * (item.quantity || 1)), 0)
    const purchaseTotal = items.reduce((sum, item) => sum + ((item.purchasePrice || 0) * (item.quantity || 1)), 0)
    const margin = salesTotal - purchaseTotal
    const marginRate = salesTotal > 0 ? Math.round((margin / salesTotal) * 100) : 0
    return { salesTotal, purchaseTotal, margin, marginRate }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!approval) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">품의서를 찾을 수 없습니다</div>
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
            href="/ma/approvals"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{approval.docNumber}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[approval.status]?.color || 'bg-gray-100'}`}>
                {statusLabels[approval.status]?.label || approval.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {approval.status === 'DRAFT' && (
            <>
              <Link
                href={`/ma/approvals/${id}/edit`}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수정
              </Link>
              <button
                onClick={() => handleStatusChange('PENDING')}
                disabled={updatingStatus}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                승인요청
              </button>
            </>
          )}
          {approval.status === 'PENDING' && (
            <>
              <button
                onClick={() => handleStatusChange('APPROVED')}
                disabled={updatingStatus}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                승인
              </button>
              <button
                onClick={() => handleStatusChange('REJECTED')}
                disabled={updatingStatus}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
              >
                반려
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

      {/* 기본 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="text-sm w-full">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">품의일자</td>
              <td className="px-3 py-2 border-r border-gray-100">
                <span className="text-sm">{formatDate(approval.approvalDate)}</span>
              </td>
              <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">담당자</td>
              <td className="px-3 py-2">
                <span className="text-sm">{approval.managerName || '-'}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 품목 테이블 (매출/매입 통합) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-24">계약시작</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-24">계약종료</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">매입처</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">매입가</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16">청구구분</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(approval.items || []).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-center text-xs">{item.smCode || '-'}</td>
                  <td className="px-2 py-2 text-center text-xs">{item.vendorCode || '-'}</td>
                  <td className="px-2 py-2 text-xs">{item.clientCompany || '-'}</td>
                  <td className="px-2 py-2 text-xs">{item.salesCompany || '-'}</td>
                  <td className="px-2 py-2 text-right text-xs text-blue-600 font-medium">{(item.salesPrice || 0).toLocaleString()}</td>
                  <td className="px-2 py-2 text-center text-xs">{item.quantity || 1}</td>
                  <td className="px-2 py-2 text-center text-xs">{item.salesBillingType || '-'}</td>
                  <td className="px-2 py-2 text-center text-xs">{formatDate(item.startDate)}</td>
                  <td className="px-2 py-2 text-center text-xs">{formatDate(item.endDate)}</td>
                  <td className="px-2 py-2 text-xs">{item.purchaseCompany || '-'}</td>
                  <td className="px-2 py-2 text-right text-xs text-red-600 font-medium">{(item.purchasePrice || 0).toLocaleString()}</td>
                  <td className="px-2 py-2 text-center text-xs">{item.purchaseBillingType || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 합계 영역 */}
        <div className="bg-gray-50 border-t px-4 py-3">
          <div className="flex justify-end items-center gap-8">
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

      {/* 비고 */}
      {approval.notes && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="text-sm w-full">
            <tbody>
              <tr>
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">비고</td>
                <td className="px-3 py-2">
                  <span className="text-sm">{approval.notes}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 메타 정보 */}
      <div className="flex justify-end">
        <div className="flex gap-6 text-sm text-gray-500">
          <span>생성일: {new Date(approval.createdAt).toLocaleString('ko-KR')}</span>
          {approval.updatedAt && (
            <span>수정일: {new Date(approval.updatedAt).toLocaleString('ko-KR')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
