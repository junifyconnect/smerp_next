'use client'

import { useCallback, useEffect, useState } from 'react'

interface Contact {
  id: string
  name: string
  department?: string
  position?: string
  phone?: string
  mobile?: string
  email?: string
  isDefault: boolean
}

interface Customer {
  id: string
  companyName: string
  phone?: string
  fax?: string
  address?: string
  notes?: string
  isActive: boolean
  createdAt: string
  contacts?: Contact[]
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // 상세 보기 모달
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // 폼 상태
  const [formData, setFormData] = useState({
    companyName: '',
    phone: '',
    fax: '',
    address: '',
    notes: '',
    contactName: '',
    contactPhone: '',
    contactMobile: '',
    contactEmail: '',
  })

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        includeContacts: 'true',
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/customers?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.items || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch (err) {
      console.error('조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchCustomers()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          phone: formData.phone,
          fax: formData.fax,
          address: formData.address,
          notes: formData.notes,
          contacts: formData.contactName ? [{
            name: formData.contactName,
            phone: formData.contactPhone,
            mobile: formData.contactMobile,
            email: formData.contactEmail,
          }] : [],
        }),
      })

      if (res.ok) {
        setFormData({
          companyName: '',
          phone: '',
          fax: '',
          address: '',
          notes: '',
          contactName: '',
          contactPhone: '',
          contactMobile: '',
          contactEmail: '',
        })
        setShowForm(false)
        fetchCustomers()
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
    if (!confirm(`${name} 거래처를 정말 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchCustomers()
      } else {
        const data = await res.json()
        alert(data.error || '삭제 실패')
      }
    } catch {
      alert('삭제에 실패했습니다')
    }
  }

  const openDetailModal = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDetailModal(true)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">거래처 관리</h1>
          <p className="text-sm text-gray-500 mt-1">거래처 및 담당자 정보 관리</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          거래처 추가
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
              placeholder="회사명으로 검색"
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

      {/* 거래처 등록 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">새 거래처 등록</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  회사명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(주)서버메이트"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대표전화</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="02-1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">팩스</label>
                <input
                  type="tel"
                  value={formData.fax}
                  onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="02-1234-5679"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="서울시 강남구..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="메모"
                />
              </div>
            </div>

            {/* 담당자 정보 */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">담당자 정보 (선택)</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자명</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="02-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">휴대폰</label>
                  <input
                    type="tel"
                    value={formData.contactMobile}
                    onChange={(e) => setFormData({ ...formData, contactMobile: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="010-1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="contact@company.com"
                  />
                </div>
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

      {/* 거래처 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">거래처 목록</h3>
          <span className="text-sm text-gray-500">
            총 <span className="font-semibold text-gray-900">{total}</span>개
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">등록된 거래처가 없습니다</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">회사명</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">대표전화</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">팩스</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">대표 담당자</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">담당자 연락처</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customers.map((customer) => {
                    const defaultContact = customer.contacts?.find(c => c.isDefault) || customer.contacts?.[0]
                    return (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openDetailModal(customer)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {customer.companyName}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{customer.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{customer.fax || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{defaultContact?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {defaultContact?.mobile || defaultContact?.phone || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(customer.id, customer.companyName)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {page} 페이지 / {totalPages} 페이지 (총 {total}개)
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
          </>
        )}
      </div>

      {/* 상세 보기 모달 */}
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedCustomer.companyName}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 회사 정보 */}
            <div className="space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">대표전화:</span>
                  <span className="ml-2 text-gray-900">{selectedCustomer.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">팩스:</span>
                  <span className="ml-2 text-gray-900">{selectedCustomer.fax || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">주소:</span>
                  <span className="ml-2 text-gray-900">{selectedCustomer.address || '-'}</span>
                </div>
                {selectedCustomer.notes && (
                  <div className="col-span-2">
                    <span className="text-gray-500">비고:</span>
                    <span className="ml-2 text-gray-900">{selectedCustomer.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 담당자 목록 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">담당자 목록</h4>
              {selectedCustomer.contacts && selectedCustomer.contacts.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomer.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className={`p-3 rounded-lg border ${contact.isDefault ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{contact.name}</span>
                        {contact.isDefault && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">기본</span>
                        )}
                        {contact.department && (
                          <span className="text-xs text-gray-500">{contact.department}</span>
                        )}
                        {contact.position && (
                          <span className="text-xs text-gray-500">{contact.position}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-x-4">
                        {contact.phone && <span>전화: {contact.phone}</span>}
                        {contact.mobile && <span>휴대폰: {contact.mobile}</span>}
                        {contact.email && <span>이메일: {contact.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">등록된 담당자가 없습니다</p>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
