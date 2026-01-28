'use client'

import { useState, useEffect, use, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface OrderItem {
  id: string
  sortOrder: number
  partNumber?: string
  description?: string
  quantity: number
  srpPrice?: number
  unitPrice?: number
  totalPrice?: number
}

interface OrderFile {
  id: string
  fileType: string
  fileName: string
  fileSize?: number
  mimeType?: string
  uploadedAt: string
  uploadedBy?: { id: string; name: string }
}

interface OrderVersion {
  id: string
  version: number
  orderNumber: string
  status: string
  totalWithVat?: number | string
  createdAt: string
  isCurrent: boolean
}

interface SalesOrder {
  id: string
  orderNumber: string
  status: string
  orderDate?: string
  managerName?: string
  managerPhone?: string
  deliveryAddress?: string
  paymentTerms?: string
  vendorCompany?: string
  vendorContact?: string
  vendorPhone?: string
  vendorEmail?: string
  totalAmount: number
  vatAmount: number
  totalWithVat: number
  notes?: string
  createdById?: string
  createdBy?: { id: string; name: string }
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  deal?: { id: string; name: string }
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: '발송완료', color: 'bg-blue-100 text-blue-700' },
  CONFIRMED: { label: '확인됨', color: 'bg-emerald-100 text-emerald-700' },
  DELIVERED: { label: '납품완료', color: 'bg-purple-100 text-purple-700' },
  CANCELLED: { label: '취소', color: 'bg-red-100 text-red-700' },
}

const fileTypeLabels: Record<string, string> = {
  SIGNED_ORIGINAL: '직인 원본',
  EXCEL_ORIGINAL: '업로드 원본',
  EXCEL_GENERATED: '생성된 파일',
  CLIENT_PO: '고객 발주서',
  ATTACHMENT: '첨부파일',
}

