'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// 타입 정의
interface QuoteItem {
  id?: string
  partNumber: string
  description: string
  quantity: number
  srpPrice: number
  unitPrice: number
  totalPrice: number
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
  deal?: { id: string; name: string }
  createdAt: string
  updatedAt?: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: '발송', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: '수주', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '실주', color: 'bg-red-100 text-red-700' },
}

export default function SalesQuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<SalesQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // 엑셀 업로드 모달
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/sales-quotes?${params}`)
      const data = await res.json()
      setQuotes(data.items || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (err) {
      console.error('목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchQuotes()
  }

  const handleDownloadExcel = async (quote: SalesQuote) => {
    setDownloadingId(quote.id)
    try {
      const res = await fetch(`/api/sales-quotes/${quote.id}/excel`)
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
      setDownloadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/sales-quotes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchQuotes()
      }
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)

      const res = await fetch('/api/sales-quotes/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        alert('엑셀 업로드가 완료되었습니다!')
        setShowUploadModal(false)
        setUploadFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        fetchQuotes()
        // 생성된 견적서 상세로 이동
        router.push(`/admin/api-test/sales-quotes/${data.id}`)
      } else {
        alert(data.error || '업로드 실패')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setUploading(false)
    }
  }

  const getQuoteDisplayName = (quote: SalesQuote) => {
    if (quote.projectName) return quote.projectName
    if (quote.items?.[0]?.description) return quote.items[0].description
    if (quote.clientCompany) return quote.clientCompany
    return quote.id.slice(0, 8)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">영업 견적서</h1>
          <p className="text-sm text-gray-500 mt-1">Sales Quote 관리</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            엑셀 업로드
          </button>
          <Link
            href="/admin/api-test/sales-quotes/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 견적서
          </Link>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="프로젝트명, 품목명, 고객사명으로 검색"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">전체</option>
              <option value="DRAFT">작성중</option>
              <option value="SENT">발송</option>
              <option value="ACCEPTED">수주</option>
              <option value="REJECTED">실주</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            검색
          </button>
        </form>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            총 <span className="font-semibold text-gray-900">{total}</span>건
          </span>
          <button onClick={fetchQuotes} className="text-sm text-blue-600 hover:text-blue-700">
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">로딩 중...</div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="mb-4">견적서가 없습니다</p>
            <Link
              href="/admin/api-test/sales-quotes/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              첫 견적서 만들기
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">견적서</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">고객사</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">상태</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">금액</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">견적일</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/api-test/sales-quotes/${quote.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {getQuoteDisplayName(quote)}
                      </Link>
                      {quote.deal && (
                        <p className="text-xs text-gray-400 mt-0.5">Deal: {quote.deal.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {quote.clientCompany || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[quote.status]?.color || 'bg-gray-100'}`}>
                        {statusLabels[quote.status]?.label || quote.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {quote.totalWithVat?.toLocaleString() || 0}원
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {quote.quoteDate
                        ? new Date(quote.quoteDate).toLocaleDateString('ko-KR')
                        : new Date(quote.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleDownloadExcel(quote)}
                          disabled={downloadingId === quote.id}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                          title="엑셀 다운로드"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(quote.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
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

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  이전
                </button>
                <span className="px-4 text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 엑셀 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">엑셀 파일 업로드</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  엑셀 파일 선택 (.xlsx, .xls)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {uploadFile && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium">파일:</span> {uploadFile.name}
                  </p>
                  <p className="text-gray-500">
                    <span className="font-medium">크기:</span> {(uploadFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}

              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">안내</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                  <li>기존 견적서 양식 파일을 사용하세요</li>
                  <li>파일의 첫 번째 시트에서 데이터를 읽습니다</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? '업로드 중...' : '업로드'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
