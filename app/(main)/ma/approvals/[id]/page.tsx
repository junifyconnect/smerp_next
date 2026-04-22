'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import ApprovalLineModal from '@/components/documents/ApprovalLineModal'

// 엑셀 구조: 매출/매입 통합
interface MAApprovalItem {
  id: string
  smCode?: string
  vendorCode?: string
  clientCompany?: string
  salesCompany?: string
  salesPrice?: number
  quantity?: number
  salesBillingCycle?: string
  startDate?: string
  endDate?: string
  purchaseCompany?: string
  purchasePrice?: number
  purchaseBillingCycle?: string
  billingDayOfMonth?: number
}

interface SignerInfo {
  id: string
  name: string
  signatureUrl?: string | null
}

interface MAApproval {
  id: string
  approvalNumber: string
  approvalCode?: string | null
  status: string
  approvalDate?: string
  managerName?: string
  notes?: string
  totalAmount?: number
  purchaseTotal?: number
  createdById: string
  items: MAApprovalItem[]
  createdAt: string
  updatedAt?: string

  // 결재 정보
  salesManager?: SignerInfo | null
  teamLeader?: SignerInfo | null
  ceo?: SignerInfo | null
  salesManagerSignedAt?: string | null
  teamLeaderSignedAt?: string | null
  ceoSignedAt?: string | null
  rejectedBy?: { id: string; name: string } | null
  rejectedAt?: string | null
  rejectionReason?: string | null
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: '기안됨', color: 'bg-yellow-100 text-yellow-700' },
  PENDING_TEAM_LEAD: { label: '팀장 결재 대기', color: 'bg-orange-100 text-orange-700' },
  PENDING_CEO: { label: '대표 결재 대기', color: 'bg-blue-100 text-blue-700' },
  APPROVED: { label: '승인완료', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-700' },
}

