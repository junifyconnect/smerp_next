'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string
  signatureUrl?: string
}

interface ItemDetail {
  id?: string
  partNumber?: string
  description?: string
  quantity?: number
}

interface ApprovalItem {
  id?: string
  productName: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
  details?: ItemDetail[]
}

interface PurchaseItem {
  id?: string
  productName: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
  vendorCompany?: string
  purchaseDate?: string
  details?: ItemDetail[]
}

interface SignerInfo {
  id: string
  name: string
  signatureUrl?: string
}

interface ApprovalFile {
  id: string
  fileType: string
  fileName: string
  filePath: string
  fileSize?: number
  uploadedAt: string
  uploadedBy?: { id: string; name: string }
}

interface ApprovalVersion {
  id: string
  version: number
  approvalNumber: string
  approvalCode?: string
  status: string
  totalWithVat?: number | string
  createdAt: string
  isCurrent: boolean
}

interface SalesApproval {
  id: string
  approvalNumber: string
  status: string
  approvalCode?: string
  approvalDate?: string
  managerName?: string
  clientCompany?: string
  clientContact?: string
  clientPhone?: string
  endUser?: string
  paymentTerms?: string
  deliveryAddress?: string
  deliveryDate?: string
  invoiceEmail?: string
  receiverName?: string
  receiverPhone?: string
  totalAmount?: number
  vatAmount?: number
  totalWithVat?: number
  purchaseTotal?: number
  purchaseTotalWithVat?: number
  notes?: string
  items: ApprovalItem[]
  purchaseItems: PurchaseItem[]
  deal?: { id: string; name: string; status: string }
  // 결재 정보
  salesManager?: SignerInfo
  salesManagerSignedAt?: string
  teamLeader?: SignerInfo
  teamLeaderSignedAt?: string
  ceo?: SignerInfo
  ceoSignedAt?: string
  rejectedBy?: SignerInfo
  rejectedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt?: string
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: '승인대기', color: 'bg-yellow-100 text-yellow-700' },
  PENDING_TEAM_LEAD: { label: '팀장 승인대기', color: 'bg-orange-100 text-orange-700' },
  PENDING_CEO: { label: '대표 승인대기', color: 'bg-blue-100 text-blue-700' },
  APPROVED: { label: '승인완료', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-700' },
}

