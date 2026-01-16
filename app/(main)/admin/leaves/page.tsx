'use client'

import { useCallback, useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  department?: string
  position?: string
  annualLeave?: number
  additionalLeave?: number
}

interface LeaveRequest {
  id: string
  userId: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason?: string
  status: string
  deductFromAnnual: boolean
  cancelledAt?: string
  cancelledReason?: string
  createdAt: string
  user: User
}

const leaveTypeLabels: Record<string, { label: string; color: string }> = {
  ANNUAL: { label: '연차', color: 'bg-blue-100 text-blue-700' },
  HALF_AM: { label: '오전반차', color: 'bg-cyan-100 text-cyan-700' },
  HALF_PM: { label: '오후반차', color: 'bg-cyan-100 text-cyan-700' },
  SICK: { label: '병가', color: 'bg-red-100 text-red-700' },
  FAMILY: { label: '경조사', color: 'bg-purple-100 text-purple-700' },
  OFFICIAL: { label: '공가', color: 'bg-emerald-100 text-emerald-700' },
  OTHER: { label: '기타', color: 'bg-gray-100 text-gray-700' },
}

const statusLabels: Record<string, { label: string; color: string }> = {
  APPROVED: { label: '승인', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: '취소', color: 'bg-gray-100 text-gray-500' },
}

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())

  // 폼 상태
  const [formData, setFormData] = useState({
    userId: '',
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
  })

  const fetchLeaves = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        year: yearFilter,
      })

      const res = await fetch(`/api/leaves?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeaves(data.items || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch (err) {
      console.error('휴가 목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [page, yearFilter])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?limit=100')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error('사용자 목록 조회 실패:', err)
    }
  }, [])

  useEffect(() => {
    fetchLeaves()
    fetchUsers()
  }, [fetchLeaves, fetchUsers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setFormData({
          userId: '',
          leaveType: 'ANNUAL',
          startDate: '',
          endDate: '',
          reason: '',
        })
        setShowForm(false)
        fetchLeaves()
        fetchUsers() // 연차 잔여 갱신
        alert('휴가가 등록되었습니다')
      } else {
        const data = await res.json()
        alert(data.error || '휴가 등록 실패')
      }
    } catch {
      alert('휴가 등록에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('이 휴가를 취소하시겠습니까? 연차가 복구됩니다.')) return

    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: '관리자 취소' }),
      })

      if (res.ok) {
        fetchLeaves()
        fetchUsers() // 연차 잔여 갱신
        alert('휴가가 취소되었습니다')
      } else {
        const data = await res.json()
        alert(data.error || '휴가 취소 실패')
      }
    } catch {
      alert('휴가 취소에 실패했습니다')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const selectedUser = users.find(u => u.id === formData.userId)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">휴가 관리</h1>
          <p className="text-sm text-gray-500 mt-1">직원 휴가 신청 및 관리</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          휴가 등록
        </button>
      </div>

      {/* 연도 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">연도</label>
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
        </div>
      </div>

      {/* 휴가 등록 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">휴가 등록</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  직원 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">선택하세요</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) - 잔여 {(user.annualLeave || 0) + (user.additionalLeave || 0)}일
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  휴가 유형 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="ANNUAL">연차 (1일)</option>
                  <option value="HALF_AM">오전 반차 (0.5일)</option>
                  <option value="HALF_PM">오후 반차 (0.5일)</option>
                  <option value="SICK">병가 (연차 미차감)</option>
                  <option value="FAMILY">경조사 (연차 미차감)</option>
                  <option value="OFFICIAL">공가 (연차 미차감)</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종료일 {formData.leaveType === 'ANNUAL' && <span className="text-gray-400">(연속 휴가 시)</span>}
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">사유</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="휴가 사유 (선택)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* 선택된 직원 정보 */}
            {selectedUser && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <p className="font-medium text-blue-800">
                  {selectedUser.name}님 잔여 연차: {(selectedUser.annualLeave || 0) + (selectedUser.additionalLeave || 0)}일
                  <span className="text-blue-600 ml-2">
                    (기본 {selectedUser.annualLeave || 0}일 + 추가 {selectedUser.additionalLeave || 0}일)
                  </span>
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '처리중...' : '등록'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 휴가 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">휴가 목록</h3>
          <span className="text-sm text-gray-500">
            총 <span className="font-semibold text-gray-900">{total}</span>건
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : leaves.length === 0 ? (
          <div className="p-8 text-center text-gray-500">등록된 휴가가 없습니다</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">직원</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">유형</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">기간</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">일수</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">사유</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">상태</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className={`hover:bg-gray-50 ${leave.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{leave.user.name}</div>
                        <div className="text-xs text-gray-500">{leave.user.department || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${leaveTypeLabels[leave.leaveType]?.color || 'bg-gray-100'}`}>
                          {leaveTypeLabels[leave.leaveType]?.label || leave.leaveType}
                        </span>
                        {!leave.deductFromAnnual && (
                          <span className="ml-1 text-xs text-gray-400">(미차감)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(leave.startDate)}
                        {leave.startDate !== leave.endDate && (
                          <> ~ {formatDate(leave.endDate)}</>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {leave.days}일
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {leave.reason || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusLabels[leave.status]?.color || 'bg-gray-100'}`}>
                          {statusLabels[leave.status]?.label || leave.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {leave.status === 'APPROVED' && new Date(leave.startDate) > new Date() && (
                          <button
                            onClick={() => handleCancel(leave.id)}
                            className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          >
                            취소
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {page} 페이지 / {totalPages} 페이지
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    {'<<'}
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    {'<'}
                  </button>
                  <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{page}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    {'>'}
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    {'>>'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
