'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Document {
  id: string
  docNumber: string
  docType: string
  status: string
  title?: string
  clientCompany?: string
  totalAmount?: number
  createdAt: string
  createdBy?: {
    name: string
  }
}

interface DocumentListProps {
  docType: 'SALES_QUOTE' | 'SALES_APPROVAL' | 'SALES_ORDER' | 'MA_QUOTE' | 'MA_APPROVAL'
  basePath: string
  title: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: '승인대기', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: '승인완료', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-700' },
  COMPLETED: { label: '완료', color: 'bg-blue-100 text-blue-700' },
}

export default function DocumentList({ docType, basePath, title }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [page, docType])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        docType,
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      })
      const res = await fetch(`/api/documents?${params}`)
      const data = await res.json()
      setDocuments(data.items || [])
      setTotalPages(data.totalPages || 1)
    } catch (err) {
      console.error('문서 목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchDocuments()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <Link
          href={`${basePath}/new`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 새 문서
        </Link>
      </div>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="문서번호, 고객사, 프로젝트명 검색..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            검색
          </button>
        </div>
      </form>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">문서번호</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">고객사</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">제목</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">금액</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">상태</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">작성자</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">작성일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  로딩 중...
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  문서가 없습니다
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`${basePath}/${doc.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {doc.docNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">{doc.clientCompany || '-'}</td>
                  <td className="px-4 py-3 text-sm">{doc.title || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {doc.totalAmount ? `${doc.totalAmount.toLocaleString()}원` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${statusLabels[doc.status]?.color || 'bg-gray-100'}`}>
                      {statusLabels[doc.status]?.label || doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{doc.createdBy?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
          >
            이전
          </button>
          <span className="px-3 py-1">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
