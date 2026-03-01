'use client'

import { useCallback, useEffect, useState } from 'react'

interface Vendor {
  id: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  notes?: string
  usageCount: number
  isActive: boolean
  updatedAt: string
}

interface VendorListProps {
  initialItems: Vendor[]
  initialTotal: number
}

const emptyForm = { name: '', contactName: '', phone: '', email: '', notes: '' }

export default function VendorList({ initialItems, initialTotal }: VendorListProps) {
  const [items, setItems] = useState<Vendor[]>(initialItems)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(Math.ceil(initialTotal / 20) || 1)
  const limit = 20

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Vendor | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      if (search) params.set('search', search)
      const res = await fetch(`/api/vendors?${params}`)
      if (res.ok) {
        const data = await res.json()
        // API가 배열 또는 페이지네이션 객체 둘 다 처리
        if (Array.isArray(data)) {
          setItems(data)
          setTotal(data.length)
          setTotalPages(1)
        } else {
          setItems(data.items || [])
          setTotal(data.total || 0)
          setTotalPages(data.totalPages || 1)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openAdd = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (v: Vendor) => {
    setEditTarget(v)
    setForm({ name: v.name, contactName: v.contactName || '', phone: v.phone || '', email: v.email || '', notes: v.notes || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editTarget ? `/api/vendors/${editTarget.id}` : '/api/vendors'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowModal(false)
        fetchItems()
      } else {
        const d = await res.json()
        alert(d.error || '저장 실패')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매입처 관리</h1>
          <p className="text-sm text-gray-500 mt-1">공급업체(Vendor) 목록 및 CRUD</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          매입처 추가
        </button>
      </div>

      {/* 검색 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchItems() }} className="flex gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="매입처명으로 검색"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <button type="submit" className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">검색</button>
        </form>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">매입처 목록</h3>
          <span className="text-sm text-gray-500">총 <span className="font-semibold text-gray-900">{total}</span>개</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">등록된 매입처가 없습니다</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">매입처명</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">담당자</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">전화</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">이메일</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">사용횟수</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">수정일</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.contactName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{v.usageCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(v.updatedAt).toLocaleDateString('ko-KR')}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openEdit(v)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">수정</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">{page} / {totalPages} 페이지 (총 {total}개)</div>
              <div className="flex gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 border rounded text-sm disabled:opacity-50">{'<<'}</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border rounded text-sm disabled:opacity-50">{'<'}</button>
                <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{page}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 border rounded text-sm disabled:opacity-50">{'>'}</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 border rounded text-sm disabled:opacity-50">{'>>'}</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editTarget ? '매입처 수정' : '매입처 추가'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">매입처명 <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자명</label>
                  <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">취소</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? '처리중...' : (editTarget ? '수정' : '추가')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
