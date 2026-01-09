'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  email: string
  name: string
  phone?: string
  department?: string
  position?: string
  signatureUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const signatureInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    department: '',
    position: '',
    password: '',
    isActive: true,
  })

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${id}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          department: data.department || '',
          position: data.position || '',
          password: '',
          isActive: data.isActive,
        })
      } else {
        router.push('/admin/api-test/users')
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push('/admin/api-test/users')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const updateData: Record<string, unknown> = {
        name: formData.name,
        phone: formData.phone,
        department: formData.department,
        position: formData.position,
        isActive: formData.isActive,
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (res.ok) {
        const updated = await res.json()
        setUser(updated)
        setEditing(false)
        setFormData({ ...formData, password: '' })
      } else {
        const data = await res.json()
        alert(data.error || '수정 실패')
      }
    } catch {
      alert('수정에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingSignature(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/users/${id}/signature`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const updated = await res.json()
        setUser(prev => prev ? { ...prev, signatureUrl: updated.signatureUrl } : null)
        alert('서명이 등록되었습니다')
      } else {
        const data = await res.json()
        alert(data.error || '서명 업로드 실패')
      }
    } catch {
      alert('서명 업로드에 실패했습니다')
    } finally {
      setUploadingSignature(false)
      if (signatureInputRef.current) {
        signatureInputRef.current.value = ''
      }
    }
  }

  const handleSignatureDelete = async () => {
    if (!confirm('서명을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/users/${id}/signature`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setUser(prev => prev ? { ...prev, signatureUrl: undefined } : null)
        alert('서명이 삭제되었습니다')
      } else {
        const data = await res.json()
        alert(data.error || '서명 삭제 실패')
      }
    } catch {
      alert('서명 삭제에 실패했습니다')
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/admin/api-test/users')
      } else {
        const data = await res.json()
        alert(data.error || '삭제 실패')
      }
    } catch {
      alert('삭제에 실패했습니다')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('ID가 복사되었습니다')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">사용자를 찾을 수 없습니다</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/api-test/users"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {user.isActive ? '활성' : '비활성'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {editing ? '취소' : '수정'}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      </div>

      {/* ID 복사 */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600">사용자 ID (품의서 서명 시 사용)</p>
            <p className="font-mono text-blue-900">{user.id}</p>
          </div>
          <button
            onClick={() => copyToClipboard(user.id)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            복사
          </button>
        </div>
      </div>

      {/* 서명 관리 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">서명 이미지</h3>
        <div className="flex items-center gap-6">
          <div className="w-40 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
            {user.signatureUrl ? (
              <span className="text-emerald-600 text-sm">서명 등록됨</span>
            ) : (
              <span className="text-gray-400 text-sm">미등록</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              onChange={handleSignatureUpload}
              className="hidden"
            />
            <button
              onClick={() => signatureInputRef.current?.click()}
              disabled={uploadingSignature}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploadingSignature ? '업로드 중...' : '서명 업로드'}
            </button>
            {user.signatureUrl && (
              <button
                onClick={handleSignatureDelete}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
              >
                서명 삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 정보 / 수정 폼 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">사용자 정보</h3>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택</option>
                  <option value="SALES">영업</option>
                  <option value="MA">MA</option>
                  <option value="FINANCE">재무</option>
                  <option value="ADMIN">관리</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직급</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 (변경 시에만 입력)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="6자 이상"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">활성 상태</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">이메일</dt>
              <dd className="text-sm font-medium text-gray-900 mt-1">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">이름</dt>
              <dd className="text-sm font-medium text-gray-900 mt-1">{user.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">연락처</dt>
              <dd className="text-sm text-gray-900 mt-1">{user.phone || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">부서</dt>
              <dd className="text-sm text-gray-900 mt-1">{user.department || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">직급</dt>
              <dd className="text-sm text-gray-900 mt-1">{user.position || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">가입일</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {new Date(user.createdAt).toLocaleString('ko-KR')}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  )
}
