'use client'

import { useCallback, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  name: string
  phone?: string
  department?: string
  position?: string
  role?: string
  annualLeave?: number
  additionalLeave?: number
  isActive: boolean
  createdAt: string
}

interface LeaveGrantForm {
  userId: string
  userName: string
  type: 'annual' | 'additional'
  amount: number
  reason: string
}

const departmentLabels: Record<string, string> = {
  SALES: '영업팀',
  TECH: '기술팀',
  MANAGEMENT: '경영팀',
  CEO: 'CEO',
}

const departmentColors: Record<string, string> = {
  SALES: 'bg-blue-100 text-blue-700',
  TECH: 'bg-emerald-100 text-emerald-700',
  MANAGEMENT: 'bg-orange-100 text-orange-700',
  CEO: 'bg-purple-100 text-purple-700',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  // 휴가 부여 모달 상태
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState<LeaveGrantForm>({
    userId: '',
    userName: '',
    type: 'annual',
    amount: 1,
    reason: '',
  })
  const [grantingLeave, setGrantingLeave] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // 폼 상태
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    name: '',
    phone: '',
    department: 'SALES',
    position: '',
    annualLeave: 0,
  })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || data.items || data)
        setTotal(data.total || data.users?.length || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch (err) {
      console.error('조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const email = `${formData.userId}@servermate.net`
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, email }),
      })

      if (res.ok) {
        setFormData({
          userId: '',
          password: '',
          name: '',
          phone: '',
          department: 'SALES',
          position: '',
          annualLeave: 0,
        })
        setShowForm(false)
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.error || '등록 실패')
      }
    } catch {
      alert('등록에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} 직원을 정말 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.error || '삭제 실패')
      }
    } catch {
      alert('삭제에 실패했습니다')
    }
  }

  const openLeaveModal = (user: User) => {
    setLeaveForm({
      userId: user.id,
      userName: user.name,
      type: 'annual',
      amount: 1,
      reason: '',
    })
    setShowLeaveModal(true)
  }

  const handleGrantLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGrantingLeave(true)

    try {
      const res = await fetch(`/api/users/${leaveForm.userId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: leaveForm.type,
          amount: leaveForm.amount,
          reason: leaveForm.reason,
        }),
      })

      if (res.ok) {
        setShowLeaveModal(false)
        fetchUsers()
        alert(`${leaveForm.userName}님에게 ${leaveForm.type === 'annual' ? '연차' : '추가휴가'} ${leaveForm.amount}일이 부여되었습니다.`)
      } else {
        const data = await res.json()
        alert(data.error || '휴가 부여 실패')
      }
    } catch {
      alert('휴가 부여에 실패했습니다')
    } finally {
      setGrantingLeave(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">직원 관리</h1>
          <p className="text-sm text-gray-500 mt-1">직원 등록 및 정보 관리</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          직원 추가
        </button>
      </div>

      {/* 검색 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색어를 입력하세요"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            검색
          </button>
        </form>
      </div>

      {/* 직원 등록 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">새 직원 등록</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사용자 ID <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder=""
                  />
                  <span className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-lg text-sm">
                    @servermate.net
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="6자 이상"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">소속팀</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="SALES">영업팀</option>
                  <option value="TECH">기술팀</option>
                  <option value="MANAGEMENT">경영팀</option>
                  <option value="CEO">CEO</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직책</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="부장, CEO, 대리, 실장, 사원, 인턴"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="010-1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연차</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.annualLeave}
                  onChange={(e) => setFormData({ ...formData, annualLeave: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
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

      {/* 직원 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            직원 목록
          </h3>
          <span className="text-sm text-gray-500">
            총 <span className="font-semibold text-gray-900">{total}</span>명
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">등록된 직원이 없습니다</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">이름</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">이메일</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">소속팀</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">직책</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">연락처</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">연차</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">추가휴가</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${departmentColors[user.department || ''] || 'bg-gray-100 text-gray-700'}`}>
                          {departmentLabels[user.department || ''] || user.department || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.position || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {user.annualLeave ?? 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {user.additionalLeave ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openLeaveModal(user)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            휴가 부여
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.name)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {page} 페이지 / {totalPages} 페이지 (총 {total}명)
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={limit}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                  disabled
                >
                  <option value={20}>20개씩 보기</option>
                </select>
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
          </>
        )}
      </div>

      {/* 휴가 부여 모달 */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                휴가 부여 - {leaveForm.userName}
              </h3>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleGrantLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  휴가 종류
                </label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as 'annual' | 'additional' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="annual">연차</option>
                  <option value="additional">추가휴가</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  부여 일수
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={leaveForm.amount}
                  onChange={(e) => setLeaveForm({ ...leaveForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사유 (선택)
                </label>
                <input
                  type="text"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="예: 연차 정산, 포상휴가 등"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={grantingLeave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {grantingLeave ? '처리중...' : '부여하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