export default function SalesApprovalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [approval, setApproval] = useState<SalesApproval | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [files, setFiles] = useState<ApprovalFile[]>([])
  const [versions, setVersions] = useState<ApprovalVersion[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [creatingRevision, setCreatingRevision] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [showSignModal, setShowSignModal] = useState<'SALES_MANAGER' | 'TEAM_LEADER' | 'CEO' | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 사용자 목록 조회
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error('사용자 목록 조회 실패:', err)
    }
  }, [])

  const fetchApproval = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-approvals/${id}`)
      if (res.ok) {
        const data = await res.json()
        setApproval(data)
      } else {
        router.push('/admin/api-test/sales-approvals')
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push('/admin/api-test/sales-approvals')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-approvals/${id}/files`)
      if (res.ok) {
        const data = await res.json()
        setFiles(data)
      }
    } catch (err) {
      console.error('파일 목록 조회 실패:', err)
    }
  }, [id])

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-approvals/${id}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(data.versions || [])
      }
    } catch (err) {
      console.error('버전 목록 조회 실패:', err)
    }
  }, [id])

  useEffect(() => {
    fetchApproval()
    fetchVersions()
  }, [fetchApproval, fetchVersions])

  useEffect(() => {
    if (approval?.status === 'APPROVED') {
      fetchFiles()
    }
  }, [approval?.status, fetchFiles])

  const handleSign = async (role: 'SALES_MANAGER' | 'TEAM_LEADER' | 'CEO') => {
    // 테스트용: 사용자 ID 입력 (실제로는 로그인된 사용자 사용)
    const userId = prompt('서명할 사용자 ID를 입력하세요:')
    if (!userId) return

    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/sales-approvals/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })

      if (res.ok) {
        const updated = await res.json()
        setApproval(updated)
      } else {
        const data = await res.json()
        alert(data.error || '서명 실패')
      }
    } catch {
      alert('서명에 실패했습니다')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleReject = async () => {
    // 테스트용: 사용자 ID와 반려 사유 입력
    const userId = prompt('반려할 사용자 ID를 입력하세요:')
    if (!userId) return

    const reason = prompt('반려 사유를 입력하세요 (선택):')

    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/sales-approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason }),
      })

      if (res.ok) {
        const updated = await res.json()
        setApproval(updated)
      } else {
        const data = await res.json()
        alert(data.error || '반려 실패')
      }
    } catch {
      alert('반려에 실패했습니다')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/sales-approvals/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/admin/api-test/sales-approvals')
      }
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }

  // 새 버전 생성
  const handleCreateRevision = async () => {
    if (!approval) return
    if (!confirm('현재 품의서를 기반으로 새 버전을 생성하시겠습니까?\n(서명 정보는 초기화됩니다)')) return

    setCreatingRevision(true)
    try {
      const res = await fetch(`/api/sales-approvals/${id}/revise`, { method: 'POST' })
      if (res.ok) {
        const newApproval = await res.json()
        router.push(`/admin/api-test/sales-approvals/${newApproval.id}`)
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
    if (!file) return

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', 'SIGNED_ORIGINAL')

      const res = await fetch(`/api/sales-approvals/${id}/files`, {
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
      setUploadingFile(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 파일 다운로드
  const handleFileDownload = async (fileId: string) => {
    try {
      const res = await fetch(`/api/sales-approvals/${id}/files/${fileId}`)
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
      const res = await fetch(`/api/sales-approvals/${id}/files/${fileId}`, {
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getDisplayName = () => {
    if (!approval) return ''
    if (approval.approvalCode) return approval.approvalCode
    if (approval.clientCompany) return approval.clientCompany
    return approval.approvalNumber
  }

  const calcMargin = () => {
    const sales = Number(approval?.totalAmount) || 0
    const purchase = Number(approval?.purchaseTotal) || 0
    return sales - purchase
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!approval) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">품의서를 찾을 수 없습니다</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/api-test/sales-approvals"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{getDisplayName()}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[approval.status]?.color || 'bg-gray-100'}`}>
                {statusLabels[approval.status]?.label || approval.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{approval.approvalNumber}</p>
            {approval.deal && (
              <p className="text-sm text-blue-600 mt-1">Deal: {approval.deal.name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/sales-approvals/${id}/excel`}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            엑셀
          </a>
          {approval.status === 'DRAFT' && (
            <Link
              href={`/admin/api-test/sales-approvals/${id}/edit`}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              수정
            </Link>
          )}
          {approval.status !== 'DRAFT' && (
            <button
              onClick={handleCreateRevision}
              disabled={creatingRevision}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              {creatingRevision ? '생성 중...' : '새 버전'}
            </button>
          )}
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

      {/* 결재선 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">결재선</h3>
          {approval.status === 'REJECTED' && approval.rejectionReason && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-lg">
              반려사유: {approval.rejectionReason}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {/* 영업담당자 */}
          <div className={`p-4 rounded-lg border-2 ${
            approval.salesManager ? 'border-emerald-500 bg-emerald-50' :
            approval.status === 'DRAFT' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">영업담당</p>
              {approval.salesManager ? (
                <>
                  <p className="font-medium text-gray-900">{approval.salesManager.name}</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {approval.salesManagerSignedAt && new Date(approval.salesManagerSignedAt).toLocaleDateString('ko-KR')}
                  </p>
                </>
              ) : (
                <p className="text-gray-400">-</p>
              )}
            </div>
            {approval.status === 'DRAFT' && (
              <button
                onClick={() => handleSign('SALES_MANAGER')}
                disabled={updatingStatus}
                className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updatingStatus ? '처리중...' : '서명'}
              </button>
            )}
          </div>

          {/* 영업팀장 */}
          <div className={`p-4 rounded-lg border-2 ${
            approval.teamLeader ? 'border-emerald-500 bg-emerald-50' :
            approval.status === 'PENDING_TEAM_LEAD' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
          }`}>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">영업팀장</p>
              {approval.teamLeader ? (
                <>
                  <p className="font-medium text-gray-900">{approval.teamLeader.name}</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {approval.teamLeaderSignedAt && new Date(approval.teamLeaderSignedAt).toLocaleDateString('ko-KR')}
                  </p>
                </>
              ) : (
                <p className="text-gray-400">-</p>
              )}
            </div>
            {approval.status === 'PENDING_TEAM_LEAD' && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleSign('TEAM_LEADER')}
                  disabled={updatingStatus}
                  className="flex-1 px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {updatingStatus ? '...' : '승인'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={updatingStatus}
                  className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  반려
                </button>
              </div>
            )}
          </div>

          {/* 대표이사 */}
          <div className={`p-4 rounded-lg border-2 ${
            approval.ceo ? 'border-emerald-500 bg-emerald-50' :
            approval.status === 'PENDING_CEO' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">대표이사</p>
              {approval.ceo ? (
                <>
                  <p className="font-medium text-gray-900">{approval.ceo.name}</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {approval.ceoSignedAt && new Date(approval.ceoSignedAt).toLocaleDateString('ko-KR')}
                  </p>
                </>
              ) : (
                <p className="text-gray-400">-</p>
              )}
            </div>
            {approval.status === 'PENDING_CEO' && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleSign('CEO')}
                  disabled={updatingStatus}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updatingStatus ? '...' : '승인'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={updatingStatus}
                  className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  반려
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 마진 요약 */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-sm text-blue-600">매출 (VAT별도)</p>
            <p className="text-xl font-bold text-blue-900">{Number(approval.totalAmount || 0).toLocaleString()}원</p>
          </div>
          <div>
            <p className="text-sm text-blue-600">매입 (VAT별도)</p>
            <p className="text-xl font-bold text-blue-900">{Number(approval.purchaseTotal || 0).toLocaleString()}원</p>
          </div>
          <div>
            <p className="text-sm text-blue-600">마진</p>
            <p className={`text-xl font-bold ${calcMargin() >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {calcMargin().toLocaleString()}원
            </p>
          </div>
        </div>
      </div>

      {/* 품의 기본 정보 & 매출처 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">품의 정보</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">품의번호</dt>
              <dd className="text-sm font-medium text-gray-900">{approval.approvalNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">품의코드</dt>
              <dd className="text-sm text-gray-900">{approval.approvalCode || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">품의일자</dt>
              <dd className="text-sm text-gray-900">
                {approval.approvalDate ? new Date(approval.approvalDate).toLocaleDateString('ko-KR') : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">품의담당</dt>
              <dd className="text-sm text-gray-900">{approval.managerName || '-'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">매출처 정보</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">고객사</dt>
              <dd className="text-sm font-medium text-gray-900">{approval.clientCompany || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">담당자</dt>
              <dd className="text-sm text-gray-900">{approval.clientContact || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">연락처</dt>
              <dd className="text-sm text-gray-900">{approval.clientPhone || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">End User</dt>
              <dd className="text-sm text-gray-900">{approval.endUser || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">결제조건</dt>
              <dd className="text-sm text-gray-900">{approval.paymentTerms || '-'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 배송 정보 */}
      {(approval.deliveryAddress || approval.receiverName) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">배송 정보</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-gray-500">배송주소</dt>
              <dd className="text-sm text-gray-900 mt-1">{approval.deliveryAddress || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">납기일</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {approval.deliveryDate ? new Date(approval.deliveryDate).toLocaleDateString('ko-KR') : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">수령자</dt>
              <dd className="text-sm text-gray-900 mt-1">{approval.receiverName || '-'} {approval.receiverPhone}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* 매출 품목 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">매출 품목 ({approval.items?.length || 0}개)</h3>
        </div>
        <div className="p-4 space-y-3">
          {approval.items?.map((item, idx) => (
            <div key={idx} className="border border-blue-200 rounded-lg overflow-hidden">
              {/* 메인 품목 헤더 */}
              <div className="bg-blue-50 px-4 py-3 flex items-center justify-between border-b border-blue-200">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">P/N</span>
                  <span className="font-semibold text-blue-900">{item.productName || '-'}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-600">{item.quantity}개</span>
                  <span className="text-gray-600">{Number(item.unitPrice || 0).toLocaleString()}원</span>
                  <span className="font-bold text-blue-700">{Number(item.totalPrice || 0).toLocaleString()}원</span>
                </div>
              </div>
              {/* 하위 품목 리스트 */}
              {item.details && item.details.length > 0 && (
                <div className="bg-white divide-y divide-gray-100">
                  {item.details.map((detail, dIdx) => (
                    <div key={dIdx} className="px-4 py-2.5 flex items-start gap-3">
                      <span className="text-gray-400 mt-0.5">├</span>
                      <div className="flex-1">
                        {detail.partNumber && (
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded mr-2">
                            {detail.partNumber}
                          </span>
                        )}
                        <span className="text-sm text-gray-700 whitespace-pre-wrap">{detail.description}</span>
                        {detail.quantity && (
                          <span className="ml-2 text-xs text-gray-400">x{detail.quantity}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">매출 합계</span>
                <span className="font-medium">{Number(approval.totalAmount || 0).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">부가세</span>
                <span>{Number(approval.vatAmount || 0).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-base">
                <span className="font-semibold">VAT 포함</span>
                <span className="font-bold text-blue-600">{Number(approval.totalWithVat || 0).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 매입 품목 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-purple-50">
          <h3 className="text-sm font-semibold text-gray-900">매입 품목 ({approval.purchaseItems?.length || 0}개)</h3>
        </div>
        <div className="p-4 space-y-3">
          {approval.purchaseItems?.map((item, idx) => (
            <div key={idx} className="border border-purple-200 rounded-lg overflow-hidden">
              {/* 메인 품목 헤더 */}
              <div className="bg-purple-50 px-4 py-3 flex items-center justify-between border-b border-purple-200">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-medium rounded">P/N</span>
                  <span className="font-semibold text-purple-900">{item.productName || '-'}</span>
                  {item.vendorCompany && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {item.vendorCompany}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-600">{item.quantity}개</span>
                  <span className="text-gray-600">{Number(item.unitPrice || 0).toLocaleString()}원</span>
                  <span className="font-bold text-purple-700">{Number(item.totalPrice || 0).toLocaleString()}원</span>
                </div>
              </div>
              {/* 하위 품목 리스트 */}
              {item.details && item.details.length > 0 && (
                <div className="bg-white divide-y divide-gray-100">
                  {item.details.map((detail, dIdx) => (
                    <div key={dIdx} className="px-4 py-2.5 flex items-start gap-3">
                      <span className="text-gray-400 mt-0.5">├</span>
                      <div className="flex-1">
                        {detail.partNumber && (
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded mr-2">
                            {detail.partNumber}
                          </span>
                        )}
                        <span className="text-sm text-gray-700 whitespace-pre-wrap">{detail.description}</span>
                        {detail.quantity && (
                          <span className="ml-2 text-xs text-gray-400">x{detail.quantity}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t bg-purple-50">
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">매입 합계</span>
                <span className="font-medium">{Number(approval.purchaseTotal || 0).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-base">
                <span className="font-semibold">VAT 포함</span>
                <span className="font-bold text-purple-600">{Number(approval.purchaseTotalWithVat || 0).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 비고 */}
      {approval.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">비고</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{approval.notes}</p>
        </div>
      )}

      {/* 원본 파일 (결재 완료 후) */}
      {approval.status === 'APPROVED' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">원본 파일</h3>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".xlsx,.xls,.pdf,.doc,.docx,.hwp"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploadingFile ? '업로드 중...' : '파일 업로드'}
              </button>
            </div>
          </div>

          {files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.fileSize)} | {new Date(file.uploadedAt).toLocaleString('ko-KR')}
                        {file.uploadedBy && ` | ${file.uploadedBy.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                      {file.fileType === 'SIGNED_ORIGINAL' ? '서명원본' : file.fileType}
                    </span>
                    <button
                      onClick={() => handleFileDownload(file.id)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="다운로드"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleFileDelete(file.id, file.fileName)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="삭제"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              업로드된 파일이 없습니다
            </div>
          )}
        </div>
      )}

      {/* 버전 이력 */}
      {versions.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">버전 이력 ({versions.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`px-6 py-4 flex items-center justify-between ${
                  version.isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-mono text-gray-500">v{version.version}</span>
                  <span className="font-medium">{version.approvalCode || version.approvalNumber}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    statusLabels[version.status]?.color || 'bg-gray-100 text-gray-700'
                  }`}>
                    {statusLabels[version.status]?.label || version.status}
                  </span>
                  {version.isCurrent && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      현재
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {new Date(version.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                  {version.totalWithVat && (
                    <span className="text-sm font-medium">
                      {Number(version.totalWithVat).toLocaleString()}원
                    </span>
                  )}
                  {!version.isCurrent && (
                    <Link
                      href={`/admin/api-test/sales-approvals/${version.id}`}
                      className="text-sm text-blue-600 hover:underline"
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

      {/* 메타 정보 */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex gap-6">
            <span>생성일: {new Date(approval.createdAt).toLocaleString('ko-KR')}</span>
            {approval.updatedAt && (
              <span>수정일: {new Date(approval.updatedAt).toLocaleString('ko-KR')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
