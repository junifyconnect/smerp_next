'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CloudItem {
  key: string
  name: string
  isFolder: boolean
  size: number
  lastModified: string | null
}

interface CloudListResponse {
  bucket: string
  prefix: string
  items: CloudItem[]
  totalFolders: number
  totalFiles: number
}

export default function CloudTestPage() {
  const [data, setData] = useState<CloudListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPath, setCurrentPath] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cloud?prefix=${encodeURIComponent(currentPath)}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (err) {
      console.error('파일 목록 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPath])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const navigateToFolder = (folderKey: string) => {
    setCurrentPath(folderKey)
  }

  const navigateUp = () => {
    if (!currentPath) return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath(parts.length > 0 ? parts.join('/') + '/' : '')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', currentPath)

      const res = await fetch('/api/cloud', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        await fetchFiles()
        alert('파일이 업로드되었습니다')
      } else {
        const data = await res.json()
        alert(data.error || '업로드 실패')
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

  const handleDownload = async (key: string) => {
    try {
      const res = await fetch(`/api/cloud/download?key=${encodeURIComponent(key)}`)
      if (res.ok) {
        const data = await res.json()
        window.open(data.downloadUrl, '_blank')
      } else {
        alert('다운로드 URL 조회 실패')
      }
    } catch {
      alert('다운로드에 실패했습니다')
    }
  }

  const handleDelete = async (key: string, name: string) => {
    if (!confirm(`"${name}" 파일을 삭제하시겠습니까?`)) return

    setDeleting(key)
    try {
      const res = await fetch(`/api/cloud?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchFiles()
      } else {
        const data = await res.json()
        alert(data.error || '삭제 실패')
      }
    } catch {
      alert('삭제에 실패했습니다')
    } finally {
      setDeleting(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('ko-KR')
  }

  // 경로를 breadcrumb으로 분리
  const getBreadcrumbs = () => {
    if (!currentPath) return []
    const parts = currentPath.split('/').filter(Boolean)
    const crumbs: { name: string; path: string }[] = []
    let path = ''
    for (const part of parts) {
      path += part + '/'
      crumbs.push({ name: part, path })
    }
    return crumbs
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">클라우드 스토리지</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-1">
              버킷: {data.bucket} | 폴더: {data.totalFolders}개 | 파일: {data.totalFiles}개
            </p>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploading ? '업로드 중...' : '파일 업로드'}
          </button>
        </div>
      </div>

      {/* Breadcrumb 네비게이션 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setCurrentPath('')}
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            루트
          </button>
          {getBreadcrumbs().map((crumb, idx) => (
            <span key={crumb.path} className="flex items-center gap-2">
              <span className="text-gray-400">/</span>
              <button
                onClick={() => navigateToFolder(crumb.path)}
                className={idx === getBreadcrumbs().length - 1 ? 'text-gray-900 font-medium' : 'text-blue-600 hover:underline'}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* 파일/폴더 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {currentPath || '/'}
          </h3>
          {currentPath && (
            <button
              onClick={navigateUp}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              상위 폴더
            </button>
          )}
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">로딩 중...</div>
        ) : data?.items.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            이 폴더는 비어있습니다
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">이름</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700 w-32">크기</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700 w-48">수정일</th>
                <th className="px-6 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.items.map((item) => (
                <tr key={item.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {item.isFolder ? (
                      <button
                        onClick={() => navigateToFolder(item.key)}
                        className="flex items-center gap-3 text-blue-600 hover:underline"
                      >
                        <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                        </svg>
                        <span className="font-medium">{item.name}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-gray-900">{item.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {item.isFolder ? '-' : formatFileSize(item.size)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
                    {formatDate(item.lastModified)}
                  </td>
                  <td className="px-6 py-4">
                    {!item.isFolder && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(item.key)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="다운로드"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item.key, item.name)}
                          disabled={deleting === item.key}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          title="삭제"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 안내 */}
      <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">AWS S3 스토리지</p>
            <p>이 페이지에서 S3 버킷의 파일을 직접 관리할 수 있습니다. 파일 업로드, 다운로드, 삭제가 가능합니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