export default function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [files, setFiles] = useState<OrderFile[]>([])
  const [versions, setVersions] = useState<OrderVersion[]>([])
  const [uploading, setUploading] = useState(false)
  const [creatingRevision, setCreatingRevision] = useState(false)

  // 현재 로그인된 사용자가 작성자인지 확인
  const isCreator = session?.user?.id && order?.createdById === session.user.id

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-orders/${id}/files`)
      if (res.ok) {
        const data = await res.json()
        setFiles(data)
      }
    } catch (err) {
      console.error('파일 목록 조회 실패:', err)
    }
  }, [id])

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-orders/${id}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(data.versions || [])
      }
    } catch (err) {
      console.error('버전 목록 조회 실패:', err)
    }
  }, [id])

  useEffect(() => {
    fetchOrder()
    fetchFiles()
    fetchVersions()
  }, [id, fetchFiles, fetchVersions])

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/sales-orders/${id}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
      }
    } catch (err) {
      console.error('발주서 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/sales-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...order,
          status: newStatus,
        }),
      })
      if (res.ok) {
        fetchOrder()
      }
    } catch (err) {
      console.error('상태 변경 실패:', err)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/sales-orders/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/sales/orders')
      }
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }

  // 새 버전 생성
  const handleCreateRevision = async () => {
    if (!order) return
    if (!confirm('현재 발주서를 기반으로 새 버전을 생성하시겠습니까?')) return

    setCreatingRevision(true)
    try {
      const res = await fetch(`/api/sales-orders/${id}/revise`, { method: 'POST' })
      if (res.ok) {
        const newOrder = await res.json()
        router.push(`/sales/orders/${newOrder.id}`)
      } else {
        const data = await res.json()
        alert(data.error || '새 버전 생성 실패')
      }
    } catch {
      alert('새 버전 생성에 실패했습니다')
    } finally {
      setCreatingRevision(false)
    }
  }

  // 파일 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', 'ATTACHMENT')

      const res = await fetch(`/api/sales-orders/${id}/files`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        await fetchFiles()
        alert('파일이 업로드되었습니다')
      } else {
        const data = await res.json()
        alert(data.error || '파일 업로드 실패')
      }
    } catch {
      alert('파일 업로드에 실패했습니다')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 파일 다운로드
  const handleFileDownload = async (fileId: string) => {
    try {
      const res = await fetch(`/api/sales-orders/${id}/files/${fileId}`)
      if (!res.ok) throw new Error('다운로드 URL 조회 실패')

      const data = await res.json()
      window.open(data.downloadUrl, '_blank')
    } catch {
      alert('파일 다운로드에 실패했습니다')
    }
  }

  // 파일 삭제
  const handleFileDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`"${fileName}" 파일을 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/sales-orders/${id}/files/${fileId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchFiles()
      } else {
        const data = await res.json()
        alert(data.error || '파일 삭제 실패')
      }
    } catch {
      alert('파일 삭제에 실패했습니다')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">발주서를 찾을 수 없습니다</div>
      </div>
    )
  }

  const statusInfo = statusLabels[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/sales/orders"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {order.vendorCompany && (
                <span className="text-sm text-gray-500">{order.vendorCompany}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/sales-orders/${id}/excel`}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            엑셀 다운로드
          </a>
          {order.status === 'DRAFT' && isCreator && (
            <>
              <Link
                href={`/sales/orders/${id}/edit`}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수정
              </Link>
              <button
                onClick={() => handleStatusChange('SENT')}
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {updating ? '처리중...' : '발송하기'}
              </button>
            </>
          )}
          {order.status === 'SENT' && (
            <button
              onClick={() => handleStatusChange('CONFIRMED')}
              disabled={updating}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              확인됨
            </button>
          )}
          {order.status === 'CONFIRMED' && (
            <button
              onClick={() => handleStatusChange('DELIVERED')}
              disabled={updating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              납품완료
            </button>
          )}
          {order.status !== 'DRAFT' && (
            <button
              onClick={handleCreateRevision}
              disabled={creatingRevision}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              {creatingRevision ? '생성 중...' : '새 버전'}
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            삭제
          </button>
        </div>
      </div>

      {/* 발주 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">발주 정보</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">발주일</p>
            <p className="font-medium">
              {order.orderDate ? new Date(order.orderDate).toLocaleDateString('ko-KR') : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">담당자</p>
            <p className="font-medium">{order.managerName || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">결제조건</p>
            <p className="font-medium">{order.paymentTerms || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">배송주소</p>
            <p className="font-medium">{order.deliveryAddress || '-'}</p>
          </div>
        </div>
      </div>

      {/* 매입처 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">매입처 정보</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">매입처</p>
            <p className="font-medium">{order.vendorCompany || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">담당자</p>
            <p className="font-medium">{order.vendorContact || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">연락처</p>
            <p className="font-medium">{order.vendorPhone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">이메일</p>
            <p className="font-medium">{order.vendorEmail || '-'}</p>
          </div>
        </div>
      </div>

      {/* 품목 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">발주 품목 ({order.items.length})</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">No.</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">P/N</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">품명</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">수량</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">정가</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">단가</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">합계</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.items.map((item, idx) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                <td className="px-4 py-3 text-sm font-mono">{item.partNumber || '-'}</td>
                <td className="px-4 py-3 text-sm">{item.description || '-'}</td>
                <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-500">
                  {Number(item.srpPrice || 0).toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {Number(item.unitPrice || 0).toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  {Number(item.totalPrice || 0).toLocaleString()}원
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 금액 요약 */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-4">금액 요약</h3>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-sm text-blue-600">공급가액</p>
            <p className="text-xl font-bold text-blue-900">
              {Number(order.totalAmount).toLocaleString()}원
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-600">부가세</p>
            <p className="text-xl font-bold text-blue-900">
              {Number(order.vatAmount).toLocaleString()}원
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-600">합계</p>
            <p className="text-xl font-bold text-blue-900">
              {Number(order.totalWithVat).toLocaleString()}원
            </p>
          </div>
        </div>
      </div>

      {/* 비고 */}
      {order.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">비고</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* 버전 이력 */}
      {versions.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">버전 이력 ({versions.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`px-6 py-4 flex items-center justify-between ${
                  version.isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-mono text-gray-500">v{version.version}</span>
                  <span className="font-medium">{version.orderNumber}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    statusLabels[version.status]?.color || 'bg-gray-100 text-gray-700'
                  }`}>
                    {statusLabels[version.status]?.label || version.status}
                  </span>
                  {version.isCurrent && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      현재
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {new Date(version.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                  {version.totalWithVat && (
                    <span className="text-sm font-medium">
                      {Number(version.totalWithVat).toLocaleString()}원
                    </span>
                  )}
                  {!version.isCurrent && (
                    <Link
                      href={`/sales/orders/${version.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      보기
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 파일 관리 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">첨부파일 ({files.length})</h3>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {uploading ? '업로드 중...' : '파일 추가'}
            </button>
          </div>
        </div>
        {files.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            첨부된 파일이 없습니다
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {files.map((file) => (
              <div key={file.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {fileTypeLabels[file.fileType] || file.fileType}
                      {file.fileSize && ` · ${(file.fileSize / 1024).toFixed(1)} KB`}
                      {' · '}
                      {new Date(file.uploadedAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFileDownload(file.id)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="다운로드"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleFileDelete(file.id, file.fileName)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="삭제"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
