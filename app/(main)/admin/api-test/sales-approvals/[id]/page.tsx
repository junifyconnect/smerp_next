'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface ApprovalItem {
  id?: string
  partNumber?: string
  description?: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
}

interface PurchaseItem {
  id?: string
  partNumber?: string
  description?: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
  vendorCompany?: string
  purchaseDate?: string
}

interface SignerInfo {
  id: string
  name: string
  signatureUrl?: string
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

  useEffect(() => {
    fetchApproval()
  }, [fetchApproval])

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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">P/N</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">품목</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">수량</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">단가</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {approval.items?.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{item.partNumber || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.description || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-right">{Number(item.unitPrice || 0).toLocaleString()}원</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{Number(item.totalPrice || 0).toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">P/N</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">품목</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">매입처</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">수량</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">단가</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {approval.purchaseItems?.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{item.partNumber || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.description || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.vendorCompany || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-right">{Number(item.unitPrice || 0).toLocaleString()}원</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{Number(item.totalPrice || 0).toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
          </table>
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
