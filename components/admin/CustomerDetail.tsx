'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  contacts: CustomerContact[]
}

interface CustomerDetailProps {
  customer: Customer
}

const emptyContactForm = { name: '', department: '', position: '', phone: '', email: '', isDefault: false }

export default function CustomerDetail({ customer }: CustomerDetailProps) {
  const router = useRouter()
  const [info, setInfo] = useState({
    companyName: customer.companyName,
    phone: customer.phone || '',
    fax: customer.fax || '',
    address: customer.address || '',
    notes: customer.notes || '',
  })
  const [savingInfo, setSavingInfo] = useState(false)

  const [contacts, setContacts] = useState<CustomerContact[]>(customer.contacts)
  const [showContactModal, setShowContactModal] = useState(false)
  const [editContact, setEditContact] = useState<CustomerContact | null>(null)
  const [contactForm, setContactForm] = useState(emptyContactForm)
  const [savingContact, setSavingContact] = useState(false)

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingInfo(true)
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const d = await res.json()
        alert(d.error || '저장 실패')
      }
    } finally {
      setSavingInfo(false)
    }
  }

  const openAddContact = () => {
    setEditContact(null)
    setContactForm(emptyContactForm)
    setShowContactModal(true)
  }

  const openEditContact = (c: CustomerContact) => {
    setEditContact(c)
    setContactForm({ name: c.name, department: c.department || '', position: c.position || '', phone: c.phone || '', email: c.email || '', isDefault: c.isDefault })
    setShowContactModal(true)
  }

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingContact(true)
    try {
      const url = editContact
        ? `/api/customers/${customer.id}/contacts/${editContact.id}`
        : `/api/customers/${customer.id}/contacts`
      const method = editContact ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editContact) {
          setContacts(contacts.map(c => c.id === editContact.id ? saved : (contactForm.isDefault ? { ...c, isDefault: false } : c)))
        } else {
          setContacts(contactForm.isDefault ? [...contacts.map(c => ({ ...c, isDefault: false })), saved] : [...contacts, saved])
        }
        setShowContactModal(false)
      } else {
        const d = await res.json()
        alert(d.error || '저장 실패')
      }
    } finally {
      setSavingContact(false)
    }
  }

  const handleDeleteContact = async (c: CustomerContact) => {
    if (!confirm(`${c.name} 담당자를 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/customers/${customer.id}/contacts/${c.id}`, { method: 'DELETE' })
    if (res.ok) {
      setContacts(contacts.filter(ct => ct.id !== c.id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{customer.companyName}</h1>
      </div>

      {/* 기본정보 수정 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">회사명 <span className="text-red-500">*</span></label>
              <input type="text" value={info.companyName} onChange={(e) => setInfo({ ...info, companyName: e.target.value })} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">전화</label>
              <input type="text" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">팩스</label>
              <input type="text" value={info.fax} onChange={(e) => setInfo({ ...info, fax: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
              <input type="text" value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
            <textarea value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingInfo} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {savingInfo ? '저장중...' : '저장'}
            </button>
          </div>
        </form>
      </div>

      {/* 담당자 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">담당자</h2>
          <button onClick={openAddContact} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            담당자 추가
          </button>
        </div>
        {contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">등록된 담당자가 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">이름</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">부서</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">직급</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">전화</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">이메일</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-gray-900">{c.name}</span>
                      {c.isDefault && (
                        <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">기본</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.department || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.position || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.email || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEditContact(c)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">수정</button>
                        <button onClick={() => handleDeleteContact(c)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded">삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 담당자 모달 */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editContact ? '담당자 수정' : '담당자 추가'}</h3>
              <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 <span className="text-red-500">*</span></label>
                <input type="text" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                  <input type="text" value={contactForm.department} onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">직급</label>
                  <input type="text" value={contactForm.position} onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화</label>
                  <input type="text" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                  <input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={contactForm.isDefault} onChange={(e) => setContactForm({ ...contactForm, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">기본 담당자로 설정</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowContactModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">취소</button>
                <button type="submit" disabled={savingContact} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {savingContact ? '처리중...' : (editContact ? '수정' : '추가')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
