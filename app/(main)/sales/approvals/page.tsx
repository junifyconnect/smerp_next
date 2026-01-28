'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface SalesApproval {
  id: string
  approvalNumber: string
  status: string
  approvalCode?: string
  approvalDate?: string
  managerName?: string
  clientCompany?: string
  endUser?: string
  totalAmount?: number
  totalWithVat?: number
  purchaseTotal?: number
  createdAt: string
  _count?: { items: number; purchaseItems: number }
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: '승인대기', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: '승인완료', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-700' },
}

export default function SalesApprovalsPage() {
  const [approvals, setApprovals] = useState<SalesApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchApprovals = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`/api/sales-approvals?${params}`)
      if (res.ok) {
        const data = await res.json()
        setApprovals(data.items)
        setTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error('목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchApprovals()
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">영업 품의서</h1>
          <p className="text-sm text-gray-500 mt-1">Sales Approvals 테스트</p>
        </div>
        <Link
          href="/sales/approvals/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 품의서
        </Link>
      </div>

      {/* 검색 & 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            placeholder="품의번호, 품의코드, 고객사 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 상태</option>
            <option value="DRAFT">작성중</option>
            <option value="PENDING">승인대기</option>
            <option value="APPROVED">승인완료</option>
            <option value="REJECTED">반려</option>
          </select>
          <button
            type="submit"
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            검색
          </button>
        </form>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500">품의서가 없습니다</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">품의코드</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">고객사</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">담당자</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">매출(VAT포함)</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">매입</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">상태</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">작성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approvals.map((approval) => (
                <tr key={approval.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/sales/approvals/${approval.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {approval.approvalCode || approval.approvalNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {approval.clientCompany || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {approval.managerName || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-medium">
                    {approval.totalWithVat?.toLocaleString() || 0}원
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-gray-600">
                    {approval.purchaseTotal?.toLocaleString() || 0}원
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[approval.status]?.color || 'bg-gray-100'}`}>
                      {statusLabels[approval.status]?.label || approval.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-gray-500">
                    {new Date(approval.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
