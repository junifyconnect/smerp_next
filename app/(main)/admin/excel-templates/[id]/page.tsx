'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ExcelTemplate {
  id: string
  name: string
  docType: string
  sampleFileName?: string
  sampleFilePath?: string
  fieldMappings: Record<string, string>
  itemTableHeaderRow: number
  itemTableStartRow: number
  itemTableEndRow?: number
  salesColumnMappings: Record<string, string>
  purchaseColumnMappings: Record<string, string>
  mainItemDetection?: string
  subItemDetection?: string
  totalRowDetection?: string
  isActive: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

const docTypeLabels: Record<string, string> = {
  SALES_QUOTE: '영업 견적서',
  SALES_APPROVAL: '영업 품의서',
  SALES_ORDER: '영업 발주서',
  MA_QUOTE: '유지보수 견적서',
  MA_APPROVAL: '유지보수 품의서',
}

const fieldLabels: Record<string, string> = {
  documentDate: '문서일자',
  documentNumber: '문서번호',
  customerCompany: '고객사명',
  customerContact: '고객 담당자',
  projectName: '프로젝트명',
  validUntil: '유효기간',
  deliveryDate: '납품일자',
  itemNo: '품목 NO',
  itemName: '품목명',
  itemSpec: '사양/규격',
  itemQty: '수량',
  itemUnit: '단위',
  salesUnitPrice: '매출단가',
  salesTotalPrice: '매출합계',
  purchaseVendor: '매입처',
  purchaseUnitPrice: '매입단가',
  purchaseTotalPrice: '매입합계',
  remarks: '비고',
}

export default function ExcelTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [template, setTemplate] = useState<ExcelTemplate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/excel-templates/${id}`)
        if (res.ok) {
          const data = await res.json()
          setTemplate(data)
        } else {
          alert('양식을 찾을 수 없습니다')
          router.push('/admin/excel-templates')
        }
      } catch {
        alert('조회에 실패했습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplate()
  }, [id, router])

  const handleDelete = async () => {
    if (!template) return
    if (!confirm(`"${template.name}" 양식을 정말 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/excel-templates/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/admin/excel-templates')
      } else {
        const error = await res.json()
        alert(error.error || '삭제 실패')
      }
    } catch {
      alert('삭제에 실패했습니다')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!template) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin/excel-templates" className="hover:text-blue-600">
              엑셀 양식 관리
            </Link>
            <span>/</span>
            <span>상세</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/excel-templates/${id}/edit`}
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            수정
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기본 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="w-32 text-sm text-gray-500">양식명</dt>
              <dd className="text-sm text-gray-900 font-medium">{template.name}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-gray-500">문서 타입</dt>
              <dd className="text-sm text-gray-900">{docTypeLabels[template.docType] || template.docType}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-gray-500">샘플 파일</dt>
              <dd className="text-sm text-gray-900">{template.sampleFileName || '-'}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-gray-500">상태</dt>
              <dd>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {template.isActive ? '활성' : '비활성'}
                </span>
                {template.isDefault && (
                  <span className="ml-2 inline-flex px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                    기본
                  </span>
                )}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-gray-500">등록일</dt>
              <dd className="text-sm text-gray-900">{new Date(template.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-gray-500">수정일</dt>
              <dd className="text-sm text-gray-900">{new Date(template.updatedAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {/* 품목 테이블 설정 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">품목 테이블 설정</h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="w-32 text-sm text-gray-500">헤더 행</dt>
              <dd className="text-sm text-gray-900">{template.itemTableHeaderRow}행</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-gray-500">데이터 시작</dt>
              <dd className="text-sm text-gray-900">{template.itemTableStartRow}행</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-gray-500">데이터 종료</dt>
              <dd className="text-sm text-gray-900">{template.itemTableEndRow ? `${template.itemTableEndRow}행` : '자동 감지'}</dd>
            </div>
          </dl>
        </div>

        {/* 필드 매핑 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">필드 매핑</h2>
          {Object.keys(template.fieldMappings).length === 0 ? (
            <p className="text-sm text-gray-500">매핑된 필드가 없습니다</p>
          ) : (
            <dl className="space-y-2">
              {Object.entries(template.fieldMappings).map(([key, value]) => (
                <div key={key} className="flex">
                  <dt className="w-32 text-sm text-gray-500">{fieldLabels[key] || key}</dt>
                  <dd className="text-sm text-gray-900 font-mono">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* 품목 열 매핑 (영업) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">품목 열 매핑 (영업)</h2>
          {Object.keys(template.salesColumnMappings).length === 0 ? (
            <p className="text-sm text-gray-500">매핑된 열이 없습니다</p>
          ) : (
            <dl className="space-y-2">
              {Object.entries(template.salesColumnMappings).map(([key, value]) => (
                <div key={key} className="flex">
                  <dt className="w-32 text-sm text-gray-500">{fieldLabels[key] || key}</dt>
                  <dd className="text-sm text-gray-900 font-mono">{value}열</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* 품목 열 매핑 (매입) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">품목 열 매핑 (매입)</h2>
          {Object.keys(template.purchaseColumnMappings).length === 0 ? (
            <p className="text-sm text-gray-500">매핑된 열이 없습니다</p>
          ) : (
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(template.purchaseColumnMappings).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm text-gray-500">{fieldLabels[key] || key}</dt>
                  <dd className="text-sm text-gray-900 font-mono">{value}열</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  )
}
