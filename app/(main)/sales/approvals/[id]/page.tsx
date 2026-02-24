'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

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
  isLatest?: boolean
}

interface SalesApproval {
  id: string
  approvalNumber: string
  status: string
  approvalCode?: string
  approvalDate?: string
  managerName?: string
  // 버전 관리
  version?: number
  isLatest?: boolean
  originalId?: string
  clientCompany?: string
  clientContact?: string
  clientPhone?: string
  endUser?: string
  paymentTerms?: string
  deliveryAddress?: string
  deliveryDate?: string
  invoiceEmail?: string
  invoiceDate?: string
  invoiceDueDate?: string
  paymentDate?: string
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
  createdById?: string
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
  const { data: session } = useSession()

  const [approval, setApproval] = useState<SalesApproval | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [files, setFiles] = useState<ApprovalFile[]>([])
  const [versions, setVersions] = useState<ApprovalVersion[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 현재 로그인된 사용자가 작성자인지 확인
  const isCreator = session?.user?.id && approval?.createdById === session.user.id

  const fetchApproval = useCallback(async () => {
    try {
      const res = await fetch(`/api/sales-approvals/${id}`)
      if (res.ok) {
        const data = await res.json()
        // products→items 구조를 상세페이지용 flat 구조로 변환
        if (data.products && data.products.length > 0 && (!data.items || data.items.length === 0)) {
          data.items = data.products.map((p: { name?: string; quantity?: number; unitPrice?: number | string; totalPrice?: number | string; items?: { partNumber?: string; description?: string; quantity?: number }[] }) => ({
            productName: p.name || '',
            quantity: p.quantity || 1,
            unitPrice: Number(p.unitPrice) || 0,
            totalPrice: Number(p.totalPrice) || 0,
            details: (p.items || []).map((item: { partNumber?: string; description?: string; quantity?: number }) => ({
              partNumber: item.partNumber || '',
              description: item.description || '',
              quantity: item.quantity || 1,
            })),
          }))
          // 매입: products의 items를 flat하게 펼쳐서 개별 매입 항목으로
          data.purchaseItems = data.products.flatMap((p: { name?: string; items?: { vendorName?: string; purchaseQty?: number; purchasePrice?: number | string; purchaseTotal?: number | string; purchaseDate?: string; partNumber?: string; description?: string }[] }) =>
            (p.items || []).map((item: { vendorName?: string; purchaseQty?: number; purchasePrice?: number | string; purchaseTotal?: number | string; purchaseDate?: string; partNumber?: string; description?: string }) => ({
              productName: item.partNumber || item.description || p.name || '',
              quantity: item.purchaseQty || 1,
              unitPrice: Number(item.purchasePrice) || 0,
              totalPrice: Number(item.purchaseTotal) || 0,
              vendorCompany: item.vendorName || '',
              purchaseDate: item.purchaseDate || '',
            }))
          )
        }
        setApproval(data)
      } else {
        router.push('/sales/approvals')
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push('/sales/approvals')
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
    const userId = session?.user?.id
    if (!userId) {
      alert('로그인이 필요합니다')
      return
    }

    // 영업담당 서명은 작성자만 가능
    if (role === 'SALES_MANAGER' && !isCreator) {
      alert('본인이 작성한 품의서만 기안할 수 있습니다')
      return
    }

    // DRAFT 상태에서 영업담당 기안 시 확인
    if (role === 'SALES_MANAGER' && approval?.status === 'DRAFT') {
      if (!confirm('품의서를 기안하시겠습니까?\n(기안 후 팀장 결재 대기 상태가 됩니다)')) return
    }

    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/sales-approvals/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })

      if (res.ok) {
        const updated = await res.json()
        // sign 후에도 fetchApproval로 전체 데이터 다시 로드
        await fetchApproval()
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
    const userId = session?.user?.id
    if (!userId) {
      alert('로그인이 필요합니다')
      return
    }

    const reason = prompt('반려 사유를 입력하세요 (선택):')

    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/sales-approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason }),
      })

