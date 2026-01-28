'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface QuoteItem {
  id?: string
  partNumber?: string
  description?: string
  quantity: number
  srpPrice?: number
  unitPrice?: number
  totalPrice?: number
  productId?: string | null
}

interface QuoteProduct {
  id: string
  name: string
  quantity: number
  srpPrice?: number
  unitPrice?: number
  totalPrice?: number
  items: QuoteItem[]
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
  products?: QuoteProduct[]
  items: QuoteItem[]
  files?: QuoteFile[]
  deal?: { id: string; name: string; status: string }
  createdById?: string
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
  const { data: session } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [quote, setQuote] = useState<SalesQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [files, setFiles] = useState<QuoteFile[]>([])
  const [uploading, setUploading] = useState(false)

  // 현재 로그인된 사용자가 작성자인지 확인
  const isCreator = session?.user?.id && quote?.createdById === session.user.id

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-quotes/${id}`)
      if (res.ok) {
        const data = await res.json()
        setQuote(data)
      } else {
        router.push('/sales/quotes')
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push('/sales/quotes')
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

  useEffect(() => {
    fetchQuote()
    fetchFiles()
  }, [fetchQuote, fetchFiles])

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
        router.push('/sales/quotes')
      }
    } catch (err) {
      console.error('삭제 실패:', err)
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
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/sales/quotes"
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
              <p className="text-sm text-blue-600 mt-1">Deal: {quote.deal.name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {quote.status === 'DRAFT' && isCreator && (
            <>
              <Link
                href={`/sales/quotes/${id}/edit`}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수정
              </Link>
              <button
                onClick={() => handleStatusChange('SENT')}
                disabled={updatingStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {updatingStatus ? '처리중...' : '발송하기'}
              </button>
            </>
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

      {/* 기본 정보 + 상태 변경 (나란히 배치) */}
      <div className="flex items-start justify-between gap-4">
        {/* 기본 정보 (컴팩트 테이블 스타일) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="text-sm">
            <tbody className="divide-y divide-gray-100">
              {/* 1행: 회사, 참조, 전화 */}
              <tr>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">회사</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-36 px-2 py-1 text-xs">{quote.clientCompany || '-'}</div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">참조</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-28 px-2 py-1 text-xs">{quote.clientContact || '-'}</div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">전화</td>
                <td className="px-1.5 py-1">
                  <div className="w-32 px-2 py-1 text-xs">{quote.clientPhone || '-'}</div>
                </td>
              </tr>
              {/* 2행: Fax, CP, E-mail */}
              <tr className="bg-gray-50/30">
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">Fax</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-36 px-2 py-1 text-xs">{quote.clientFax || '-'}</div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">C P</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-28 px-2 py-1 text-xs">{quote.clientMobile || '-'}</div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">E-mail</td>
                <td className="px-1.5 py-1">
                  <div className="w-40 px-2 py-1 text-xs">{quote.clientEmail || '-'}</div>
                </td>
              </tr>
              {/* 3행: 견적일, 납기일, 유효기간 */}
              <tr>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">견적일</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-28 px-2 py-1 text-xs">
                    {quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString('ko-KR') : '-'}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">납기일</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-28 px-2 py-1 text-xs">
                    {quote.deliveryDate === '별도협의' ? '별도협의' : (quote.deliveryDate ? new Date(quote.deliveryDate).toLocaleDateString('ko-KR') : '-')}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">유효기간</td>
                <td className="px-1.5 py-1">
                  <div className="w-32 px-2 py-1 text-xs">{quote.validUntil ? `견적일로부터 ${quote.validUntil}일` : '-'}</div>
                </td>
              </tr>
              {/* 4행: 결제조건, 견적담당, 프로젝트명 */}
              <tr className="bg-gray-50/30">
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">결제조건</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-36 px-2 py-1 text-xs">{quote.paymentTerms || '-'}</div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">견적담당</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-28 px-2 py-1 text-xs">{quote.managerName || '-'}</div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">프로젝트</td>
                <td className="px-1.5 py-1">
                  <div className="w-40 px-2 py-1 text-xs">{quote.projectName || '-'}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 상태 변경 (우측 정렬) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 p-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-600">상태 변경</span>
            <div className="flex gap-2">
              {quote.status === 'DRAFT' && (
                <span className="text-xs text-gray-500">발송 전</span>
              )}
              {quote.status === 'SENT' && (
                <>
                  <button
                    onClick={() => handleStatusChange('ACCEPTED')}
                    disabled={updatingStatus}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {updatingStatus ? '...' : '수주'}
                  </button>
                  <button
                    onClick={() => handleStatusChange('REJECTED')}
                    disabled={updatingStatus}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {updatingStatus ? '...' : '실주'}
                  </button>
                </>
              )}
              {(quote.status === 'ACCEPTED' || quote.status === 'REJECTED') && (
                <span className="text-xs text-gray-500">확정됨</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 품목 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">품목</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-24">P/N</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-64">Description</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16">Q&apos;ty</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">SRP</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">Price</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-28">Sum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* 제품 그룹 표시 */}
              {quote.products?.map((product, pIdx) => (
                <React.Fragment key={product.id}>
                  {/* 제품 헤더 행 */}
                  <tr className="bg-emerald-50 border-b border-emerald-200">
                    <td className="px-2 py-2 text-xs font-medium text-emerald-700" colSpan={2}>
                      {product.name || `제품 ${pIdx + 1}`}
                    </td>
                    <td className="px-2 py-2 text-xs text-emerald-700 text-center">
                      {product.quantity}
                    </td>
                    <td className="px-2 py-2 text-xs text-emerald-600 text-right">
                      {product.srpPrice ? Number(product.srpPrice).toLocaleString() : '-'}
                    </td>
                    <td className="px-2 py-2 text-xs text-emerald-700 text-right">
                      {product.unitPrice ? Number(product.unitPrice).toLocaleString() : '-'}
                    </td>
                    <td className="px-2 py-2 text-xs font-bold text-emerald-700 text-right">
                      {product.totalPrice ? Number(product.totalPrice).toLocaleString() : '-'}
                    </td>
                  </tr>
                  {/* 제품 소속 품목들 */}
                  {product.items?.map((item, iIdx) => (
                    <tr key={item.id || `${product.id}-${iIdx}`} className="bg-gray-50/50">
                      <td className="pl-6 pr-2 py-1.5 text-xs text-gray-500">{item.partNumber || '-'}</td>
                      <td className="px-2 py-1.5 text-xs text-gray-600 whitespace-pre-wrap">{item.description || '-'}</td>
                      <td className="px-2 py-1.5 text-xs text-gray-500 text-center">{item.quantity}</td>
                      <td className="px-2 py-1.5 text-xs text-gray-400 text-right">
                        {item.srpPrice ? Number(item.srpPrice).toLocaleString() : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-gray-500 text-right">
                        {item.unitPrice ? Number(item.unitPrice).toLocaleString() : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-gray-500 text-right">
                        {item.totalPrice ? Number(item.totalPrice).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {/* 독립 품목 (productId가 null인 items) */}
              {quote.items?.filter(item => !item.productId).map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-xs text-gray-600">{item.partNumber || '-'}</td>
                  <td className="px-2 py-2 text-xs text-gray-900 whitespace-pre-wrap">{item.description || '-'}</td>
                  <td className="px-2 py-2 text-xs text-center">{item.quantity}</td>
                  <td className="px-2 py-2 text-xs text-right text-gray-600">
                    {item.srpPrice?.toLocaleString() || '-'}
                  </td>
                  <td className="px-2 py-2 text-xs text-right">
                    {item.unitPrice?.toLocaleString() || 0}
                  </td>
                  <td className="px-2 py-2 text-xs text-right font-medium text-blue-700">
                    {item.totalPrice?.toLocaleString() || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 합계 영역 */}
        <div className="bg-gray-50 border-t">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="px-2 py-3 w-24"></td>
                <td className="px-2 py-3 w-64"></td>
                <td className="px-2 py-3 w-16"></td>
                <td className="px-2 py-3 w-24"></td>
                <td className="px-2 py-3 w-24 text-right text-xs text-gray-500">합계</td>
                <td className="px-2 py-3 w-28 text-right">
                  <div className="text-xs text-gray-500">VAT별도</div>
                  <div className="text-base font-bold text-blue-700">
                    {(quote.totalAmount || 0).toLocaleString()}원
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 기타 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden inline-block">
        <table className="text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap align-top">기타</td>
              <td className="px-1.5 py-1">
                <div className="w-[600px] min-h-[40px] px-2 py-1 text-xs text-gray-700 whitespace-pre-wrap">{quote.notes || '-'}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>


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
      <div className="flex justify-end">
        <div className="flex gap-6 text-sm text-gray-500">
          <span>생성일: {new Date(quote.createdAt).toLocaleString('ko-KR')}</span>
          {quote.updatedAt && (
            <span>수정일: {new Date(quote.updatedAt).toLocaleString('ko-KR')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
