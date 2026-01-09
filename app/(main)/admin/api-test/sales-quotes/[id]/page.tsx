'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface QuoteItem {
  id?: string
  partNumber?: string
  description?: string
  quantity: number
  srpPrice?: number
  unitPrice?: number
  totalPrice?: number
}

interface QuoteFile {
  id: string
  fileType: string
  fileName: string
  fileSize?: number
  mimeType?: string
  uploadedAt: string
  uploadedBy?: { id: string; name: string }
}

interface QuoteVersion {
  id: string
  version: number
  status: string
  quoteDate?: string
  totalWithVat?: number | string
  createdAt: string
  displayName: string
  isCurrent: boolean
}

interface SalesQuote {
  id: string
  status: string
  projectName?: string
  productName?: string
  managerName?: string
  clientCompany?: string
  clientContact?: string
  clientPhone?: string
  clientFax?: string
  clientMobile?: string
  clientEmail?: string
  quoteDate?: string
  validUntil?: string
  deliveryDate?: string
  paymentTerms?: string
  totalAmount?: number
  vatAmount?: number
  totalWithVat?: number
  notes?: string
  items: QuoteItem[]
  files?: QuoteFile[]
  deal?: { id: string; name: string; status: string }
  createdBy?: { id: string; name: string }
  createdAt: string
  updatedAt?: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: '발송', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: '수주', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '실주', color: 'bg-red-100 text-red-700' },
}

const fileTypeLabels: Record<string, string> = {
  SIGNED_ORIGINAL: '직인 원본',
  EXCEL_ORIGINAL: '업로드 원본',
  EXCEL_GENERATED: '생성된 파일',
  CLIENT_PO: '고객 발주서',
  ATTACHMENT: '첨부파일',
}

