'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  projectName?: string
}

interface DocumentListProps {
  docType: 'SALES_QUOTE' | 'SALES_APPROVAL' | 'SALES_ORDER' | 'MA_QUOTE' | 'MA_APPROVAL'
  basePath: string
  title: string
}

const apiPathMap: Record<string, string> = {
  SALES_QUOTE: '/api/sales-quotes',
  SALES_APPROVAL: '/api/sales-approvals',
  SALES_ORDER: '/api/sales-orders',
  MA_QUOTE: '/api/ma-quotes',
  MA_APPROVAL: '/api/ma-approvals',
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  SENT: { label: '발송', color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: '수주', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '실주', color: 'bg-red-100 text-red-700' },
  PENDING: { label: '승인대기', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: '승인완료', color: 'bg-green-100 text-green-700' },
  COMPLETED: { label: '완료', color: 'bg-blue-100 text-blue-700' },
}

export default function DocumentList({ docType, basePath, title }: DocumentListProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // 엑셀 업로드 모달 (SALES_QUOTE일 때만)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      })
      const apiPath = apiPathMap[docType]
      const res = await fetch(`${apiPath}?${params}`)
      const data = await res.json()
      setDocuments(data.items || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (err) {
      console.error('문서 목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [page, docType, search, statusFilter])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchDocuments()
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleDownloadExcel = async (doc: Document) => {
    if (docType !== 'SALES_QUOTE') return
    
    setDownloadingId(doc.id)
    try {
      const apiPath = apiPathMap[docType]
      const res = await fetch(`${apiPath}/${doc.id}/excel`)
      if (!res.ok) throw new Error('다운로드 실패')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = (doc as any).projectName || doc.clientCompany || doc.id.slice(0, 8)
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
      const apiPath = apiPathMap[docType]
      const res = await fetch(`${apiPath}/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchDocuments()
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
    if (!uploadFile || docType !== 'SALES_QUOTE') return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)

      const apiPath = apiPathMap[docType]
      const res = await fetch(`${apiPath}/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        alert('엑셀 업로드가 완료되었습니다!')
        setShowUploadModal(false)
        setUploadFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        fetchDocuments()
        // 생성된 견적서 상세로 이동
        router.push(`${basePath}/${data.id}`)
      } else {
        alert(data.error || '업로드 실패')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {docType === 'SALES_QUOTE' && (
            <p className="text-sm text-gray-500 mt-1">Sales Quote 관리</p>
          )}
        </div>
        <div className="flex gap-2">
          {docType === 'SALES_QUOTE' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              엑셀 업로드
            </button>
          )}
          <Link
            href={`${basePath}/new`}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 문서
          </Link>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="문서번호, 고객사, 프로젝트명 검색..."
              className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>
          {(docType === 'SALES_QUOTE' || docType === 'MA_QUOTE') && (
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base"
              >
                <option value="">전체</option>
                <option value="DRAFT">작성중</option>
                <option value="SENT">발송</option>
                <option value="ACCEPTED">수주</option>
                <option value="REJECTED">실주</option>
              </select>
            </div>
          )}
          <button
            type="submit"
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
          >
            검색
          </button>
        </form>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">
              총 <span className="font-bold text-gray-900 text-base">{total}</span>건
            </span>
          </div>
          <button 
            onClick={fetchDocuments} 
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-b border-gray-200">
                {docType === 'SALES_QUOTE' ? (
                  <>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">견적서</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">고객사</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">금액</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">견적일</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">액션</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">문서번호</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">고객사</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">제목</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">금액</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">작성자</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">작성일</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={docType === 'SALES_QUOTE' ? 6 : 7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="text-sm font-medium text-gray-500">로딩 중...</span>
                    </div>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={docType === 'SALES_QUOTE' ? 6 : 7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-500">문서가 없습니다</span>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc, index) => (
                  <tr 
                    key={doc.id} 
                    className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 transition-all duration-200 border-b border-gray-50"
                  >
                    {docType === 'SALES_QUOTE' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`${basePath}/${doc.id}`}
                            className="group-hover:text-blue-700 font-semibold text-gray-900 hover:text-blue-600 transition-colors inline-block"
                          >
                            {(doc as any).projectName || (doc as any).items?.[0]?.description || doc.clientCompany || doc.id.slice(0, 8)}
                          </Link>
                          {(doc as any).deal && (
                            <p className="text-xs text-gray-400 mt-1 font-normal">Deal: {(doc as any).deal?.name}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-700">
                            {doc.clientCompany || <span className="text-gray-400">-</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${statusLabels[doc.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[doc.status]?.label || doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-gray-900">
                            {((doc as any).totalWithVat || 0).toLocaleString()}원
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {(doc as any).quoteDate
                              ? new Date((doc as any).quoteDate).toLocaleDateString('ko-KR')
                              : new Date(doc.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDownloadExcel(doc)}
                              disabled={downloadingId === doc.id}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="엑셀 다운로드"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`${basePath}/${doc.id}`}
                            className="group-hover:text-blue-700 text-blue-600 hover:text-blue-700 hover:underline font-semibold text-base transition-colors"
                          >
                            {doc.docNumber || (doc as any).projectName || doc.clientCompany || doc.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-base font-medium text-gray-900">{doc.clientCompany || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-base text-gray-700">{doc.title || (doc as any).projectName || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-base font-semibold text-gray-900">
                            {(doc as any).totalWithVat ? `${(doc as any).totalWithVat.toLocaleString()}원` : doc.totalAmount ? `${doc.totalAmount.toLocaleString()}원` : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm ${statusLabels[doc.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[doc.status]?.label || doc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-base text-gray-700">{doc.createdBy?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-base text-gray-600">
                            {(doc as any).quoteDate
                              ? new Date((doc as any).quoteDate).toLocaleDateString('ko-KR')
                              : new Date(doc.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all shadow-sm hover:shadow"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            이전
          </button>
          <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <span className="text-sm font-bold text-gray-900">
              {page} <span className="text-gray-500 font-normal">/ {totalPages}</span>
            </span>
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all shadow-sm hover:shadow"
          >
            다음
            <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* 엑셀 업로드 모달 (SALES_QUOTE만) */}
      {docType === 'SALES_QUOTE' && showUploadModal && (
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
