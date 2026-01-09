'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface OrderItem {
  partNumber?: string
  description?: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
}

interface SalesOrder {
  id: string
  docNumber: string
  status: string
  orderDate?: string
  managerName?: string
  vendorCompany?: string
  vendorContact?: string
  vendorPhone?: string
  deliveryAddress?: string
  paymentTerms?: string
  totalAmount?: number
  items: OrderItem[]
  createdAt: string
}

type TabType = 'create' | 'list'

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  CONFIRMED: { label: '확정', color: 'bg-blue-100 text-blue-700' },
  SENT: { label: '발송', color: 'bg-green-100 text-green-700' },
  DELIVERED: { label: '납품완료', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: '취소', color: 'bg-red-100 text-red-700' },
}

export default function SalesOrdersTestPage() {
  const [activeTab, setActiveTab] = useState<TabType>('create')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/api-test" className="text-gray-500 hover:text-gray-700">← 목록</Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">영업 발주서 테스트</h1>
          <p className="text-sm text-gray-500">Sales Order - 발주서 생성, 발주 관리</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { key: 'create', label: '발주서 생성' },
            { key: 'list', label: '목록 조회' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'create' && <CreateOrderTab />}
      {activeTab === 'list' && <OrderListTab />}
    </div>
  )
}

function CreateOrderTab() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; data?: SalesOrder; error?: string } | null>(null)

  const getToday = () => {
    const d = new Date()
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const [formData, setFormData] = useState({
    orderDate: getToday(),
    managerName: '',
    vendorCompany: '',
    vendorContact: '',
    vendorPhone: '',
    vendorEmail: '',
    deliveryAddress: '',
    paymentTerms: '',
    notes: '',
  })

  const [items, setItems] = useState<OrderItem[]>([
    { partNumber: '', description: '', quantity: 1, unitPrice: 0, totalPrice: 0 },
  ])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    setItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : newItems[index].quantity
        const price = field === 'unitPrice' ? Number(value) : newItems[index].unitPrice || 0
        newItems[index].totalPrice = qty * price
      }
      return newItems
    })
  }

  const addItem = () => setItems(prev => [...prev, { partNumber: '', description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }])
  const removeItem = (i: number) => items.length > 1 && setItems(prev => prev.filter((_, idx) => idx !== i))

  const calculateTotal = () => items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

  const handleSubmit = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: items.map(item => ({
            partNumber: item.partNumber || undefined,
            description: item.description || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice || undefined,
          })),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, data })
      } else {
        setResult({ success: false, error: data.error || '생성 실패' })
      }
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : '알 수 없는 오류' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {result.success ? (
            <div>
              <p className="font-medium text-green-800">발주서가 생성되었습니다!</p>
              <p className="text-sm text-green-700 mt-1">문서번호: {result.data?.docNumber}</p>
            </div>
          ) : (
            <p className="font-medium text-red-800">오류: {result.error}</p>
          )}
        </div>
      )}

      {/* 발주 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">발주 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">발주일</label>
            <input type="text" value={formData.orderDate} onChange={(e) => handleInputChange('orderDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
            <input type="text" value={formData.managerName} onChange={(e) => handleInputChange('managerName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">결제조건</label>
            <input type="text" value={formData.paymentTerms} onChange={(e) => handleInputChange('paymentTerms', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="익월 말일" />
          </div>
        </div>
      </div>

      {/* 공급업체 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">공급업체 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">업체명</label>
            <input type="text" value={formData.vendorCompany} onChange={(e) => handleInputChange('vendorCompany', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
            <input type="text" value={formData.vendorContact} onChange={(e) => handleInputChange('vendorContact', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input type="tel" value={formData.vendorPhone} onChange={(e) => handleInputChange('vendorPhone', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">배송주소</label>
            <input type="text" value={formData.deliveryAddress} onChange={(e) => handleInputChange('deliveryAddress', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* 품목 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">발주 품목</h3>
          <button onClick={addItem} className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700">+ 추가</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-medium">P/N</th>
              <th className="px-3 py-2 text-left font-medium">품목</th>
              <th className="px-3 py-2 text-right font-medium w-20">수량</th>
              <th className="px-3 py-2 text-right font-medium w-28">단가</th>
              <th className="px-3 py-2 text-right font-medium w-32">합계</th>
              <th className="px-3 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, i) => (
              <tr key={i}>
                <td className="px-3 py-2"><input type="text" value={item.partNumber || ''} onChange={(e) => handleItemChange(i, 'partNumber', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" /></td>
                <td className="px-3 py-2"><input type="text" value={item.description || ''} onChange={(e) => handleItemChange(i, 'description', e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" /></td>
                <td className="px-3 py-2"><input type="number" value={item.quantity} onChange={(e) => handleItemChange(i, 'quantity', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border rounded text-sm text-right" min="1" /></td>
                <td className="px-3 py-2"><input type="number" value={item.unitPrice || ''} onChange={(e) => handleItemChange(i, 'unitPrice', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border rounded text-sm text-right" /></td>
                <td className="px-3 py-2 text-right font-medium">{(item.totalPrice || 0).toLocaleString()}원</td>
                <td className="px-3 py-2 text-center"><button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700">X</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 text-right text-sm"><span className="text-gray-600">합계: </span><span className="font-bold text-orange-600">{calculateTotal().toLocaleString()}원</span></div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={loading} className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50">
          {loading ? '저장 중...' : '발주서 생성'}
        </button>
      </div>
    </div>
  )
}

function OrderListTab() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sales-orders?limit=20')
      const data = await res.json()
      setOrders(data.items || [])
    } catch (err) {
      console.error('목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [])

  const handleViewDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/sales-orders/${id}`)
      const data = await res.json()
      setSelectedOrder(data)
    } catch (err) {
      console.error('상세 조회 실패:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/sales-orders/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchOrders()
        if (selectedOrder?.id === id) setSelectedOrder(null)
      }
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">발주서 목록</h3>
          <button onClick={fetchOrders} className="text-sm text-orange-600 hover:text-orange-700">새로고침</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">발주서가 없습니다</div>
        ) : (
          <div className="divide-y">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedOrder?.id === order.id ? 'bg-orange-50' : ''}`}
                onClick={() => handleViewDetail(order.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-orange-600">{order.docNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[order.status]?.color || 'bg-gray-100'}`}>
                    {statusLabels[order.status]?.label || order.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600">{order.vendorCompany || '-'}</div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{new Date(order.createdAt).toLocaleDateString('ko-KR')}</span>
                  <span className="font-medium">{order.totalAmount?.toLocaleString() || 0}원</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">상세 정보</h3>
        </div>

        {selectedOrder ? (
          <div className="p-4 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">문서번호</span><span className="font-medium">{selectedOrder.docNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">공급업체</span><span>{selectedOrder.vendorCompany || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">담당자</span><span>{selectedOrder.vendorContact || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">금액</span><span className="font-medium text-orange-600">{selectedOrder.totalAmount?.toLocaleString() || 0}원</span></div>
            </div>

            <div className="pt-4 flex gap-2">
              <button onClick={() => handleDelete(selectedOrder.id)} className="px-4 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200">삭제</button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">목록에서 발주서를 선택하세요</div>
        )}
      </div>
    </div>
  )
}
