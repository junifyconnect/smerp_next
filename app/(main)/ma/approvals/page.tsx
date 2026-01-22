'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface MAApproval {
  id: string
  docNumber: string
  status: string
  approvalDate?: string
  managerName?: string
  clientCompany?: string
  totalAmount?: number
  purchaseAmount?: number
  createdAt: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: '승인대기', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: '승인완료', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-700' },
}

export default function MAApprovalsPage() {
  const router = useRouter()
  const [approvals, setApprovals] = useState<MAApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchApprovals = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/ma-approvals?${params}`)
      const data = await res.json()
      setApprovals(data.items || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR')
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MA 품의서</h1>
          <p className="text-sm text-gray-500 mt-1">유지보수 서비스 품의서 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/ma/approvals/new"
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            + 새 품의서
          </Link>
        </div>
      </div>

      {/* 검색/필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="고객사, 문서번호 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">전체 상태</option>
            <option value="DRAFT">작성중</option>
            <option value="PENDING">승인대기</option>
            <option value="APPROVED">승인완료</option>
            <option value="REJECTED">반려</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            검색
          </button>
        </form>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-600">총 {total}건</span>
          <button onClick={fetchApprovals} className="text-sm text-teal-600 hover:text-teal-700">
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : approvals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>MA 품의서가 없습니다</p>
            <Link href="/ma/approvals/new" className="text-teal-600 hover:underline mt-2 inline-block">
              새 품의서 작성하기
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-sm">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-600">문서번호</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">고객사</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">담당자</th>
                <th className="px-6 py-3 text-center font-medium text-gray-600">상태</th>
                <th className="px-6 py-3 text-right font-medium text-gray-600">매출액</th>
                <th className="px-6 py-3 text-right font-medium text-gray-600">매입액</th>
                <th className="px-6 py-3 text-center font-medium text-gray-600">품의일</th>
                <th className="px-6 py-3 text-center font-medium text-gray-600">생성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {approvals.map((approval) => (
                <tr
                  key={approval.id}
                  onClick={() => router.push(`/ma/approvals/${approval.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-teal-600">{approval.docNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{approval.clientCompany || '-'}</td>
                  <td className="px-6 py-4 text-sm">{approval.managerName || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusLabels[approval.status]?.color || 'bg-gray-100'}`}>
                      {statusLabels[approval.status]?.label || approval.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-blue-600">
                    {approval.totalAmount?.toLocaleString() || 0}원
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-red-600">
                    {approval.purchaseAmount?.toLocaleString() || 0}원
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">
                    {approval.approvalDate ? formatDate(approval.approvalDate) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">
                    {formatDate(approval.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
