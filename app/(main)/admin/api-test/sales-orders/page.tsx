'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface SalesOrder {
  id: string
  orderNumber: string
  status: string
  orderDate?: string
  managerName?: string
  vendorCompany?: string
  vendorContact?: string
  totalAmount?: number
  totalWithVat?: number
  createdAt: string
  items?: { id: string }[]
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: '발송완료', color: 'bg-blue-100 text-blue-700' },
  CONFIRMED: { label: '확인됨', color: 'bg-emerald-100 text-emerald-700' },
  DELIVERED: { label: '납품완료', color: 'bg-purple-100 text-purple-700' },
  CANCELLED: { label: '취소', color: 'bg-red-100 text-red-700' },
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`/api/sales-orders?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.data)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (err) {
      console.error('목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchOrders()
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">영업 발주서</h1>
          <p className="text-sm text-gray-500 mt-1">Sales Orders 테스트</p>
        </div>
        <Link
          href="/admin/api-test/sales-orders/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 발주서
        </Link>
      </div>

      {/* 검색 & 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            placeholder="발주번호, 매입처 검색..."
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
            <option value="SENT">발송완료</option>
            <option value="CONFIRMED">확인됨</option>
            <option value="DELIVERED">납품완료</option>
            <option value="CANCELLED">취소</option>
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
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">발주서가 없습니다</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">발주번호</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">매입처</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">담당자</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">공급가</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">VAT포함</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">발주일</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">품목수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => {
                const statusInfo = statusLabels[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' }
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/api-test/sales-orders/${order.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{order.vendorCompany || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.managerName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {Number(order.totalAmount || 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {Number(order.totalWithVat || 0).toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {order.orderDate ? new Date(order.orderDate).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {order.items?.length || 0}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            이전
          </button>
          <span className="px-4 py-2">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
