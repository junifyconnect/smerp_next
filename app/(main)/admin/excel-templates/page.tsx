'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface ExcelTemplate {
  id: string
  name: string
  docType: string
  sampleFileName?: string
  itemTableHeaderRow: number
  itemTableStartRow: number
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

const docTypeColors: Record<string, string> = {
  SALES_QUOTE: 'bg-blue-100 text-blue-700',
  SALES_APPROVAL: 'bg-emerald-100 text-emerald-700',
  SALES_ORDER: 'bg-orange-100 text-orange-700',
  MA_QUOTE: 'bg-purple-100 text-purple-700',
  MA_APPROVAL: 'bg-pink-100 text-pink-700',
}

export default function ExcelTemplatesPage() {
  const [templates, setTemplates] = useState<ExcelTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [activeOnly, setActiveOnly] = useState(true)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (docTypeFilter) params.set('docType', docTypeFilter)
      params.set('activeOnly', activeOnly.toString())

      const res = await fetch(`/api/excel-templates?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (err) {
      console.error('조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [docTypeFilter, activeOnly])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleToggleActive = async (template: ExcelTemplate) => {
    try {
      const res = await fetch(`/api/excel-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive }),
      })
      if (res.ok) {
        fetchTemplates()
      } else {
        const data = await res.json()
        alert(data.error || '수정 실패')
      }
    } catch {
      alert('수정에 실패했습니다')
    }
  }

  const handleSetDefault = async (template: ExcelTemplate) => {
    if (template.isDefault) return

    try {
      const res = await fetch(`/api/excel-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true, docType: template.docType }),
      })
      if (res.ok) {
        fetchTemplates()
      } else {
        const data = await res.json()
        alert(data.error || '수정 실패')
      }
    } catch {
      alert('수정에 실패했습니다')
    }
  }

  const handleDelete = async (template: ExcelTemplate) => {
    if (!confirm(`"${template.name}" 양식을 정말 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/excel-templates/${template.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchTemplates()
      } else {
        const data = await res.json()
        alert(data.error || '삭제 실패')
      }
    } catch {
      alert('삭제에 실패했습니다')
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">엑셀 양식 관리</h1>
          <p className="text-sm text-gray-500 mt-1">엑셀 파싱용 양식 등록 및 관리</p>
        </div>
        <Link
          href="/admin/excel-templates/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          양식 등록
        </Link>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">문서 타입</label>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">전체</option>
              <option value="SALES_QUOTE">영업 견적서</option>
              <option value="SALES_APPROVAL">영업 품의서</option>
              <option value="SALES_ORDER">영업 발주서</option>
              <option value="MA_QUOTE">유지보수 견적서</option>
              <option value="MA_APPROVAL">유지보수 품의서</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activeOnly"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="activeOnly" className="text-sm text-gray-700">활성화된 양식만 보기</label>
          </div>
        </div>
      </div>

      {/* 양식 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">양식 목록</h3>
          <span className="text-sm text-gray-500">
            총 <span className="font-semibold text-gray-900">{templates.length}</span>개
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">등록된 양식이 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">양식명</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">문서 타입</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">샘플 파일</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">헤더 행</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">데이터 시작</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">상태</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">기본</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link
                        href={`/admin/excel-templates/${template.id}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {template.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${docTypeColors[template.docType] || 'bg-gray-100 text-gray-700'}`}>
                        {docTypeLabels[template.docType] || template.docType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {template.sampleFileName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {template.itemTableHeaderRow}행
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {template.itemTableStartRow}행
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(template)}
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${
                          template.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {template.isActive ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {template.isDefault ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                          기본
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(template)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          기본으로 설정
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/admin/excel-templates/${template.id}/edit`}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="수정"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(template)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
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
          </div>
        )}
      </div>
    </div>
  )
}
