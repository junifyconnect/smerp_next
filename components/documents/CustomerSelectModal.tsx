'use client'

import { useState, useEffect, useCallback } from 'react'
import { UilSearch, UilTimes, UilPlus, UilBuilding, UilUser } from '@iconscout/react-unicons'

interface CustomerContact {
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
  contacts: CustomerContact[]
}

interface SelectedCustomerData {
  companyName: string
  contactName: string
  phone: string
  fax: string
  mobile: string
  email: string
}

interface CustomerSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (data: SelectedCustomerData) => void
}

export function CustomerSelectModal({ isOpen, onClose, onSelect }: CustomerSelectModalProps) {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [step, setStep] = useState<'company' | 'contact'>('company')

  // 신규 거래처 등록 폼
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    companyName: '',
    phone: '',
    fax: '',
  })
  const [newContact, setNewContact] = useState({
    name: '',
    department: '',
    position: '',
    phone: '',
    mobile: '',
    email: '',
  })
  const [saving, setSaving] = useState(false)

  // 거래처 검색
  const searchCustomers = useCallback(async (searchTerm: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm)}&includeContacts=true&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.items || [])
      }
    } catch (err) {
      console.error('거래처 검색 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 검색 debounce
  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      searchCustomers(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, searchCustomers, isOpen])

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedCustomer(null)
      setStep('company')
      setShowNewCustomerForm(false)
      searchCustomers('')
    }
  }, [isOpen, searchCustomers])

  // 회사 선택
  const handleSelectCompany = (customer: Customer) => {
    setSelectedCustomer(customer)
    if (customer.contacts.length === 0) {
      // 담당자가 없으면 회사 정보만으로 선택
      onSelect({
        companyName: customer.companyName,
        contactName: '',
        phone: customer.phone || '',
        fax: customer.fax || '',
        mobile: '',
        email: '',
      })
      onClose()
    } else if (customer.contacts.length === 1) {
      // 담당자가 1명이면 바로 선택
      const contact = customer.contacts[0]
      onSelect({
        companyName: customer.companyName,
        contactName: contact.name,
        phone: contact.phone || customer.phone || '',
        fax: customer.fax || '',
        mobile: contact.mobile || '',
        email: contact.email || '',
      })
      onClose()
    } else {
      // 담당자가 여러 명이면 선택 단계로
      setStep('contact')
    }
  }

  // 담당자 선택
  const handleSelectContact = (contact: CustomerContact) => {
    if (!selectedCustomer) return

    onSelect({
      companyName: selectedCustomer.companyName,
      contactName: contact.name,
      phone: contact.phone || selectedCustomer.phone || '',
      fax: selectedCustomer.fax || '',
      mobile: contact.mobile || '',
      email: contact.email || '',
    })
    onClose()
  }

  // 신규 거래처 저장
  const handleSaveNewCustomer = async () => {
    if (!newCustomer.companyName || !newContact.name) {
      alert('회사명과 담당자명은 필수입니다')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCustomer,
          contacts: [newContact],
        }),
      })

      if (res.ok) {
        // 저장 성공 후 바로 선택
        onSelect({
          companyName: newCustomer.companyName,
          contactName: newContact.name,
          phone: newContact.phone || newCustomer.phone || '',
          fax: newCustomer.fax || '',
          mobile: newContact.mobile || '',
          email: newContact.email || '',
        })
        onClose()
      } else {
        const data = await res.json()
        alert(data.error || '저장에 실패했습니다')
      }
    } catch (err) {
      alert('저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            {step === 'contact' && (
              <button
                onClick={() => {
                  setStep('company')
                  setSelectedCustomer(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-900">
              {showNewCustomerForm
                ? '신규 거래처 등록'
                : step === 'company'
                  ? '거래처 선택'
                  : `${selectedCustomer?.companyName} - 담당자 선택`}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <UilTimes size={20} />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showNewCustomerForm ? (
            // 신규 거래처 등록 폼
            <div className="p-6 space-y-6 overflow-y-auto">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <UilBuilding size={18} />
                  회사 정보
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">회사명 *</label>
                    <input
                      type="text"
                      value={newCustomer.companyName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, companyName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="회사명"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">대표 전화</label>
                    <input
                      type="text"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="02-1234-5678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">팩스</label>
                    <input
                      type="text"
                      value={newCustomer.fax}
                      onChange={(e) => setNewCustomer({ ...newCustomer, fax: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="02-1234-5679"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <UilUser size={18} />
                  담당자 정보
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">담당자명 *</label>
                    <input
                      type="text"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="홍길동"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">부서</label>
                    <input
                      type="text"
                      value={newContact.department}
                      onChange={(e) => setNewContact({ ...newContact, department: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="IT팀"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">직급</label>
                    <input
                      type="text"
                      value={newContact.position}
                      onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="과장"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">전화</label>
                    <input
                      type="text"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="02-1234-5678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">휴대폰</label>
                    <input
                      type="text"
                      value={newContact.mobile}
                      onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="010-1234-5678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">이메일</label>
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="email@company.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : step === 'company' ? (
            // 회사 선택
            <>
              {/* 검색 */}
              <div className="px-6 py-4 border-b">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UilSearch size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm"
                    placeholder="회사명으로 검색..."
                    autoFocus
                  />
                </div>
              </div>

              {/* 목록 */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">검색 중...</div>
                ) : customers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {search ? '검색 결과가 없습니다' : '등록된 거래처가 없습니다'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCompany(customer)}
                        className="w-full px-6 py-4 text-left hover:bg-blue-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{customer.companyName}</div>
                          <div className="text-sm text-gray-500">
                            {customer.contacts.length > 0
                              ? `담당자 ${customer.contacts.length}명`
                              : '담당자 없음'}
                            {customer.phone && ` · ${customer.phone}`}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            // 담당자 선택
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y">
                {selectedCustomer?.contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="w-full px-6 py-4 text-left hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{contact.name}</span>
                      {contact.isDefault && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">기본</span>
                      )}
                      {contact.position && (
                        <span className="text-sm text-gray-500">{contact.position}</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {contact.department && `${contact.department} · `}
                      {contact.phone || contact.mobile || '연락처 없음'}
                      {contact.email && ` · ${contact.email}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          {showNewCustomerForm ? (
            <>
              <button
                onClick={() => {
                  setShowNewCustomerForm(false)
                  setNewCustomer({ companyName: '', phone: '', fax: '' })
                  setNewContact({ name: '', department: '', position: '', phone: '', mobile: '', email: '' })
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleSaveNewCustomer}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장 및 선택'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowNewCustomerForm(true)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <UilPlus size={18} />
                신규 거래처 등록
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                닫기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
