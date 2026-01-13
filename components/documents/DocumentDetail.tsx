'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { UilEdit, UilFileAlt } from '@iconscout/react-unicons'

interface DocumentItem {
  id: string
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

interface Document {
  id: string
  docNumber: string
  docType: string
  status: string
  title?: string
  projectName?: string
  productName?: string
  managerName?: string
  clientCompany?: string
  clientContact?: string
  clientPhone?: string
  clientFax?: string
  clientMobile?: string
  clientEmail?: string
  vendorCompany?: string
  vendorContact?: string
  vendorPhone?: string
  quoteDate?: string
  validUntil?: string
  deliveryDate?: string
  paymentTerms?: string
  notes?: string
  totalAmount?: number
  vatAmount?: number
  totalWithVat?: number
  items: DocumentItem[]
  deal?: { id: string; name: string; status: string }
  createdAt: string
  updatedAt?: string
  createdBy?: {
    id: string
    name: string
  }
}

interface DocumentDetailProps {
  documentId: string
  basePath: string
}

const apiPathMap: Record<string, string> = {
  '/sales/quotes': '/api/sales-quotes',
  '/sales/approvals': '/api/sales-approvals',
  '/sales/orders': '/api/sales-orders',
  '/ma/quotes': '/api/ma-quotes',
  '/ma/approvals': '/api/ma-approvals',
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

const fileTypeLabels: Record<string, string> = {
  SIGNED_ORIGINAL: '직인 원본',
  EXCEL_ORIGINAL: '업로드 원본',
  EXCEL_GENERATED: '생성된 파일',
  CLIENT_PO: '고객 발주서',
  ATTACHMENT: '첨부파일',
}

export default function DocumentDetail({ documentId, basePath }: DocumentDetailProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [files, setFiles] = useState<QuoteFile[]>([])
  const [versions, setVersions] = useState<QuoteVersion[]>([])
  const [uploading, setUploading] = useState(false)
  const [creatingRevision, setCreatingRevision] = useState(false)
  const [mode, setMode] = useState<'web' | 'template'>('web')

  const isSalesQuote = basePath === '/sales/quotes'

  const fetchDocument = useCallback(async () => {
    try {
      const apiPath = apiPathMap[basePath] || '/api/sales-quotes'
      const res = await fetch(`${apiPath}/${documentId}`)
      if (!res.ok) throw new Error('문서를 찾을 수 없습니다')
      const data = await res.json()
      setDocument(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [documentId, basePath])

  const fetchFiles = useCallback(async () => {
    if (!isSalesQuote) return
    try {
      const apiPath = apiPathMap[basePath] || '/api/sales-quotes'
      const res = await fetch(`${apiPath}/${documentId}/files`)
      if (res.ok) {
        const data = await res.json()
        setFiles(data)
      }
    } catch (err) {
      console.error('파일 목록 조회 실패:', err)
    }
  }, [documentId, basePath, isSalesQuote])

  const fetchVersions = useCallback(async () => {
    if (!isSalesQuote) return
    try {
      const apiPath = apiPathMap[basePath] || '/api/sales-quotes'
      const res = await fetch(`${apiPath}/${documentId}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(data.versions || [])
      }
    } catch (err) {
      console.error('버전 목록 조회 실패:', err)
    }
  }, [documentId, basePath, isSalesQuote])

  useEffect(() => {
    fetchDocument()
    if (isSalesQuote) {
      fetchFiles()
      fetchVersions()
    }
  }, [fetchDocument, fetchFiles, fetchVersions, isSalesQuote])

  const handleStatusChange = async (newStatus: string) => {
    if (!document || !isSalesQuote) return
    setUpdatingStatus(true)
    try {
      const apiPath = apiPathMap[basePath] || '/api/sales-quotes'
      const res = await fetch(`${apiPath}/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        const updatedDocument = await res.json()
        setDocument(updatedDocument)
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
    setDownloading(true)
    try {
      const apiPath = apiPathMap[basePath] || '/api/sales-quotes'
      const res = await fetch(`${apiPath}/${documentId}/excel`)
      if (!res.ok) throw new Error('다운로드 실패')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      const filename = document?.projectName || document?.clientCompany || document?.docNumber || documentId.slice(0, 8)
      a.download = `견적서_${filename}.xlsx`
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      alert('엑셀 다운로드에 실패했습니다')
    } finally {
      setDownloading(false)
    }
  }

  const handleCreateRevision = async () => {
    if (!document || !isSalesQuote) return
    if (!confirm('현재 견적서를 기반으로 새 버전을 생성하시겠습니까?')) return

    setCreatingRevision(true)
    try {
      const apiPath = apiPathMap[basePath] || '/api/sales-quotes'
      const res = await fetch(`${apiPath}/${documentId}/revise`, { method: 'POST' })
      if (res.ok) {
        const newQuote = await res.json()
        router.push(`${basePath}/${newQuote.id}/edit`)
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !isSalesQuote) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', 'SIGNED_ORIGINAL')

      const apiPath = apiPathMap[basePath] || '/api/sales-quotes'
      const res = await fetch(`${apiPath}/${documentId}/files`, {
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

  const handleFileDownload = async (fileId: string) => {
    if (!isSalesQuote) return
    try {
      const apiPath = apiPathMap[basePath] || '/api/sales-quotes'
      const res = await fetch(`${apiPath}/${documentId}/files/${fileId}`)
      if (!res.ok) throw new Error('다운로드 URL 조회 실패')

      const data = await res.json()
      window.open(data.downloadUrl, '_blank')
    } catch {
      alert('파일 다운로드에 실패했습니다')
    }
  }

  const handleFileDelete = async (fileId: string, fileName: string) => {
    if (!isSalesQuote) return
    if (!confirm(`"${fileName}" 파일을 삭제하시겠습니까?`)) return

    try {
      const apiPath = apiPathMap[basePath] || '/api/sales-quotes'
      const res = await fetch(`${apiPath}/${documentId}/files/${fileId}`, {
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
    if (!document) return ''
    if (document.projectName) return document.projectName
    if (document.items?.[0]?.description) return document.items[0].description
    if (document.clientCompany) return document.clientCompany
    return document.docNumber || document.id.slice(0, 8)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return ''
    return new Intl.NumberFormat('ko-KR').format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-500">로딩 중...</span>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-500 text-lg font-semibold">{error || '문서를 찾을 수 없습니다'}</div>
        <button
          onClick={() => router.push(basePath)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  // 공통 헤더 렌더링
  const renderHeader = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(basePath)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{isSalesQuote ? getQuoteDisplayName() : document.docNumber}</h1>
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm ${statusLabels[document.status]?.color || 'bg-gray-100'}`}>
              {statusLabels[document.status]?.label || document.status}
            </span>
          </div>
          {isSalesQuote && document.deal && (
            <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Deal: {document.deal.name}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* 모드 토글 (SALES_QUOTE만) */}
        {isSalesQuote && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 mr-2">
            <button
              type="button"
              onClick={() => setMode('web')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                mode === 'web'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UilEdit size={18} />
              웹 모드
            </button>
            <button
              type="button"
              onClick={() => setMode('template')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                mode === 'template'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UilFileAlt size={18} />
              양식 모드
            </button>
          </div>
        )}
        {isSalesQuote && document.status === 'DRAFT' && (
          <Link
            href={`${basePath}/${documentId}/edit`}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            수정
          </Link>
        )}
        {isSalesQuote && document.status !== 'DRAFT' && (
          <button
            onClick={handleCreateRevision}
            disabled={creatingRevision}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            {creatingRevision ? '생성 중...' : '새 버전 생성'}
          </button>
        )}
        {!isSalesQuote && (
          <button
            onClick={() => router.push(`${basePath}/${documentId}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            수정
          </button>
        )}
        <button
          onClick={handleDownloadExcel}
          disabled={downloading}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloading ? '다운로드 중...' : '엑셀 다운로드'}
        </button>
      </div>
    </div>
  )

  // 양식 모드 렌더링 (SALES_QUOTE만)
  if (isSalesQuote && mode === 'template') {
    return (
      <div className="space-y-6">
        {/* 공통 헤더 */}
        {renderHeader()}

        {/* 양식 모드 내용 */}
        <div className="bg-gray-100 p-8 rounded-2xl">
          <div className="bg-white p-12 shadow-xl max-w-4xl mx-auto" style={{ minHeight: '297mm', fontFamily: '맑은 고딕, Malgun Gothic, sans-serif', color: '#000' }}>
            {/* Quotation 타이틀 */}
            <div className="text-center mb-6">
              <div className="text-3xl font-bold" style={{ letterSpacing: '4px' }}>Quotation</div>
            </div>

            {/* 상단 헤더 영역 */}
            <div className="flex justify-between items-start mb-4">
              {/* 왼쪽: 고객 정보 테이블 */}
              <div className="flex-1 mr-4">
                <table className="w-full border-collapse" style={{ fontSize: '11px', color: '#000' }}>
                  <tbody>
                    <tr>
                      <td className="w-20 pr-4 align-top text-center font-semibold text-black">회 사</td>
                      <td className="text-black font-bold">
                        {document.clientCompany ? `${document.clientCompany} 귀중` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 align-top text-center font-semibold text-black">참 조</td>
                      <td className="text-black font-bold">{document.clientContact || ''}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 align-top text-center font-semibold text-black">전 화</td>
                      <td className="text-black font-bold">{document.clientPhone || ''}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 align-top text-center font-semibold text-black">Fax</td>
                      <td className="text-black font-bold">{document.clientFax || ''}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 align-top text-center font-semibold text-black">C P</td>
                      <td className="text-black font-bold">{document.clientMobile || ''}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 align-top text-center font-semibold text-black">E-mail</td>
                      <td className="text-black font-bold">{document.clientEmail || ''}</td>
                    </tr>
                  </tbody>
                </table>

                {/* 견적 정보 테이블 */}
                <div className="mt-4">
                  <table className="w-full border-collapse" style={{ fontSize: '11px', color: '#000' }}>
                    <tbody>
                      <tr>
                        <td className="w-20 pr-4 align-top text-center font-semibold text-black">견적일</td>
                        <td className="text-black font-bold">
                          {document.quoteDate ? formatDate(document.quoteDate) : ''}
                        </td>
                      </tr>
                      <tr>
                        <td className="pr-4 align-top text-center font-semibold text-black">납기일</td>
                        <td className="text-black font-bold">
                          {document.deliveryDate ? formatDate(document.deliveryDate) : '별도협의'}
                        </td>
                      </tr>
                      <tr>
                        <td className="pr-4 align-top text-center font-semibold text-black">유효기간</td>
                        <td className="text-black font-bold">{(document as any).validUntil || '견적일로부터 15일'}</td>
                      </tr>
                      <tr>
                        <td className="pr-4 align-top text-center font-semibold text-black">결제조건</td>
                        <td className="text-black font-bold">{document.paymentTerms || ''}</td>
                      </tr>
                      <tr>
                        <td className="pr-4 align-top text-center font-semibold text-black">견적담당</td>
                        <td className="text-black font-bold">
                          {document.managerName || ''}
                        </td>
                      </tr>
                      <tr>
                        <td className="pr-4 align-top text-center font-semibold text-black">프로젝트명</td>
                        <td className="text-black font-bold">{document.projectName || ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 오른쪽: 로고 및 회사 정보 */}
              <div className="flex-shrink-0" style={{ width: '280px' }}>
                <div className="mb-3">
                  <div className="mb-2">
                    <Image
                      src="/imgs/quotes_sm_logo.png"
                      alt="ServerMate Logo"
                      width={120}
                      height={60}
                      className="h-auto"
                      style={{ maxWidth: '120px' }}
                    />
                  </div>
                  <div>
                    <Image
                      src="/imgs/quotes_logo_2.png"
                      alt="OPTIONS CONTINUATION PROGRAM"
                      width={120}
                      height={40}
                      className="h-auto"
                      style={{ maxWidth: '120px' }}
                    />
                  </div>
                </div>
                <div className="text-left text-xs font-bold" style={{ fontSize: '10px', lineHeight: '1.5' }}>
                  <div>서울시 금천구 가산디지털1로 131</div>
                  <div>(BYC하이시티 B동 1201호)</div>
                  <div className="mt-1">
                    &lt;Tel: 070-8892-1452 Fax: 070-8892-1459&gt;
                  </div>
                  <div className="mt-2 text-left" style={{ fontSize: '9px' }}>
                    대표 서서형 (온라인견적시 직인생략)
                  </div>
                </div>
              </div>
            </div>

            {/* 단위 표시 */}
            <div className="mb-2 text-xs text-black text-right font-bold" style={{ fontSize: '10px' }}>
              단위:원 (VAT별도)
            </div>

            {/* 품목 테이블 */}
            <table className="w-full mb-4 border-collapse" style={{ fontSize: '12px', border: '1px solid #000', color: '#000' }}>
              <thead>
                <tr>
                  <th className="border border-black p-2 text-center font-bold" style={{ width: '80px', backgroundColor: '#0F243F', color: '#ffffff' }}>
                    P/N
                  </th>
                  <th className="border border-black p-2 text-center font-bold" style={{ backgroundColor: '#0F243F', color: '#ffffff' }}>
                    Description
                  </th>
                  <th className="border border-black p-2 text-center font-bold" style={{ width: '45px', backgroundColor: '#0F243F', color: '#ffffff' }}>
                    Q&apos;ty
                  </th>
                  <th className="border border-black p-2 text-center font-bold" style={{ width: '80px', backgroundColor: '#0F243F', color: '#ffffff' }}>
                    SRP
                  </th>
                  <th className="border border-black p-2 text-center font-bold" style={{ width: '80px', backgroundColor: '#0F243F', color: '#ffffff' }}>
                    Price
                  </th>
                  <th className="border border-black p-2 text-center font-bold" style={{ width: '90px', backgroundColor: '#0F243F', color: '#ffffff' }}>
                    Sum
                  </th>
                </tr>
              </thead>
              <tbody>
                {document.items?.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="border border-black p-2 text-black">{item.partNumber || ''}</td>
                    <td className="border border-black p-2 text-black" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {item.description || ''}
                    </td>
                    <td className="border border-black p-2 text-right text-black">{item.quantity}</td>
                    <td className="border border-black p-2 text-right text-black">
                      {(item as any).srpPrice ? formatCurrency((item as any).srpPrice) : ''}
                    </td>
                    <td className="border border-black p-2 text-right text-black">
                      {item.unitPrice ? formatCurrency(item.unitPrice) : ''}
                    </td>
                    <td className="border border-black p-2 text-right font-semibold text-black">
                      {item.totalPrice ? formatCurrency(item.totalPrice) : ''}
                    </td>
                  </tr>
                ))}
                {/* 합계 행 */}
                <tr>
                  <td colSpan={3} className="border border-black font-bold text-black text-center" style={{ backgroundColor: '#92D050', fontSize: '16px' }}>
                    제안금액(VAT별도)
                  </td>
                  <td colSpan={3} className="border border-black px-2 text-right font-bold" style={{ backgroundColor: '#92D050', fontSize: '16px' }}>
                    {formatCurrency(document.totalAmount || 0)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="border border-black font-bold text-black text-center" style={{ backgroundColor: '#92D050', fontSize: '16px' }}>
                    제안금액(VAT포함)
                  </td>
                  <td colSpan={3} className="border border-black px-2 text-right font-bold" style={{ backgroundColor: '#92D050', color: '#0000CC', fontSize: '16px' }}>
                    {formatCurrency(document.totalWithVat || 0)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 기타사항 */}
            <div className="mb-4 text-black" style={{ fontSize: '11px' }}>
              <div className="font-bold mb-2 text-black">기타사항</div>
              <div className="min-h-20 text-black font-bold" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                {document.notes || '[견적서의 상세 내역 or 견적서 추가 내용]'}
              </div>
            </div>

            {/* 특별 문구 */}
            <div className="mb-4 text-xs text-black font-bold" style={{ fontSize: '10px', lineHeight: '1.6' }}>
              * 당사는 이 견적상의 가격 및 조건들을 수용하고 이 견적서를 귀사에 대한 공식 발주서로 대신 하고자 합니다
            </div>

            {/* 구매자 확인란 */}
            <div className="mb-4 text-black" style={{ fontSize: '11px' }}>
              <div className="font-bold mb-2 text-black">* 구매자 확인란 :</div>
              <div className="space-y-2 text-black" style={{ fontSize: '10px' }}>
                <div className="flex gap-8">
                  <div className="flex-1">
                    <span className="font-semibold text-black">회사명 :</span>
                    <span className="ml-2 inline-block min-w-40 text-black font-bold" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-black">명판 및 직인 :</span>
                    <span className="ml-2 inline-block min-w-40 text-black font-bold" />
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-black">담당자, 연락처 :</span>
                  <span className="ml-2 inline-block min-w-64 text-black font-bold" />
                </div>
                <div className="flex gap-8">
                  <div className="flex-1">
                    <span className="font-semibold text-black">배송지 :</span>
                    <span className="ml-2 inline-block min-w-40 text-black font-bold" />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-black">결제조건 :</span>
                    <span className="ml-2 inline-block min-w-40 text-black font-bold" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 웹 모드 렌더링
  return (
    <div className="space-y-6">
      {/* 공통 헤더 */}
      {renderHeader()}

      {/* 상태 변경 (SALES_QUOTE만) */}
      {isSalesQuote && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">상태 변경</span>
            <div className="flex gap-2">
              {document.status === 'DRAFT' && (
                <button
                  onClick={() => handleStatusChange('SENT')}
                  disabled={updatingStatus}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  {updatingStatus ? '처리중...' : '발송 처리'}
                </button>
              )}
              {document.status === 'SENT' && (
                <>
                  <button
                    onClick={() => handleStatusChange('ACCEPTED')}
                    disabled={updatingStatus}
                    className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50"
                  >
                    {updatingStatus ? '처리중...' : '수주'}
                  </button>
                  <button
                    onClick={() => handleStatusChange('REJECTED')}
                    disabled={updatingStatus}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    {updatingStatus ? '처리중...' : '실주'}
                  </button>
                </>
              )}
              {(document.status === 'ACCEPTED' || document.status === 'REJECTED') && (
                <span className="text-sm text-gray-500">확정된 견적서는 상태를 변경할 수 없습니다</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 견적 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 수신 (고객 정보) */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b">수신</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">회사명</dt>
              <dd className="text-sm text-gray-900 font-medium">{document.clientCompany || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">담당자</dt>
              <dd className="text-sm text-gray-900">{document.clientContact || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">전화</dt>
              <dd className="text-sm text-gray-900">{document.clientPhone || '-'}</dd>
            </div>
            {isSalesQuote && (
              <>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">팩스</dt>
                  <dd className="text-sm text-gray-900">{document.clientFax || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">휴대폰</dt>
                  <dd className="text-sm text-gray-900">{document.clientMobile || '-'}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">이메일</dt>
              <dd className="text-sm text-gray-900 break-all">{document.clientEmail || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* 견적 정보 */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b">견적 정보</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">견적일</dt>
              <dd className="text-sm text-gray-900 font-medium">
                {document.quoteDate ? new Date(document.quoteDate).toLocaleDateString('ko-KR') : '-'}
              </dd>
            </div>
            {isSalesQuote && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">유효기간</dt>
                <dd className="text-sm text-gray-900">{(document as any).validUntil || '-'}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">납기일</dt>
              <dd className="text-sm text-gray-900">
                {document.deliveryDate ? new Date(document.deliveryDate).toLocaleDateString('ko-KR') : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-600">결제조건</dt>
              <dd className="text-sm text-gray-900">{document.paymentTerms || '-'}</dd>
            </div>
            {isSalesQuote && (
              <>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">견적 담당</dt>
                  <dd className="text-sm text-gray-900">{document.managerName || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">프로젝트명</dt>
                  <dd className="text-sm text-gray-900 font-medium">{document.projectName || '-'}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* 품목 목록 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">품목 목록</h3>
        </div>
        
        {document.items?.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            품목이 없습니다
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  {isSalesQuote && <col className="w-24" />}
                  <col className="w-64" />
                  {!isSalesQuote && <col className="w-48" />}
                  <col className="w-20" />
                  {isSalesQuote && <col className="w-24" />}
                  <col className="w-28" />
                  <col className="w-32" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-100">
                    {isSalesQuote && (
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">P/N</th>
                    )}
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                      {isSalesQuote ? 'Description' : '품번'}
                    </th>
                    {!isSalesQuote && (
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">품목명</th>
                    )}
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">수량</th>
                    {isSalesQuote && (
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">SRP</th>
                    )}
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">단가</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {document.items.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-gray-50 last:border-0">
                      {isSalesQuote && (
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono truncate">
                          {item.partNumber || '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-900 break-words">
                        {isSalesQuote ? (item.description || '-') : (item.partNumber || '-')}
                      </td>
                      {!isSalesQuote && (
                        <td className="px-4 py-3 text-sm text-gray-700 break-words">
                          {item.description || '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                        {item.quantity}
                      </td>
                      {isSalesQuote && (
                        <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
                          {(item as any).srpPrice ? `${(item as any).srpPrice.toLocaleString()}원` : '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                        {item.unitPrice?.toLocaleString() || 0}원
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                        {item.totalPrice?.toLocaleString() || 0}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 합계 */}
            <div className="px-5 py-5 border-t border-gray-100">
              <div className="flex justify-end">
                <div className="w-80">
                  <div className="space-y-2.5 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">공급가액</span>
                      <span className="text-sm font-medium text-gray-900">{document.totalAmount?.toLocaleString() || 0}원</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">부가세 (10%)</span>
                      <span className="text-sm font-medium text-gray-900">{document.vatAmount?.toLocaleString() || 0}원</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-base font-semibold text-gray-900">총 금액</span>
                    <span className="text-lg font-bold text-gray-900">{document.totalWithVat?.toLocaleString() || 0}원</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 비고 */}
      {document.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">비고</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{document.notes}</p>
        </div>
      )}

      {/* 버전 목록 (SALES_QUOTE만) */}
      {isSalesQuote && versions.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">버전 이력</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {versions.map((v) => (
              <div
                key={v.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">v{v.version}</span>
                  <span className="text-sm text-gray-900">{v.displayName}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusLabels[v.status]?.color || 'bg-gray-100'}`}>
                    {statusLabels[v.status]?.label || v.status}
                  </span>
                  {v.isCurrent && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-900 text-white">현재</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    {new Date(v.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {typeof v.totalWithVat === 'number'
                      ? v.totalWithVat.toLocaleString()
                      : Number(v.totalWithVat || 0).toLocaleString()}원
                  </span>
                  {!v.isCurrent && (
                    <Link
                      href={`${basePath}/${v.id}`}
                      className="text-sm text-gray-600 hover:text-gray-900"
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

      {/* 파일 관리 (SALES_QUOTE만, 발송 후) */}
      {isSalesQuote && document.status !== 'DRAFT' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">첨부 파일</h3>
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
                className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {uploading ? '업로드 중...' : '파일 업로드'}
              </button>
            </div>
          </div>
          {files.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-400">
              업로드된 파일이 없습니다
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {files.map((file) => (
                <div key={file.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{file.fileName}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{fileTypeLabels[file.fileType] || file.fileType}</span>
                      {file.fileSize && <span>· {(file.fileSize / 1024).toFixed(1)}KB</span>}
                      {file.uploadedBy && <span>· {file.uploadedBy.name}</span>}
                      <span>· {new Date(file.uploadedAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFileDownload(file.id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="다운로드"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleFileDelete(file.id, file.fileName)}
                      className="p-2 text-gray-400 hover:text-red-600"
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
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex gap-6">
            <span>생성일: {new Date(document.createdAt).toLocaleString('ko-KR')}</span>
            {document.updatedAt && (
              <span>수정일: {new Date(document.updatedAt).toLocaleString('ko-KR')}</span>
            )}
          </div>
          {document.createdBy && (
            <span>작성자: {document.createdBy.name}</span>
          )}
        </div>
      </div>
    </div>
  )
}
