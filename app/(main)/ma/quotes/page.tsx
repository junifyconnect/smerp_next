'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface MAQuote {
  id: string
  quoteNumber: string
  status: string
  quoteDate?: string
  managerName?: string
  clientCompany?: string
  totalAmount?: number
  totalWithVat?: number
  createdAt: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: '발송', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: '수주', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '실주', color: 'bg-red-100 text-red-700' },
}

export default function MAQuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<MAQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

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

      const res = await fetch(`/api/ma-quotes?${params}`)
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

  // 엑셀 업로드 (바로 저장)
  const handleExcelUpload = async () => {
    if (!uploadFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)

      const res = await fetch('/api/ma-quotes/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        alert(`MA 견적서가 생성되었습니다: ${data.quoteNumber}`)
        setShowUploadModal(false)
        setUploadFile(null)
        fetchQuotes()
        router.push(`/ma/quotes/${data.id}`)
      } else {
        const error = await res.json()
        alert(`업로드 실패: ${error.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      console.error('업로드 실패:', err)
      alert('업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR')
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MA 견적서</h1>
          <p className="text-sm text-gray-500 mt-1">유지보수 서비스 견적서 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            엑셀 업로드
          </button>
          <Link
            href="/ma/quotes/new"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + 새 견적서
          </Link>
        </div>
      </div>

      {/* 검색/필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="고객사, 견적번호 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">전체 상태</option>
            <option value="DRAFT">작성중</option>
            <option value="SENT">발송</option>
            <option value="ACCEPTED">수주</option>
            <option value="REJECTED">실주</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            검색
          </button>
        </form>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-600">총 {total}건</span>
          <button onClick={fetchQuotes} className="text-sm text-green-600 hover:text-green-700">
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : quotes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>MA 견적서가 없습니다</p>
            <Link href="/ma/quotes/new" className="text-green-600 hover:underline mt-2 inline-block">
              새 견적서 작성하기
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-sm">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-600">견적번호</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">고객사</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">담당자</th>
                <th className="px-6 py-3 text-center font-medium text-gray-600">상태</th>
                <th className="px-6 py-3 text-right font-medium text-gray-600">금액</th>
                <th className="px-6 py-3 text-center font-medium text-gray-600">견적일</th>
                <th className="px-6 py-3 text-center font-medium text-gray-600">생성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  onClick={() => router.push(`/ma/quotes/${quote.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-green-600">{quote.quoteNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{quote.clientCompany || '-'}</td>
                  <td className="px-6 py-4 text-sm">{quote.managerName || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusLabels[quote.status]?.color || 'bg-gray-100'}`}>
                      {statusLabels[quote.status]?.label || quote.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium">
                    {quote.totalWithVat?.toLocaleString() || quote.totalAmount?.toLocaleString() || 0}원
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">
                    {quote.quoteDate ? formatDate(quote.quoteDate) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-500">
                    {formatDate(quote.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 엑셀 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">엑셀 파일 업로드</h3>
            <p className="text-sm text-gray-600 mb-4">
              MA 견적서 엑셀 파일을 업로드하면 자동으로 파싱하여 견적서를 생성합니다.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
            >
              {uploadFile ? (
                <div>
                  <p className="font-medium text-gray-900">{uploadFile.name}</p>
                  <p className="text-sm text-gray-500 mt-1">클릭하여 다른 파일 선택</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600">클릭하여 파일 선택</p>
                  <p className="text-sm text-gray-400 mt-1">.xlsx, .xls 파일</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleExcelUpload}
                disabled={!uploadFile || uploading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {uploading ? '업로드 중...' : '업로드'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
