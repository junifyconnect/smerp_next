'use client'

import { useState, useEffect, useCallback } from 'react'

interface SalesQuote {
  id: string
  projectName?: string
  clientCompany?: string
  clientContact?: string
  clientPhone?: string
  managerName?: string
  paymentTerms?: string
  dealId?: string
  quoteDate?: string
  totalWithVat?: number
  totalAmount?: number
  status: string
  // 통합 견적 정보
  isConsolidated?: boolean
  consolidatedName?: string
  consolidatedPrice?: number
  items: {
    partNumber?: string
    description?: string
    quantity: number
    unitPrice?: number
  }[]
}

interface QuoteSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (quote: SalesQuote) => void
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: '발송', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: '수주', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '실주', color: 'bg-red-100 text-red-700' },
}

export default function QuoteSelectModal({ isOpen, onClose, onSelect }: QuoteSelectModalProps) {
  const [quotes, setQuotes] = useState<SalesQuote[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })
      if (search) {
        params.set('search', search)
      }

      const res = await fetch(`/api/sales-quotes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setQuotes(data.items || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (err) {
      console.error('견적서 목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    if (isOpen) {
      fetchQuotes()
    }
  }, [isOpen, fetchQuotes])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchQuotes()
  }

  const handleSelect = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/sales-quotes/${quoteId}`)
      if (res.ok) {
        const quote = await res.json()
        onSelect(quote)
        onClose()
      }
    } catch (err) {
      console.error('견적서 상세 조회 실패:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">견적서 선택</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 검색 */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="프로젝트명, 품목명, 고객사로 검색..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              검색
            </button>
          </form>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">로딩 중...</div>
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">견적서가 없습니다</div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">프로젝트/품목</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">고객사</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">견적일</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">금액</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">상태</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">선택</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">
                          {quote.projectName || quote.items?.[0]?.description || '-'}
                        </div>
                        {quote.isConsolidated && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">통합</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{quote.managerName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {quote.clientCompany || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {quote.totalWithVat?.toLocaleString() || 0}원
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabels[quote.status]?.color || 'bg-gray-100'}`}>
                        {statusLabels[quote.status]?.label || quote.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSelect(quote.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        선택
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
