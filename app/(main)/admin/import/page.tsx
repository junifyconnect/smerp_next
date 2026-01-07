'use client'

import { useState, useRef } from 'react'

interface UploadResult {
  fileName: string
  success: boolean
  docNumber?: string
  documentId?: string
  error?: string
  detectedDocType?: string
}

const docTypeLabels: Record<string, string> = {
  SALES_QUOTE: '견적서',
  SALES_APPROVAL: '품의서',
  SALES_ORDER: '발주서',
  MA_QUOTE: 'MA 견적서',
  MA_APPROVAL: 'MA 품의서',
}

export default function ExcelImportPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<UploadResult[]>([])
  const [docType, setDocType] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
      setResults([])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    )
    setFiles(droppedFiles)
    setResults([])
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setResults([])

    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      if (docType) formData.append('docType', docType)

      const res = await fetch('/api/documents/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      setResults(data.results || [])
    } catch (err) {
      alert('업로드 중 오류가 발생했습니다')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">엑셀 일괄 업로드</h1>

      {/* 문서 타입 선택 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">문서 타입 (선택)</h2>
        <p className="text-sm text-gray-500 mb-4">
          지정하지 않으면 엑셀 파일 내용을 분석하여 자동으로 문서 타입을 감지합니다.
        </p>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">자동 감지</option>
          {Object.entries(docTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* 파일 업로드 영역 */}
      <div
        className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-400 transition-colors cursor-pointer mb-6"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="text-5xl mb-4">📁</div>
        <p className="text-lg font-medium text-gray-700 mb-2">
          엑셀 파일을 드래그하거나 클릭하여 선택
        </p>
        <p className="text-sm text-gray-500">
          .xlsx, .xls 파일 지원 (여러 파일 동시 업로드 가능)
        </p>
      </div>

      {/* 선택된 파일 목록 */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">선택된 파일 ({files.length}개)</h2>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? '업로드 중...' : `${files.length}개 파일 업로드`}
          </button>
        </div>
      )}

      {/* 업로드 결과 */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">
            업로드 결과
            <span className="ml-2 text-sm font-normal text-gray-500">
              (성공: {successCount}, 실패: {failCount})
            </span>
          </h2>
          <ul className="space-y-2">
            {results.map((result, index) => (
              <li
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.success ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{result.success ? '✅' : '❌'}</span>
                  <div>
                    <p className="font-medium">{result.fileName}</p>
                    {result.success ? (
                      <p className="text-sm text-green-700">
                        {result.docNumber} - {docTypeLabels[result.detectedDocType || ''] || result.detectedDocType}
                      </p>
                    ) : (
                      <p className="text-sm text-red-700">{result.error}</p>
                    )}
                  </div>
                </div>
                {result.success && result.documentId && (
                  <a
                    href={`/sales/quotes/${result.documentId}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    문서 보기
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