export default function MAApprovalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { data: session } = useSession()
  const [approval, setApproval] = useState<MAApproval | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [approvalLineOpen, setApprovalLineOpen] = useState(false)

  const currentUserId = session?.user?.id
  const isCreator = !!approval && !!currentUserId && approval.createdById === currentUserId

  const fetchApproval = useCallback(async () => {
    try {
      const res = await fetch(`/api/ma-approvals/${id}`)
      if (res.ok) {
        const data = await res.json()
        setApproval(data)
      } else {
        router.push('/ma/approvals')
      }
    } catch (err) {
      console.error('조회 실패:', err)
      router.push('/ma/approvals')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchApproval()
  }, [fetchApproval])

  // 기안(상신): 결재선 지정 모달 → submit API
  const handleSubmitApproval = async (line: {
    salesManagerId: string
    teamLeaderId: string
    ceoId: string
  }) => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/ma-approvals/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(line),
      })
      if (res.ok) {
        setApprovalLineOpen(false)
        await fetchApproval()
      } else {
        const data = await res.json()
        alert(data.error || '기안에 실패했습니다')
      }
    } catch {
      alert('기안에 실패했습니다')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // 팀장/CEO 결재 서명
  const handleSign = async (role: 'TEAM_LEADER' | 'CEO') => {
    const userId = session?.user?.id
    if (!userId) {
      alert('로그인이 필요합니다')
      return
    }
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/ma-approvals/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      if (res.ok) {
        await fetchApproval()
      } else {
        const data = await res.json()
        alert(data.error || '서명에 실패했습니다')
      }
    } catch {
      alert('서명에 실패했습니다')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // 반려 (팀장/CEO)
  const handleReject = async () => {
    const userId = session?.user?.id
    if (!userId) return
    const reason = prompt('반려 사유를 입력하세요 (선택)')
    if (reason === null) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/ma-approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason }),
      })
      if (res.ok) {
        await fetchApproval()
      } else {
        const data = await res.json()
        alert(data.error || '반려에 실패했습니다')
      }
    } finally {
      setUpdatingStatus(false)
    }
  }

  // 회수 (작성자)
  const handleWithdraw = async () => {
    if (!confirm('기안한 품의서를 회수하시겠습니까?\n(작성중 상태로 돌아갑니다)')) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/ma-approvals/${id}/withdraw`, { method: 'POST' })
      if (res.ok) {
        await fetchApproval()
      } else {
        const data = await res.json()
        alert(data.error || '회수에 실패했습니다')
      }
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/ma-approvals/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/ma/approvals')
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR')
  }

  // 합계 계산
  const calculateTotals = () => {
    if (!approval) return { salesTotal: 0, purchaseTotal: 0, margin: 0, marginRate: 0 }
    const items = approval.items || []
    const salesTotal = items.reduce((sum, item) => sum + ((item.salesPrice || 0) * (item.quantity || 1)), 0)
    const purchaseTotal = items.reduce((sum, item) => sum + ((item.purchasePrice || 0) * (item.quantity || 1)), 0)
    const margin = salesTotal - purchaseTotal
    const marginRate = salesTotal > 0 ? Math.round((margin / salesTotal) * 100) : 0
    return { salesTotal, purchaseTotal, margin, marginRate }
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

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/ma/approvals"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{approval.approvalNumber}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[approval.status]?.color || 'bg-gray-100'}`}>
                {statusLabels[approval.status]?.label || approval.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {approval.status === 'DRAFT' && isCreator && (
            <>
              <Link
                href={`/ma/approvals/${id}/edit`}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수정
              </Link>
              <button
                onClick={() => setApprovalLineOpen(true)}
                disabled={updatingStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updatingStatus ? '처리중...' : '기안'}
              </button>
            </>
          )}

          {/* 작성자: 기안 후 회수 가능 */}
          {isCreator &&
            (approval.status === 'PENDING' ||
              approval.status === 'PENDING_TEAM_LEAD' ||
              approval.status === 'PENDING_CEO') && (
              <button
                onClick={handleWithdraw}
                disabled={updatingStatus}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                회수
              </button>
            )}

          {approval.status === 'DRAFT' && isCreator && (
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

      {/* 결재선 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-2 border-b bg-gray-50 text-xs font-semibold text-gray-700">결재선</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs">
            <tr>
              <th className="px-3 py-2 text-center border-r border-gray-200 w-1/3">영업담당</th>
              <th className="px-3 py-2 text-center border-r border-gray-200 w-1/3">영업팀장</th>
              <th className="px-3 py-2 text-center w-1/3">대표이사</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`px-3 py-3 text-center border-r border-gray-200 ${approval.salesManager ? 'bg-emerald-50' : ''}`}>
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
              </td>

              <td className={`px-3 py-3 text-center border-r border-gray-200 ${
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
                  <p className="text-gray-400">지정 전</p>
                )}
                {approval.status === 'PENDING_TEAM_LEAD' && approval.teamLeader?.id === currentUserId && (
                  <div className="flex gap-1 mt-2 justify-center">
                    <button
                      onClick={() => handleSign('TEAM_LEADER')}
                      disabled={updatingStatus}
                      className="px-2 py-1 bg-emerald-600 text-white text-[11px] rounded hover:bg-emerald-700 disabled:opacity-50"
                    >서명</button>
                    <button
                      onClick={handleReject}
                      disabled={updatingStatus}
                      className="px-2 py-1 bg-red-100 text-red-700 text-[11px] rounded hover:bg-red-200 disabled:opacity-50"
                    >반려</button>
                  </div>
                )}
              </td>

              <td className={`px-3 py-3 text-center ${
                approval.ceo && approval.ceoSignedAt ? 'bg-emerald-50' :
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
                  <p className="text-gray-400">지정 전</p>
                )}
                {approval.status === 'PENDING_CEO' && approval.ceo?.id === currentUserId && (
                  <div className="flex gap-1 mt-2 justify-center">
                    <button
                      onClick={() => handleSign('CEO')}
                      disabled={updatingStatus}
                      className="px-2 py-1 bg-emerald-600 text-white text-[11px] rounded hover:bg-emerald-700 disabled:opacity-50"
                    >승인</button>
                    <button
                      onClick={handleReject}
                      disabled={updatingStatus}
                      className="px-2 py-1 bg-red-100 text-red-700 text-[11px] rounded hover:bg-red-200 disabled:opacity-50"
                    >반려</button>
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 반려 정보 */}
        {approval.status === 'REJECTED' && approval.rejectedBy && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700">
            <strong>반려:</strong> {approval.rejectedBy.name} ·{' '}
            {approval.rejectedAt && new Date(approval.rejectedAt).toLocaleString('ko-KR')}
            {approval.rejectionReason && <> · 사유: {approval.rejectionReason}</>}
          </div>
        )}
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="text-sm w-full">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">품의일자</td>
              <td className="px-3 py-2 border-r border-gray-100">
                <span className="text-sm">{formatDate(approval.approvalDate)}</span>
              </td>
              <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">담당자</td>
              <td className="px-3 py-2">
                <span className="text-sm">{approval.managerName || '-'}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 품목 테이블 (매출/매입 통합) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">품목</h3>
          <div className="text-xs text-gray-500">단위: 원</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-20">SM코드</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-20">벤더코드</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">고객사</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">매출처</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">매출가</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-12">수량</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-20">매출주기</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-24">계약시작</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-24">계약종료</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">매입처</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 w-24">매입가</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-20">매입주기</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 w-16" title="매월 청구일">청구일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(approval.items || []).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-center text-xs">{item.smCode || '-'}</td>
                  <td className="px-2 py-2 text-center text-xs">{item.vendorCode || '-'}</td>
                  <td className="px-2 py-2 text-xs">{item.clientCompany || '-'}</td>
                  <td className="px-2 py-2 text-xs">{item.salesCompany || '-'}</td>
                  <td className="px-2 py-2 text-right text-xs text-blue-600 font-medium">{(item.salesPrice || 0).toLocaleString()}</td>
                  <td className="px-2 py-2 text-center text-xs">{item.quantity || 1}</td>
                  <td className="px-2 py-2 text-center text-xs">{item.salesBillingCycle || '-'}</td>
                  <td className="px-2 py-2 text-center text-xs">{formatDate(item.startDate)}</td>
                  <td className="px-2 py-2 text-center text-xs">{formatDate(item.endDate)}</td>
                  <td className="px-2 py-2 text-xs">{item.purchaseCompany || '-'}</td>
                  <td className="px-2 py-2 text-right text-xs text-red-600 font-medium">{(item.purchasePrice || 0).toLocaleString()}</td>
                  <td className="px-2 py-2 text-center text-xs">{item.purchaseBillingCycle || '-'}</td>
                  <td className="px-2 py-2 text-center text-xs">{item.billingDayOfMonth ?? 31}일</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 합계 영역 */}
        <div className="bg-gray-50 border-t px-4 py-3">
          <div className="flex justify-end items-center gap-8">
            <div className="text-right">
              <div className="text-xs text-gray-500">매출 합계</div>
              <div className="text-base font-bold text-blue-700">{totals.salesTotal.toLocaleString()}원</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">매입 합계</div>
              <div className="text-base font-bold text-red-700">{totals.purchaseTotal.toLocaleString()}원</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">이익</div>
              <div className={`text-base font-bold ${totals.margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {totals.margin.toLocaleString()}원
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">이익률</div>
              <div className={`text-base font-bold ${totals.marginRate >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {totals.marginRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 비고 */}
      {approval.notes && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="text-sm w-full">
            <tbody>
              <tr>
                <td className="px-3 py-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50 whitespace-nowrap w-24">비고</td>
                <td className="px-3 py-2">
                  <span className="text-sm">{approval.notes}</span>
                </td>
              </tr>
            </tbody>
          </table>
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

      {/* 결재선 지정 모달 (기안 시) */}
      <ApprovalLineModal
        open={approvalLineOpen}
        onClose={() => setApprovalLineOpen(false)}
        onSubmit={handleSubmitApproval}
        currentUserId={currentUserId}
        title="MA 품의서 기안 - 결재선 지정"
      />
    </div>
  )
}
