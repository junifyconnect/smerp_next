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
  roles?: { role: { id: number; name: string; description?: string } }[]
}

interface RoleInfo {
  id: number
  name: string
  description?: string
}

interface MenuPermissions {
  [key: string]: 'NONE' | 'READ' | 'FULL'
}

const MENU_LABELS: Record<string, string> = {
  SALES_QUOTE: '영업 견적서',
  SALES_APPROVAL: '영업 품의서',
  SALES_ORDER: '영업 발주서',
  MA_QUOTE: 'MA 견적서',
  MA_APPROVAL: 'MA 품의서',
  CLOUD: '클라우드 스토리지',
  USER_MANAGEMENT: '사용자 관리',
}

const MENU_GROUPS = {
  SALES: ['SALES_QUOTE', 'SALES_APPROVAL', 'SALES_ORDER'],
  MA: ['MA_QUOTE', 'MA_APPROVAL'],
  ADMIN: ['USER_MANAGEMENT', 'CLOUD'],
}

const PERMISSION_LABELS: Record<string, { label: string; color: string }> = {
  NONE: { label: '접근불가', color: 'bg-gray-100 text-gray-600' },
  READ: { label: '조회만', color: 'bg-blue-100 text-blue-700' },
  FULL: { label: '전체', color: 'bg-emerald-100 text-emerald-700' },
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

  // Role 관리
  const [assignedRoles, setAssignedRoles] = useState<RoleInfo[]>([])
  const [availableRoles, setAvailableRoles] = useState<RoleInfo[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  // 메뉴 권한 관리
  const [menuPermissions, setMenuPermissions] = useState<MenuPermissions>({})
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [savingPermissions, setSavingPermissions] = useState(false)

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

  // Role 조회
  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true)
    try {
      const res = await fetch(`/api/users/${id}/roles`)
      if (res.ok) {
        const data = await res.json()
        setAssignedRoles(data.assignedRoles || [])
        setAvailableRoles(data.availableRoles || [])
      }
    } catch (err) {
      console.error('Role 조회 실패:', err)
    } finally {
      setLoadingRoles(false)
    }
  }, [id])

  // 메뉴 권한 조회
  const fetchPermissions = useCallback(async () => {
    setLoadingPermissions(true)
    try {
      const res = await fetch(`/api/users/${id}/permissions`)
      if (res.ok) {
        const data = await res.json()
        setMenuPermissions(data.permissions || {})
      }
    } catch (err) {
      console.error('메뉴 권한 조회 실패:', err)
    } finally {
      setLoadingPermissions(false)
    }
  }, [id])

  useEffect(() => {
    fetchUser()
    fetchRoles()
    fetchPermissions()
  }, [fetchUser, fetchRoles, fetchPermissions])

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

  // Role 추가
  const handleAddRole = async (roleId: number) => {
    try {
      const res = await fetch(`/api/users/${id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId }),
      })

      if (res.ok) {
        await fetchRoles()
      } else {
        const data = await res.json()
        alert(data.error || 'Role 추가 실패')
      }
    } catch {
      alert('Role 추가에 실패했습니다')
    }
  }

  // Role 제거
  const handleRemoveRole = async (roleId: number) => {
    if (!confirm('이 Role을 제거하시겠습니까?')) return

    try {
      const res = await fetch(`/api/users/${id}/roles?roleId=${roleId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchRoles()
      } else {
        const data = await res.json()
        alert(data.error || 'Role 제거 실패')
      }
    } catch {
      alert('Role 제거에 실패했습니다')
    }
  }

  // 메뉴 권한 변경
  const handlePermissionChange = (menu: string, level: 'NONE' | 'READ' | 'FULL') => {
    setMenuPermissions((prev) => ({ ...prev, [menu]: level }))
  }

  // 그룹 전체 권한 변경
  const handleGroupPermissionChange = (group: keyof typeof MENU_GROUPS, level: 'NONE' | 'READ' | 'FULL') => {
    const menus = MENU_GROUPS[group]
    setMenuPermissions((prev) => {
      const updated = { ...prev }
      menus.forEach((menu) => {
        updated[menu] = level
      })
      return updated
    })
  }

  // 메뉴 권한 저장
  const handleSavePermissions = async () => {
    setSavingPermissions(true)
    try {
      const res = await fetch(`/api/users/${id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: menuPermissions }),
      })

      if (res.ok) {
        alert('메뉴 권한이 저장되었습니다')
      } else {
        const data = await res.json()
        alert(data.error || '저장 실패')
      }
    } catch {
      alert('저장에 실패했습니다')
    } finally {
      setSavingPermissions(false)
    }
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

      {/* Role 관리 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">Role 관리</h3>

        {loadingRoles ? (
          <div className="text-center py-4 text-gray-500">로딩 중...</div>
        ) : (
          <div className="space-y-4">
            {/* 현재 부여된 Role */}
            <div>
              <p className="text-sm text-gray-500 mb-2">부여된 Role</p>
              {assignedRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assignedRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      <span className="font-medium">{role.name}</span>
                      <button
                        onClick={() => handleRemoveRole(role.id)}
                        className="w-4 h-4 flex items-center justify-center hover:bg-blue-200 rounded-full"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">부여된 Role이 없습니다</p>
              )}
            </div>

            {/* Role 추가 */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Role 추가</p>
              <div className="flex flex-wrap gap-2">
                {availableRoles
                  .filter((role) => !assignedRoles.some((ar) => ar.id === role.id))
                  .map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleAddRole(role.id)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
                    >
                      + {role.name}
                    </button>
                  ))}
                {availableRoles.filter((role) => !assignedRoles.some((ar) => ar.id === role.id)).length === 0 && (
                  <p className="text-sm text-gray-400">추가할 수 있는 Role이 없습니다</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 메뉴 권한 관리 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">메뉴 권한 설정</h3>
          <button
            onClick={handleSavePermissions}
            disabled={savingPermissions || loadingPermissions}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {savingPermissions ? '저장 중...' : '권한 저장'}
          </button>
        </div>

        {loadingPermissions ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : (
          <div>
            {/* SUPER_ADMIN/ADMIN 안내 */}
            {assignedRoles.some((r) => r.name === 'SUPER_ADMIN' || r.name === 'ADMIN') && (
              <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
                <p className="text-sm text-yellow-800">
                  <strong>SUPER_ADMIN</strong> 또는 <strong>ADMIN</strong> Role이 있으면 모든 메뉴에 접근 가능합니다.
                </p>
              </div>
            )}

            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">메뉴</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 w-24">조회</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 w-24">편집</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* 영업 그룹 헤더 */}
                <tr className="bg-blue-50/50">
                  <td className="px-6 py-2">
                    <span className="text-sm font-semibold text-blue-700">영업</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => {
                        const allRead = MENU_GROUPS.SALES.every((m) => menuPermissions[m] === 'READ' || menuPermissions[m] === 'FULL')
                        MENU_GROUPS.SALES.forEach((m) => handlePermissionChange(m, allRead ? 'NONE' : 'READ'))
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      전체
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => {
                        const allFull = MENU_GROUPS.SALES.every((m) => menuPermissions[m] === 'FULL')
                        MENU_GROUPS.SALES.forEach((m) => handlePermissionChange(m, allFull ? 'READ' : 'FULL'))
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      전체
                    </button>
                  </td>
                </tr>
                {MENU_GROUPS.SALES.map((menu) => (
                  <tr key={menu} className="hover:bg-gray-50">
                    <td className="px-6 py-3 pl-10">
                      <span className="text-sm text-gray-700">{MENU_LABELS[menu]}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={menuPermissions[menu] === 'READ' || menuPermissions[menu] === 'FULL'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handlePermissionChange(menu, 'READ')
                          } else {
                            handlePermissionChange(menu, 'NONE')
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={menuPermissions[menu] === 'FULL'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handlePermissionChange(menu, 'FULL')
                          } else if (menuPermissions[menu] === 'FULL') {
                            handlePermissionChange(menu, 'READ')
                          }
                        }}
                        disabled={menuPermissions[menu] === 'NONE'}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 disabled:opacity-30"
                      />
                    </td>
                  </tr>
                ))}

                {/* MA 그룹 헤더 */}
                <tr className="bg-purple-50/50">
                  <td className="px-6 py-2">
                    <span className="text-sm font-semibold text-purple-700">MA</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => {
                        const allRead = MENU_GROUPS.MA.every((m) => menuPermissions[m] === 'READ' || menuPermissions[m] === 'FULL')
                        MENU_GROUPS.MA.forEach((m) => handlePermissionChange(m, allRead ? 'NONE' : 'READ'))
                      }}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      전체
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => {
                        const allFull = MENU_GROUPS.MA.every((m) => menuPermissions[m] === 'FULL')
                        MENU_GROUPS.MA.forEach((m) => handlePermissionChange(m, allFull ? 'READ' : 'FULL'))
                      }}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      전체
                    </button>
                  </td>
                </tr>
                {MENU_GROUPS.MA.map((menu) => (
                  <tr key={menu} className="hover:bg-gray-50">
                    <td className="px-6 py-3 pl-10">
                      <span className="text-sm text-gray-700">{MENU_LABELS[menu]}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={menuPermissions[menu] === 'READ' || menuPermissions[menu] === 'FULL'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handlePermissionChange(menu, 'READ')
                          } else {
                            handlePermissionChange(menu, 'NONE')
                          }
                        }}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={menuPermissions[menu] === 'FULL'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handlePermissionChange(menu, 'FULL')
                          } else if (menuPermissions[menu] === 'FULL') {
                            handlePermissionChange(menu, 'READ')
                          }
                        }}
                        disabled={menuPermissions[menu] === 'NONE'}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 disabled:opacity-30"
                      />
                    </td>
                  </tr>
                ))}

                {/* 관리 그룹 헤더 */}
                <tr className="bg-gray-100/50">
                  <td className="px-6 py-2">
                    <span className="text-sm font-semibold text-gray-700">관리</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => {
                        const allRead = MENU_GROUPS.ADMIN.every((m) => menuPermissions[m] === 'READ' || menuPermissions[m] === 'FULL')
                        MENU_GROUPS.ADMIN.forEach((m) => handlePermissionChange(m, allRead ? 'NONE' : 'READ'))
                      }}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      전체
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => {
                        const allFull = MENU_GROUPS.ADMIN.every((m) => menuPermissions[m] === 'FULL')
                        MENU_GROUPS.ADMIN.forEach((m) => handlePermissionChange(m, allFull ? 'READ' : 'FULL'))
                      }}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      전체
                    </button>
                  </td>
                </tr>
                {MENU_GROUPS.ADMIN.map((menu) => (
                  <tr key={menu} className="hover:bg-gray-50">
                    <td className="px-6 py-3 pl-10">
                      <span className="text-sm text-gray-700">{MENU_LABELS[menu]}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={menuPermissions[menu] === 'READ' || menuPermissions[menu] === 'FULL'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handlePermissionChange(menu, 'READ')
                          } else {
                            handlePermissionChange(menu, 'NONE')
                          }
                        }}
                        className="w-4 h-4 text-gray-600 rounded border-gray-300 focus:ring-gray-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={menuPermissions[menu] === 'FULL'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handlePermissionChange(menu, 'FULL')
                          } else if (menuPermissions[menu] === 'FULL') {
                            handlePermissionChange(menu, 'READ')
                          }
                        }}
                        disabled={menuPermissions[menu] === 'NONE'}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 disabled:opacity-30"
                      />
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