      if (res.ok) {
        await fetchApproval()
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

  const handleWithdraw = async () => {
    if (!confirm('품의서를 회수하시겠습니까?\n기존본은 회수됨 처리되고, 새 버전이 작성중 상태로 생성됩니다.')) return

    try {
      const res = await fetch(`/api/sales-approvals/${id}/withdraw`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        alert(data.message)
        router.push(`/sales/approvals/${data.approval.id}`)
      } else {
        const data = await res.json()
        alert(data.error || '회수에 실패했습니다')
      }
    } catch {
      alert('회수에 실패했습니다')
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/sales-approvals/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/sales/approvals')
      }
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }

  // 새 버전 생성
  const handleCreateRevision = () => {
    if (!approval) return
    if (!confirm('현재 품의서를 기반으로 새 버전을 생성하시겠습니까?\n(서명 정보는 초기화되며, 저장 시 새 버전이 생성됩니다)')) return

    // 수정 페이지로 이동 (revise 모드)
    router.push(`/sales/approvals/${id}/edit?revise=true`)
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
            href="/sales/approvals"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{getDisplayName()}</h1>
              {approval.version && approval.version > 1 && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  v{approval.version}
                </span>
              )}
              {!approval.isLatest && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                  이전 버전
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[approval.status]?.color || 'bg-gray-100'}`}>
                {statusLabels[approval.status]?.label || approval.status}
              </span>
            </div>
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
          {approval.status === 'DRAFT' && isCreator && (
            <Link
              href={`/sales/approvals/${id}/edit`}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              수정
            </Link>
          )}
          {['PENDING', 'PENDING_TEAM_LEAD', 'PENDING_CEO'].includes(approval.status) && isCreator && (
            <button
              onClick={handleWithdraw}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              회수
            </button>
          )}
          {approval.status !== 'DRAFT' && approval.isLatest !== false && (
            <button
              onClick={handleCreateRevision}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              새 버전
            </button>
          )}
          {approval.isLatest !== false && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 기본 정보 + 결재선 (나란히 배치) */}
      <div className="flex items-start justify-between gap-4">
        {/* 기본 정보 (컴팩트 테이블 스타일) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="text-sm">
            <tbody className="divide-y divide-gray-100">
              {/* 1행: 품의코드, 매출처, End User */}
              <tr>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">품의코드</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-36 px-2 py-1 text-xs">{approval.approvalCode || '-'}</div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">매출처</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-40 px-2 py-1 text-xs">{approval.clientCompany || '-'}</div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">End User</td>
                <td className="px-1.5 py-1">
                  <div className="w-40 px-2 py-1 text-xs">{approval.endUser || '-'}</div>
                </td>
              </tr>
              {/* 2행: 품의일자, 담당자/연락처, MT&SN */}
              <tr className="bg-gray-50/30">
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">품의일자</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-36 px-2 py-1 text-xs">
                    {approval.approvalDate ? new Date(approval.approvalDate).toLocaleDateString('ko-KR') : '-'}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">담당자/연락처</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="flex gap-1">
                    <div className="w-20 px-2 py-1 text-xs">{approval.clientContact || '-'}</div>
                    <div className="w-28 px-2 py-1 text-xs">{approval.clientPhone || ''}</div>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">MT&S/N</td>
                <td className="px-1.5 py-1">
                  <div className="w-40 px-2 py-1 text-xs">{approval.paymentTerms || '-'}</div>
                </td>
              </tr>
              {/* 3행: 품의담당 */}
              <tr>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">품의담당</td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="w-36 px-2 py-1 text-xs">{approval.managerName || '-'}</div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap"></td>
                <td className="px-1.5 py-1 border-r border-gray-100">
                  <div className="flex gap-1">
                    <div className="w-20"></div>
                    <div className="w-28"></div>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap"></td>
                <td className="px-1.5 py-1">
                  <div className="w-40"></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 결재선 (컴팩트) - 우측 정렬 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
          {approval.status === 'REJECTED' && approval.rejectionReason && (
            <div className="text-xs text-red-600 bg-red-50 px-2 py-1 border-b border-red-100">
              반려: {approval.rejectionReason}
            </div>
          )}
          <table className="text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-1.5 text-center font-medium text-gray-600 border-r border-gray-200">영업담당</th>
                <th className="px-3 py-1.5 text-center font-medium text-gray-600 border-r border-gray-200">영업팀장</th>
                <th className="px-3 py-1.5 text-center font-medium text-gray-600">대표이사</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* 영업담당 */}
                <td className={`px-3 py-2 text-center border-r border-gray-200 min-w-[80px] ${
                  approval.salesManager ? 'bg-emerald-50' :
                  (approval.status === 'DRAFT' || approval.status === 'PENDING') ? 'bg-blue-50' : ''
                }`}>
                  {approval.salesManager ? (
                    <div>
                      <p className="font-medium text-gray-900">{approval.salesManager.name}</p>
                      <p className="text-[10px] text-emerald-600">
                        {approval.salesManagerSignedAt && new Date(approval.salesManagerSignedAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400">-</p>
                  )}
                  {(approval.status === 'DRAFT' || approval.status === 'PENDING') && isCreator && !approval.salesManager && (
                    <button
                      onClick={() => handleSign('SALES_MANAGER')}
                      disabled={updatingStatus}
                      className="mt-1 px-2 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updatingStatus ? '...' : '기안'}
                    </button>
                  )}
                </td>
                {/* 영업팀장 */}
                <td className={`px-3 py-2 text-center border-r border-gray-200 min-w-[80px] ${
                  approval.teamLeader ? 'bg-emerald-50' :
                  approval.status === 'PENDING_TEAM_LEAD' ? 'bg-orange-50' : ''
                }`}>
                  {approval.teamLeader ? (
                    <div>
                      <p className="font-medium text-gray-900">{approval.teamLeader.name}</p>
                      <p className="text-[10px] text-emerald-600">
                        {approval.teamLeaderSignedAt && new Date(approval.teamLeaderSignedAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400">-</p>
                  )}
                  {approval.status === 'PENDING_TEAM_LEAD' && (
                    <div className="flex gap-1 mt-1 justify-center">
                      <button
                        onClick={() => handleSign('TEAM_LEADER')}
                        disabled={updatingStatus}
                        className="px-2 py-1 bg-orange-600 text-white text-[10px] rounded hover:bg-orange-700 disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={updatingStatus}
                        className="px-2 py-1 bg-red-600 text-white text-[10px] rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        반려
                      </button>
                    </div>
                  )}
                </td>
                {/* 대표이사 */}
                <td className={`px-3 py-2 text-center min-w-[80px] ${
                  approval.ceo ? 'bg-emerald-50' :
                  approval.status === 'PENDING_CEO' ? 'bg-blue-50' : ''
                }`}>
                  {approval.ceo ? (
                    <div>
                      <p className="font-medium text-gray-900">{approval.ceo.name}</p>
                      <p className="text-[10px] text-emerald-600">
                        {approval.ceoSignedAt && new Date(approval.ceoSignedAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400">-</p>
                  )}
                  {approval.status === 'PENDING_CEO' && (
                    <div className="flex gap-1 mt-1 justify-center">
                      <button
                        onClick={() => handleSign('CEO')}
                        disabled={updatingStatus}
                        className="px-2 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={updatingStatus}
                        className="px-2 py-1 bg-red-600 text-white text-[10px] rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        반려
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 통합 품목 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">품목</h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-blue-600">매출 {approval.items?.length || 0}건</span>
            <span className="text-purple-600">매입 {approval.purchaseItems?.length || 0}건</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-24">P/N</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 w-64">품목</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16">수량</th>
                {/* 매출 */}
                <th className="px-2 py-2 text-right text-xs font-medium text-blue-600 w-24">매출단가</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-blue-600 w-28 border-r-2 border-gray-300">매출합계</th>
                {/* 매입 */}
                <th className="px-2 py-2 text-left text-xs font-medium text-purple-600 w-28">매입처</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-purple-600 w-24">매입단가</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-purple-600 w-28">매입합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* 통합 매출인 경우 (items가 1개이고 details가 있는 경우) */}
              {approval.items?.length === 1 && approval.items[0].details && approval.items[0].details.length > 0 ? (
                <>
                  {/* 통합 매출 행 */}
                  <tr className="bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                    <td className="px-2 py-2">
                      <span className="text-xs font-medium text-gray-600">통합</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-sm font-medium text-blue-900">{approval.items[0].productName}</span>
                    </td>
                    <td className="px-2 py-2 text-center text-sm">{approval.items[0].quantity}</td>
                    <td className="px-2 py-2 text-right text-sm">{Number(approval.items[0].unitPrice || 0).toLocaleString()}</td>
                    <td className="px-2 py-2 text-right font-medium text-blue-700 border-r-2 border-gray-300">
                      {Number(approval.items[0].totalPrice || 0).toLocaleString()}
                    </td>
                    {/* 통합 매입인 경우 (매입 품목이 1개인 경우 - 제품 레벨 매입) */}
                    {approval.purchaseItems?.length === 1 ? (
                      <>
                        <td className="px-2 py-2 text-sm">{approval.purchaseItems[0].vendorCompany || '-'}</td>
                        <td className="px-2 py-2 text-right text-sm">{Number(approval.purchaseItems[0].unitPrice || 0).toLocaleString()}</td>
                        <td className="px-2 py-2 text-right font-medium text-purple-700">
                          {Number(approval.purchaseItems[0].totalPrice || 0).toLocaleString()}
                        </td>
                      </>
                    ) : approval.purchaseItems && approval.purchaseItems.length > 0 ? (
                      <>
                        <td className="px-2 py-2 text-xs text-gray-400">개별</td>
                        <td className="px-2 py-2 text-right text-xs text-gray-400">-</td>
                        <td className="px-2 py-2 text-right text-xs text-gray-400">-</td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2"></td>
                      </>
                    )}
                  </tr>
                  {/* 개별 품목 행들 (매출 details 기준) */}
                  {approval.items[0].details.map((detail, idx) => {
                    const purchaseDetail = approval.purchaseItems?.[0]?.details?.[idx]
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-xs text-gray-600">{detail.partNumber || '-'}</td>
                        <td className="px-2 py-2 text-sm text-gray-700 whitespace-pre-wrap">{detail.description || '-'}</td>
                        <td className="px-2 py-2 text-center text-sm">{detail.quantity || '-'}</td>
                        <td className="px-2 py-2 text-right text-xs text-gray-400">-</td>
                        <td className="px-2 py-2 text-right text-xs text-gray-400 border-r-2 border-gray-300">-</td>
                        {/* 통합 매입 (매입 품목 1개) - 하위 행은 대시 표시 */}
                        {approval.purchaseItems?.length === 1 ? (
                          <>
                            <td className="px-2 py-2 text-xs text-gray-400">-</td>
                            <td className="px-2 py-2 text-right text-xs text-gray-400">-</td>
                            <td className="px-2 py-2 text-right text-xs text-gray-400">-</td>
                          </>
                        ) : approval.purchaseItems?.[idx] ? (
                          <>
                            <td className="px-2 py-2 text-sm">{approval.purchaseItems[idx].vendorCompany || '-'}</td>
                            <td className="px-2 py-2 text-right text-sm">{Number(approval.purchaseItems[idx].unitPrice || 0).toLocaleString()}</td>
                            <td className="px-2 py-2 text-right font-medium text-purple-700">
                              {Number(approval.purchaseItems[idx].totalPrice || 0).toLocaleString()}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-2 text-xs text-gray-400">-</td>
                            <td className="px-2 py-2 text-right text-xs text-gray-400">-</td>
                            <td className="px-2 py-2 text-right text-xs text-gray-400">-</td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </>
              ) : (
                /* 개별 품목 모드 */
                (() => {
                  const maxRows = Math.max(approval.items?.length || 0, approval.purchaseItems?.length || 0)
                  const rows = []
                  for (let i = 0; i < maxRows; i++) {
                    const salesItem = approval.items?.[i]
                    const purchaseItem = approval.purchaseItems?.[i]

                    // 매출 아이템에 details가 있는 경우
                    if (salesItem?.details && salesItem.details.length > 0) {
                      salesItem.details.forEach((detail, dIdx) => {
                        rows.push(
                          <tr key={`${i}-${dIdx}`} className="hover:bg-gray-50">
                            <td className="px-2 py-2 text-xs text-gray-600">{detail.partNumber || '-'}</td>
                            <td className="px-2 py-2 text-sm text-gray-700 whitespace-pre-wrap">{detail.description || '-'}</td>
                            <td className="px-2 py-2 text-center text-sm">{detail.quantity || salesItem.quantity}</td>
                            <td className="px-2 py-2 text-right text-sm">
                              {dIdx === 0 ? Number(salesItem.unitPrice || 0).toLocaleString() : '-'}
                            </td>
                            <td className="px-2 py-2 text-right font-medium text-blue-700 border-r-2 border-gray-300">
                              {dIdx === 0 ? Number(salesItem.totalPrice || 0).toLocaleString() : '-'}
                            </td>
                            {dIdx === 0 && purchaseItem ? (
                              <>
                                <td className="px-2 py-2 text-sm">{purchaseItem.vendorCompany || '-'}</td>
                                <td className="px-2 py-2 text-right text-sm">{Number(purchaseItem.unitPrice || 0).toLocaleString()}</td>
                                <td className="px-2 py-2 text-right font-medium text-purple-700">
                                  {Number(purchaseItem.totalPrice || 0).toLocaleString()}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-2 py-2"></td>
                                <td className="px-2 py-2"></td>
                                <td className="px-2 py-2"></td>
                              </>
                            )}
                          </tr>
                        )
                      })
                    } else if (salesItem) {
                      rows.push(
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-2 py-2 text-xs text-gray-600">{salesItem.productName || '-'}</td>
                          <td className="px-2 py-2 text-sm text-gray-700">{salesItem.productName || '-'}</td>
                          <td className="px-2 py-2 text-center text-sm">{salesItem.quantity}</td>
                          <td className="px-2 py-2 text-right text-sm">{Number(salesItem.unitPrice || 0).toLocaleString()}</td>
                          <td className="px-2 py-2 text-right font-medium text-blue-700 border-r-2 border-gray-300">
                            {Number(salesItem.totalPrice || 0).toLocaleString()}
                          </td>
                          {purchaseItem ? (
                            <>
                              <td className="px-2 py-2 text-sm">{purchaseItem.vendorCompany || '-'}</td>
                              <td className="px-2 py-2 text-right text-sm">{Number(purchaseItem.unitPrice || 0).toLocaleString()}</td>
                              <td className="px-2 py-2 text-right font-medium text-purple-700">
                                {Number(purchaseItem.totalPrice || 0).toLocaleString()}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-2 py-2"></td>
                              <td className="px-2 py-2"></td>
                              <td className="px-2 py-2"></td>
                            </>
                          )}
                        </tr>
                      )
                    } else if (purchaseItem) {
                      rows.push(
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2 border-r-2 border-gray-300"></td>
                          <td className="px-2 py-2 text-sm">{purchaseItem.vendorCompany || '-'}</td>
                          <td className="px-2 py-2 text-right text-sm">{Number(purchaseItem.unitPrice || 0).toLocaleString()}</td>
                          <td className="px-2 py-2 text-right font-medium text-purple-700">
                            {Number(purchaseItem.totalPrice || 0).toLocaleString()}
                          </td>
                        </tr>
                      )
                    }
                  }
                  return rows
                })()
              )}
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
                <td className="px-2 py-3 w-24 text-right text-sm text-gray-500">매출합계</td>
                <td className="px-2 py-3 w-28 text-right border-r-2 border-gray-300">
                  <div className="text-xs text-gray-500">VAT별도</div>
                  <div className="text-base font-bold text-blue-700">
                    {Number(approval.totalSalesAmount || approval.totalAmount || 0).toLocaleString()}원
                  </div>
                </td>
                <td className="px-2 py-3 w-28 text-right text-sm text-gray-500">매입합계</td>
                <td className="px-2 py-3 w-24 text-right">
                  <div className="text-xs text-gray-500">VAT별도</div>
                  <div className="text-base font-bold text-purple-700">
                    {Number(approval.totalPurchaseAmount || approval.purchaseTotal || 0).toLocaleString()}원
                  </div>
                </td>
                <td className="px-2 py-3 w-28 text-right">
                  <div className="text-xs text-gray-500">VAT포함</div>
                  <div className="text-base font-bold text-purple-700">
                    {Math.round(Number(approval.totalPurchaseAmount || approval.purchaseTotal || 0) * 1.1).toLocaleString()}원
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      {/* 기타 정보 (계산서/결제/배송/비고) */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden inline-block">
        <table className="text-sm">
          <tbody className="divide-y divide-gray-100">
            {/* 1행: 기타 (비고) */}
            <tr>
              <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap align-top">기타</td>
              <td className="px-1.5 py-1" colSpan={5}>
                <div className="w-full min-h-[40px] px-2 py-1 text-xs text-gray-700 whitespace-pre-wrap">{approval.notes || '-'}</div>
              </td>
            </tr>
            {/* 2행: 계산서 발행일, 계산서 발행예정일, 결제일 */}
            <tr className="bg-gray-50/30">
              <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">계산서 발행일</td>
              <td className="px-1.5 py-1 border-r border-gray-100">
                <div className="w-36 px-2 py-1 text-xs">
                  {approval.invoiceDate ? new Date(approval.invoiceDate).toLocaleDateString('ko-KR') : '-'}
                </div>
              </td>
              <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">계산서 발행예정일</td>
              <td className="px-1.5 py-1 border-r border-gray-100">
                <div className="w-36 px-2 py-1 text-xs">
                  {approval.invoiceDueDate ? new Date(approval.invoiceDueDate).toLocaleDateString('ko-KR') : '-'}
                </div>
              </td>
              <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">결제일</td>
              <td className="px-1.5 py-1">
                <div className="w-40 px-2 py-1 text-xs">{approval.paymentDate || '-'}</div>
              </td>
            </tr>
            {/* 3행: 계산서 메일 */}
            <tr>
              <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">계산서 메일</td>
              <td className="px-1.5 py-1" colSpan={5}>
                <div className="w-72 px-2 py-1 text-xs">{approval.invoiceEmail || '-'}</div>
              </td>
            </tr>
            {/* 4행: 배송주소 */}
            <tr className="bg-gray-50/30">
              <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">배송주소</td>
              <td className="px-1.5 py-1" colSpan={5}>
                <div className="w-full px-2 py-1 text-xs">{approval.deliveryAddress || '-'}</div>
              </td>
            </tr>
            {/* 5행: 받으실분/연락처, 배송일 */}
            <tr>
              <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">받으실분/연락처</td>
              <td className="px-1.5 py-1 border-r border-gray-100">
                <div className="flex gap-1">
                  <div className="w-20 px-2 py-1 text-xs">{approval.receiverName || '-'}</div>
                  <div className="w-28 px-2 py-1 text-xs">{approval.receiverPhone || ''}</div>
                </div>
              </td>
              <td className="px-2 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap">배송일</td>
              <td className="px-1.5 py-1" colSpan={3}>
                <div className="w-36 px-2 py-1 text-xs">{approval.deliveryDate || '-'}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
                  {version.isLatest && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      최신
                    </span>
                  )}
                  {version.isCurrent && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      현재 보는 중
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
                      href={`/sales/approvals/${version.id}`}
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
      <div className="flex justify-end">
        <div className="flex gap-6 text-sm text-gray-500">
          <span>생성일: {new Date(approval.createdAt).toLocaleString('ko-KR')}</span>
          {approval.updatedAt && (
            <span>수정일: {new Date(approval.updatedAt).toLocaleString('ko-KR')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
