'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DocumentItem {
  id: string
  partNumber?: string
  description?: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
}

interface Document {
  id: string
  docNumber: string
  docType: string
  status: string
  title?: string
  projectName?: string
  clientCompany?: string
  clientContact?: string
  clientPhone?: string
  clientEmail?: string
  vendorCompany?: string
  vendorContact?: string
  vendorPhone?: string
  totalAmount?: number
  vatAmount?: number
  totalWithVat?: number
  quoteDate?: string
  deliveryDate?: string
  paymentTerms?: string
  notes?: string
  items: DocumentItem[]
  createdAt: string
  createdBy?: {
    name: string
  }
}

interface DocumentDetailProps {
  documentId: string
  basePath: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: '승인대기', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: '승인완료', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-700' },
  COMPLETED: { label: '완료', color: 'bg-blue-100 text-blue-700' },
}

export default function DocumentDetail({ documentId, basePath }: DocumentDetailProps) {
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDocument()
  }, [documentId])

  const fetchDocument = async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}`)
      if (!res.ok) throw new Error('문서를 찾을 수 없습니다')
      const data = await res.json()
      setDocument(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadExcel = async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/excel`)
      if (!res.ok) throw new Error('다운로드 실패')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = `${document?.docNumber || 'document'}.xlsx`
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('엑셀 다운로드에 실패했습니다')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">로딩 중...</div>
  }

  if (error || !document) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || '문서를 찾을 수 없습니다'}</p>
        <button
          onClick={() => router.push(basePath)}
          className="text-blue-600 hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push(basePath)}
            className="text-gray-500 hover:text-gray-700 mb-2"
          >
            &larr; 목록으로
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{document.docNumber}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadExcel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            엑셀 다운로드
          </button>
          <button
            onClick={() => router.push(`${basePath}/${documentId}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            수정
          </button>
        </div>
      </div>

      {/* 상태 */}
      <div className="mb-6">
        <span className={`inline-block px-3 py-1 rounded-full text-sm ${statusLabels[document.status]?.color}`}>
          {statusLabels[document.status]?.label || document.status}
        </span>
      </div>

      {/* 기본 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 고객 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">고객 정보</h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="w-24 text-sm text-gray-500">고객사</dt>
              <dd className="text-sm font-medium">{document.clientCompany || '-'}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-sm text-gray-500">담당자</dt>
              <dd className="text-sm">{document.clientContact || '-'}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-sm text-gray-500">연락처</dt>
              <dd className="text-sm">{document.clientPhone || '-'}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-sm text-gray-500">이메일</dt>
              <dd className="text-sm">{document.clientEmail || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* 문서 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">문서 정보</h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="w-24 text-sm text-gray-500">프로젝트</dt>
              <dd className="text-sm font-medium">{document.projectName || '-'}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-sm text-gray-500">견적일</dt>
              <dd className="text-sm">
                {document.quoteDate ? new Date(document.quoteDate).toLocaleDateString('ko-KR') : '-'}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-sm text-gray-500">납기일</dt>
              <dd className="text-sm">
                {document.deliveryDate ? new Date(document.deliveryDate).toLocaleDateString('ko-KR') : '-'}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-24 text-sm text-gray-500">결제조건</dt>
              <dd className="text-sm">{document.paymentTerms || '-'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 품목 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">품목 목록</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">No</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">품번</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">품목명</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">수량</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">단가</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {document.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  품목이 없습니다
                </td>
              </tr>
            ) : (
              document.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm">{item.partNumber || '-'}</td>
                  <td className="px-4 py-3 text-sm">{item.description || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {item.unitPrice ? `${item.unitPrice.toLocaleString()}원` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {item.totalPrice ? `${item.totalPrice.toLocaleString()}원` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 금액 요약 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">금액 요약</h2>
        <div className="flex justify-end">
          <dl className="w-64 space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">공급가액</dt>
              <dd className="text-sm font-medium">
                {document.totalAmount ? `${document.totalAmount.toLocaleString()}원` : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">부가세</dt>
              <dd className="text-sm">
                {document.vatAmount ? `${document.vatAmount.toLocaleString()}원` : '-'}
              </dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <dt className="text-sm font-semibold">총 금액</dt>
              <dd className="text-lg font-bold text-blue-600">
                {document.totalWithVat ? `${document.totalWithVat.toLocaleString()}원` : '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 비고 */}
      {document.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">비고</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{document.notes}</p>
        </div>
      )}
    </div>
  )
}
