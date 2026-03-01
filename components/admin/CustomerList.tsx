'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface CustomerContact {
  id: string
  name: string
  department?: string
  position?: string
  phone?: string
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
  updatedAt: string
  contacts?: CustomerContact[]
}

interface CustomerListProps {
  initialItems: Customer[]
  initialTotal: number
}

const emptyForm = { companyName: '', phone: '', fax: '', address: '', notes: '' }

export default function CustomerList({ initialItems, initialTotal }: CustomerListProps) {
  const [items, setItems] = useState<Customer[]>(initialItems)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(Math.ceil(initialTotal / 20) || 1)
  const limit = 20

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      if (search) params.set('search', search)
      const res = await fetch(`/api/customers?${params}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
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

  const openEdit = (c: Customer) => {
    setEditTarget(c)
    setForm({ companyName: c.companyName, phone: c.phone || '', fax: c.fax || '', address: c.address || '', notes: c.notes || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editTarget ? `/api/customers/${editTarget.id}` : '/api/customers'
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

  const handleDeactivate = async (c: Customer) => {
    if (!confirm(`${c.companyName}을(를) 비활성화하시겠습니까?`)) return
    const res = await fetch(`/api/customers/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    if (res.ok) fetchItems()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매출처 관리</h1>
          <p className="text-sm text-gray-500 mt-1">거래처(Customer) 목록 및 CRUD</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          매출처 추가
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
              placeholder="회사명으로 검색"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <button type="submit" className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">검색</button>
        </form>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">매출처 목록</h3>
          <span className="text-sm text-gray-500">총 <span className="font-semibold text-gray-900">{total}</span>개</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">등록된 매출처가 없습니다</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">회사명</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">전화</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">주소</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">수정일</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-600 hover:underline">
                        <Link href={`/admin/customers/${c.id}`}>{c.companyName}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{c.address || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(c.updatedAt).toLocaleDateString('ko-KR')}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(c)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">수정</button>
                          <button onClick={() => handleDeactivate(c)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded">비활성화</button>
                        </div>
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
              <h3 className="text-lg font-semibold text-gray-900">{editTarget ? '매출처 수정' : '매출처 추가'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">회사명 <span className="text-red-500">*</span></label>
                <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="(주)예시회사" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="02-1234-5678" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">팩스</label>
                  <input type="text" value={form.fax} onChange={(e) => setForm({ ...form, fax: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="02-1234-5679" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
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
