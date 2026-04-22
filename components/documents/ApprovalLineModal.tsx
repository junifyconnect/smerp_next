'use client'

/**
 * 결재선 지정 모달 (BUSINESS_RULES §5)
 *
 * 품의서 기안(상신) 시 영업담당 / 팀장 / CEO 3명을 명시적으로 지정.
 * 영업 품의서와 MA 품의서가 공유한다.
 *
 * - 기본값: 영업담당=작성자 자신, 팀장=role=TEAM_LEADER 첫 번째, CEO=role=CEO 첫 번째
 * - 대리자 선택 범위: isActive=true 인 모든 사용자 (role 체크 없음)
 */

import { useEffect, useMemo, useState } from 'react'

interface UserOption {
  id: string
  name: string
  role: string | null
  department: string | null
  position: string | null
}

interface ApprovalLineModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (line: {
    salesManagerId: string
    teamLeaderId: string
    ceoId: string
  }) => Promise<void> | void
  currentUserId?: string | null
  title?: string
}

export default function ApprovalLineModal({
  open,
  onClose,
  onSubmit,
  currentUserId,
  title = '결재선 지정',
}: ApprovalLineModalProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [salesManagerId, setSalesManagerId] = useState<string>('')
  const [teamLeaderId, setTeamLeaderId] = useState<string>('')
  const [ceoId, setCeoId] = useState<string>('')

  useEffect(() => {
    if (!open) return

    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/users?isActive=true&limit=200')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const list: UserOption[] = data.users || []
        setUsers(list)

        // 기본값 세팅
        const defaultSalesManager = currentUserId || list[0]?.id || ''
        const defaultTeamLeader = list.find((u) => u.role === 'TEAM_LEADER')?.id || ''
        const defaultCeo = list.find((u) => u.role === 'CEO')?.id || ''
        setSalesManagerId(defaultSalesManager)
        setTeamLeaderId(defaultTeamLeader)
        setCeoId(defaultCeo)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, currentUserId])

  const options = useMemo(() => users, [users])

  if (!open) return null

  const canSubmit =
    !!salesManagerId && !!teamLeaderId && !!ceoId && !submitting && !loading

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await onSubmit({ salesManagerId, teamLeaderId, ceoId })
    } finally {
      setSubmitting(false)
    }
  }

  const formatLabel = (u: UserOption) => {
    const roleLabel = u.role ? ` [${u.role}]` : ''
    const dept = u.department ? ` · ${u.department}` : ''
    const pos = u.position ? ` · ${u.position}` : ''
    return `${u.name}${roleLabel}${dept}${pos}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">결재자 목록을 불러오는 중...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                영업담당 <span className="text-red-500">*</span>
              </label>
              <select
                value={salesManagerId}
                onChange={(e) => setSalesManagerId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                {options.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatLabel(u)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                팀장 <span className="text-red-500">*</span>
              </label>
              <select
                value={teamLeaderId}
                onChange={(e) => setTeamLeaderId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                {options.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatLabel(u)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                CEO <span className="text-red-500">*</span>
              </label>
              <select
                value={ceoId}
                onChange={(e) => setCeoId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                {options.map((u) => (
                  <option key={u.id} value={u.id}>
                    {formatLabel(u)}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500">
              부재 시 다른 사용자를 선택해 대리 결재를 지정할 수 있습니다.
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '상신중...' : '상신'}
          </button>
        </div>
      </div>
    </div>
  )
}