export default function SalesQuoteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [quote, setQuote] = useState<SalesQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [files, setFiles] = useState<QuoteFile[]>([])
  const [versions, setVersions] = useState<QuoteVersion[]>([])
  const [uploading, setUploading] = useState(false)
  const [creatingRevision, setCreatingRevision] = useState(false)

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-quotes/${id}`)
      if (res.ok) {
        const data = await res.json()
        setQuote(data)
      } else {
        router.push('/admin/api-test/sales-quotes')
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push('/admin/api-test/sales-quotes')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-quotes/${id}/files`)
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
      const res = await fetch(`/api/sales-quotes/${id}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(data.versions || [])
      }
    } catch (err) {
      console.error('버전 목록 조회 실패:', err)
    }
  }, [id])

  useEffect(() => {
    fetchQuote()
    fetchFiles()
    fetchVersions()
  }, [fetchQuote, fetchFiles, fetchVersions])

  const handleStatusChange = async (newStatus: string) => {
    if (!quote) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/sales-quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        const updatedQuote = await res.json()
        setQuote(updatedQuote)
      } else {
        const data = await res.json()
        alert(data.error || '상태 변경 실패')
      }
    } catch {
      alert('상태 변경에 실패했습니다')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDownloadExcel = async () => {
    if (!quote) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/sales-quotes/${id}/excel`)
      if (!res.ok) throw new Error('다운로드 실패')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = quote.projectName || quote.clientCompany || quote.id.slice(0, 8)
      a.download = `견적서_${filename}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      alert('엑셀 다운로드에 실패했습니다')
    } finally {
      setDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/sales-quotes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/admin/api-test/sales-quotes')
      }
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }

  // 새 버전 생성 (발송 후 수정)
  const handleCreateRevision = async () => {
    if (!quote) return
    if (!confirm('현재 견적서를 기반으로 새 버전을 생성하시겠습니까?')) return

    setCreatingRevision(true)
    try {
      const res = await fetch(`/api/sales-quotes/${id}/revise`, { method: 'POST' })
      if (res.ok) {
        const newQuote = await res.json()
        router.push(`/admin/api-test/sales-quotes/${newQuote.id}/edit`)
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
      formData.append('fileType', 'SIGNED_ORIGINAL')

      const res = await fetch(`/api/sales-quotes/${id}/files`, {
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
      const res = await fetch(`/api/sales-quotes/${id}/files/${fileId}`)
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
      const res = await fetch(`/api/sales-quotes/${id}/files/${fileId}`, {
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

  const getQuoteDisplayName = () => {
    if (!quote) return ''
    if (quote.projectName) return quote.projectName
    if (quote.items?.[0]?.description) return quote.items[0].description
    if (quote.clientCompany) return quote.clientCompany
    return quote.id.slice(0, 8)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">견적서를 찾을 수 없습니다</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/api-test/sales-quotes"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{getQuoteDisplayName()}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[quote.status]?.color || 'bg-gray-100'}`}>
                {statusLabels[quote.status]?.label || quote.status}
              </span>
            </div>
            {quote.deal && (
              <p className="text-sm text-gray-500 mt-1">Deal: {quote.deal.name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {quote.status === 'DRAFT' && (
            <Link
              href={`/admin/api-test/sales-quotes/${id}/edit`}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              수정
            </Link>
          )}
          {quote.status !== 'DRAFT' && (
            <button
              onClick={handleCreateRevision}
              disabled={creatingRevision}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              {creatingRevision ? '생성 중...' : '새 버전 생성'}
            </button>
          )}
          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? '다운로드 중...' : '엑셀 다운로드'}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            삭제
          </button>
        </div>
      </div>

      {/* 상태 변경 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">상태 변경</span>
          <div className="flex gap-2">
            {quote.status === 'DRAFT' && (
              <button
                onClick={() => handleStatusChange('SENT')}
                disabled={updatingStatus}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updatingStatus ? '처리중...' : '발송 처리'}
              </button>
            )}
            {quote.status === 'SENT' && (
              <>
                <button
                  onClick={() => handleStatusChange('ACCEPTED')}
                  disabled={updatingStatus}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {updatingStatus ? '처리중...' : '수주 (수락)'}
                </button>
                <button
                  onClick={() => handleStatusChange('REJECTED')}
                  disabled={updatingStatus}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {updatingStatus ? '처리중...' : '실주 (거절)'}
                </button>
              </>
            )}
            {(quote.status === 'ACCEPTED' || quote.status === 'REJECTED') && (
              <span className="text-sm text-gray-500 py-2">확정된 견적서는 상태를 변경할 수 없습니다</span>
            )}
          </div>
        </div>
      </div>

      {/* 견적 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 수신 (고객 정보) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">수신</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">회사명</dt>
              <dd className="text-sm font-medium text-gray-900">{quote.clientCompany || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">담당자</dt>
              <dd className="text-sm text-gray-900">{quote.clientContact || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">전화</dt>
              <dd className="text-sm text-gray-900">{quote.clientPhone || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">팩스</dt>
              <dd className="text-sm text-gray-900">{quote.clientFax || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">휴대폰</dt>
              <dd className="text-sm text-gray-900">{quote.clientMobile || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">이메일</dt>
              <dd className="text-sm text-gray-900">{quote.clientEmail || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* 견적 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">견적 정보</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">견적일</dt>
              <dd className="text-sm text-gray-900">
                {quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString('ko-KR') : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">유효기간</dt>
              <dd className="text-sm text-gray-900">{quote.validUntil || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">납기일</dt>
              <dd className="text-sm text-gray-900">
                {quote.deliveryDate ? new Date(quote.deliveryDate).toLocaleDateString('ko-KR') : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">결제조건</dt>
              <dd className="text-sm text-gray-900">{quote.paymentTerms || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">견적 담당</dt>
              <dd className="text-sm text-gray-900">{quote.managerName || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">프로젝트명</dt>
              <dd className="text-sm text-gray-900">{quote.projectName || '-'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 품목 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">품목 목록 ({quote.items?.length || 0}개)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">P/N</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">수량</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">SRP</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">단가</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quote.items?.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{item.partNumber || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.description || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {item.srpPrice?.toLocaleString() || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {item.unitPrice?.toLocaleString() || 0}원
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {item.totalPrice?.toLocaleString() || 0}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 합계 */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">공급가액</span>
                <span className="font-medium">{quote.totalAmount?.toLocaleString() || 0}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">부가세</span>
                <span>{quote.vatAmount?.toLocaleString() || 0}원</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-base">
                <span className="font-semibold">총 금액</span>
                <span className="font-bold text-blue-600">{quote.totalWithVat?.toLocaleString() || 0}원</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 비고 */}
      {quote.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">비고</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}

      {/* 버전 목록 - 같은 Deal의 견적서들 */}
      {versions.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">버전 이력 ({versions.length}개)</h3>
          </div>
          <div className="divide-y">
            {versions.map((v) => (
              <div
                key={v.id}
                className={`px-6 py-3 flex items-center justify-between ${v.isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">v{v.version}</span>
                  <span className="text-sm text-gray-900">{v.displayName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[v.status]?.color || 'bg-gray-100'}`}>
                    {statusLabels[v.status]?.label || v.status}
                  </span>
                  {v.isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">현재</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    {new Date(v.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {typeof v.totalWithVat === 'number'
                      ? v.totalWithVat.toLocaleString()
                      : Number(v.totalWithVat || 0).toLocaleString()}원
                  </span>
                  {!v.isCurrent && (
                    <Link
                      href={`/admin/api-test/sales-quotes/${v.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
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

      {/* 파일 관리 - 발송 후에만 표시 */}
      {quote.status !== 'DRAFT' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">첨부 파일 ({files.length}개)</h3>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".xlsx,.xls,.pdf,.doc,.docx,.png,.jpg,.jpeg"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploading ? '업로드 중...' : '파일 업로드'}
              </button>
            </div>
          </div>
          {files.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              업로드된 파일이 없습니다. 직인이 포함된 원본 파일을 업로드하세요.
            </div>
          ) : (
            <div className="divide-y">
              {files.map((file) => (
                <div key={file.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {fileTypeLabels[file.fileType] || file.fileType}
                        {file.fileSize && ` · ${(file.fileSize / 1024).toFixed(1)}KB`}
                        {file.uploadedBy && ` · ${file.uploadedBy.name}`}
                        {` · ${new Date(file.uploadedAt).toLocaleDateString('ko-KR')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFileDownload(file.id)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="다운로드"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleFileDelete(file.id, file.fileName)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 메타 정보 */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex gap-6">
            <span>생성일: {new Date(quote.createdAt).toLocaleString('ko-KR')}</span>
            {quote.updatedAt && (
              <span>수정일: {new Date(quote.updatedAt).toLocaleString('ko-KR')}</span>
            )}
          </div>
          {quote.createdBy && (
            <span>작성자: {quote.createdBy.name}</span>
          )}
        </div>
      </div>
    </div>
  )
}
