'use client'

/**
 * 계산서 발행 현황 (재설계 후)
 *
 *   - source of truth: InvoiceRecord
 *   - 행 단위: InvoiceRecord 하나 = 한 행 (매출/매입 모두)
 *   - 매출 식별: (approvalId, productId, salesItemId)
 *   - 매입 식별: (approvalId, vendorCompany)
 *
 *   상태 전이는 전용 API 호출:
 *     - 발행(PENDING→ISSUED):        POST /api/management/invoices/issue
 *     - 수정발행(ISSUED/NEEDS_AMENDMENT → CANCELLED + 신규 PENDING): POST /api/management/invoices/amend
 *     - 취소(→ CANCELLED):           POST /api/management/invoices/cancel
 *
 *   메타(invoiceDate, invoiceNumber, remarks)만 PATCH로 인라인 편집.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  InvoiceGroup,
  InvoiceRecordRow,
  InvoiceStatusResponse,
  InvoiceStatusType,
  InvoiceTypeKind,
} from './_types/invoice-status'
import { INVOICE_STATUS_CONFIG } from './_types/invoice-status'
import {
  formatNumber,
  formatDate,
  formatDateForInput,
  getCurrentMonth,
} from './_lib/helpers'

// ============================================================
// Action Modal (발행 / 수정발행 / 취소)
// ============================================================

type ActionType = 'issue' | 'amend' | 'cancel'

interface ActionModalState {
  type: ActionType
  record: InvoiceRecordRow
}

function ActionModal({
  state,
  onClose,
  onDone,
}: {
  state: ActionModalState
  onClose: () => void
  onDone: () => void
}) {
  const { type, record } = state
  const [invoiceDate, setInvoiceDate] = useState(
    formatDateForInput(record.invoiceDate) || new Date().toISOString().split('T')[0]
  )
  const [invoiceNumber, setInvoiceNumber] = useState(record.invoiceNumber || '')
  const [remarks, setRemarks] = useState(record.remarks || '')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 수정발행용: 재발행할 값들
  const [amendQty, setAmendQty] = useState(String(record.quantity))
  const [amendUnitPrice, setAmendUnitPrice] = useState(String(record.unitPrice))
  const [amendTotal, setAmendTotal] = useState(String(record.totalPrice))

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      let res: Response

      if (type === 'issue') {
        res = await fetch('/api/management/invoices/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: record.id,
            invoiceDate,
            invoiceNumber: invoiceNumber || undefined,
            remarks: remarks || undefined,
          }),
        })
      } else if (type === 'amend') {
        res = await fetch('/api/management/invoices/amend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: record.id,
            amendReason: reason || 'AMENDED',
            newData: {
              quantity: Number(amendQty),
              unitPrice: Number(amendUnitPrice),
              totalPrice: Number(amendTotal),
              remarks: remarks || null,
            },
          }),
        })
      } else {
        // cancel
        if (!reason.trim()) {
          setError('취소 사유를 입력하세요')
          setSubmitting(false)
          return
        }
        res = await fetch('/api/management/invoices/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: record.id, reason: reason.trim() }),
        })
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '요청 실패')
      }

      onDone()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setSubmitting(false)
    }
  }

  const title =
    type === 'issue'
      ? '계산서 발행'
      : type === 'amend'
        ? '계산서 수정 발행'
        : '계산서 취소'

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          {/* 대상 레코드 */}
          <div className="bg-gray-50 rounded-lg p-2.5 text-xs space-y-0.5">
            <div className="text-gray-500">
              타입:{' '}
              <span
                className={
                  record.invoiceType === 'SALES'
                    ? 'text-blue-700 font-medium'
                    : 'text-purple-700 font-medium'
                }
              >
                {record.invoiceType === 'SALES' ? '매출' : '매입'}
              </span>
            </div>
            <div className="text-gray-700">품목: {record.productName}</div>
            <div className="text-gray-500">
              거래처:{' '}
              {record.invoiceType === 'SALES'
                ? record.clientCompany || '-'
                : record.vendorCompany || '-'}
            </div>
            <div className="text-gray-500">
              금액: {formatNumber(record.totalPrice)}원
            </div>
          </div>

          {type === 'issue' && (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">발행일 *</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  계산서 번호
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="세금계산서 번호 (선택)"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">기타사항</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </>
          )}

          {type === 'amend' && (
            <>
              <div className="text-xs text-yellow-800 bg-yellow-50 rounded-lg p-2">
                수정발행 시 원본은 <b>취소(AMENDED)</b> 처리되고, 같은 chain에 새
                PENDING 레코드가 생성됩니다. 이후 발행 버튼으로 다시 발행해야 합니다.
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">수량</label>
                  <input
                    type="number"
                    value={amendQty}
                    onChange={(e) => setAmendQty(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">단가</label>
                  <input
                    type="number"
                    value={amendUnitPrice}
                    onChange={(e) => setAmendUnitPrice(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">합계</label>
                  <input
                    type="number"
                    value={amendTotal}
                    onChange={(e) => setAmendTotal(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  수정 사유 (원본 cancelReason에 기록)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="AMENDED"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  신규 레코드 기타사항
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </>
          )}

          {type === 'cancel' && (
            <>
              <div className="text-xs text-red-800 bg-red-50 rounded-lg p-2">
                이 계산서를 취소합니다. 취소된 레코드는 합계에서 제외되지만 체인
                표시용으로 목록에 남습니다.
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">취소 사유 *</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="예: 거래처 요청 / 중복 / 기재오류"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  autoFocus
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-xs text-red-700 bg-red-50 p-2 rounded">{error}</div>
          )}
        </div>

        <div className="px-5 py-3 bg-gray-50 rounded-b-xl flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`px-4 py-1.5 text-sm text-white rounded-lg disabled:opacity-50 ${
              type === 'cancel'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'amend'
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {submitting
              ? '처리중...'
              : type === 'issue'
                ? '발행'
                : type === 'amend'
                  ? '수정 발행'
                  : '취소 확정'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Inline editable cells (메타: invoiceDate / invoiceNumber / remarks)
// ============================================================

function InlineDateEdit({
  value,
  disabled,
  onSave,
}: {
  value: string | null
  disabled?: boolean
  onSave: (v: string | null) => void
}) {
  const [editing, setEditing] = useState(false)

  if (disabled) {
    return (
      <span className="text-xs text-gray-400">
        {value ? formatDate(value) : '-'}
      </span>
    )
  }

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={formatDateForInput(value)}
        onBlur={(e) => {
          setEditing(false)
          const v = e.target.value || null
          if (v !== formatDateForInput(value)) onSave(v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false)
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:outline-none"
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-center px-1 py-0.5 rounded hover:bg-blue-50 text-xs min-h-[20px]"
      title="클릭하여 수정"
    >
      {value ? formatDate(value) : <span className="text-gray-300">-</span>}
    </button>
  )
}

function InlineTextEdit({
  value,
  placeholder = '-',
  disabled,
  onSave,
}: {
  value: string | null
  placeholder?: string
  disabled?: boolean
  onSave: (v: string | null) => void
}) {
  const [editing, setEditing] = useState(false)

  if (disabled) {
    return (
      <span className="text-xs text-gray-400 truncate">
        {value || placeholder}
      </span>
    )
  }

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        defaultValue={value || ''}
        onBlur={(e) => {
          setEditing(false)
          const v = e.target.value || null
          if (v !== (value || null)) onSave(v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false)
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:outline-none"
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left px-1 py-0.5 rounded hover:bg-blue-50 text-xs min-h-[20px] truncate"
      title={value || '클릭하여 수정'}
    >
      {value || <span className="text-gray-300">{placeholder}</span>}
    </button>
  )
}

// ============================================================
// Main Page
// ============================================================

const FILTER_STATUS_OPTIONS: { value: '' | InvoiceStatusType; label: string }[] = [
  { value: '', label: '상태 전체' },
  { value: 'PENDING', label: '미발행' },
  { value: 'ISSUED', label: '발행완료' },
  { value: 'NEEDS_AMENDMENT', label: '수정필요' },
  { value: 'CANCELLED', label: '취소' },
]

const FILTER_TYPE_OPTIONS: { value: '' | InvoiceTypeKind; label: string }[] = [
  { value: '', label: '타입 전체' },
  { value: 'SALES', label: '매출' },
  { value: 'PURCHASE', label: '매입' },
]

export default function InvoiceStatusPage() {
  const [data, setData] = useState<InvoiceStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<ActionModalState | null>(null)

  // 필터
  const [month, setMonth] = useState(getCurrentMonth())
  const [approvalCode, setApprovalCode] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [vendorCompany, setVendorCompany] = useState('')
  const [status, setStatus] = useState<'' | InvoiceStatusType>('')
  const [typeFilter, setTypeFilter] = useState<'' | InvoiceTypeKind>('')
  const [hideCancelled, setHideCancelled] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      if (approvalCode) params.set('approvalCode', approvalCode)
      if (clientCompany) params.set('clientCompany', clientCompany)
      if (vendorCompany) params.set('vendorCompany', vendorCompany)
      if (status) params.set('invoiceStatus', status)
      if (typeFilter) params.set('invoiceType', typeFilter)

      const res = await fetch(`/api/management/invoice-status?${params}`)
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다')
      const json = (await res.json()) as InvoiceStatusResponse
      setData(json)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [month, approvalCode, clientCompany, vendorCompany, status, typeFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleMetaUpdate = async (
    id: string,
    field: 'invoiceDate' | 'invoiceNumber' | 'remarks',
    value: string | null
  ) => {
    try {
      const res = await fetch('/api/management/invoice-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field, value }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || '수정 실패')
      }
      // 로컬 즉시 반영
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          groups: prev.groups.map((g) => ({
            ...g,
            records: g.records.map((r) =>
              r.id !== id
                ? r
                : { ...r, [field]: field === 'invoiceDate' ? value : value }
            ),
          })),
        }
      })
    } catch (e) {
      alert(`수정 실패: ${e instanceof Error ? e.message : e}`)
      fetchData()
    }
  }

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // hideCancelled 토글 적용
  const displayGroups = useMemo(() => {
    if (!data) return [] as InvoiceGroup[]
    if (!hideCancelled) return data.groups
    return data.groups
      .map((g) => ({
        ...g,
        records: g.records.filter((r) => r.status !== 'CANCELLED'),
      }))
      .filter((g) => g.records.length > 0)
  }, [data, hideCancelled])

  const totalRecords = displayGroups.reduce((acc, g) => acc + g.records.length, 0)

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">계산서 발행현황</h1>
        <p className="text-gray-500 mt-1 text-sm">
          품의서 승인 후 생성된 InvoiceRecord 기반 — 한 행 = 한 계산서 레코드
        </p>
      </div>

      {/* 필터바 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftMonth(-1)}
              className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded"
              aria-label="이전 달"
            >
              ◀
            </button>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={() => shiftMonth(1)}
              className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded"
              aria-label="다음 달"
            >
              ▶
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200" />

          <input
            type="text"
            placeholder="품의코드"
            value={approvalCode}
            onChange={(e) => setApprovalCode(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-32"
          />
          <input
            type="text"
            placeholder="매출처"
            value={clientCompany}
            onChange={(e) => setClientCompany(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-28"
          />
          <input
            type="text"
            placeholder="매입처"
            value={vendorCompany}
            onChange={(e) => setVendorCompany(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-28"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as '' | InvoiceTypeKind)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            {FILTER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | InvoiceStatusType)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            {FILTER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1 text-sm text-gray-600 pl-1">
            <input
              type="checkbox"
              checked={hideCancelled}
              onChange={(e) => setHideCancelled(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            취소 숨기기
          </label>

          <button
            onClick={() => {
              setMonth(getCurrentMonth())
              setApprovalCode('')
              setClientCompany('')
              setVendorCompany('')
              setStatus('')
              setTypeFilter('')
              setHideCancelled(true)
            }}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 요약 */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xs text-gray-500">매출 합계 (취소제외)</div>
            <div className="text-lg font-bold text-blue-700">
              {formatNumber(data.summary.totalSales)}원
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {data.summary.salesCount}건
            </div>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xs text-gray-500">매입 합계 (취소제외)</div>
            <div className="text-lg font-bold text-purple-700">
              {formatNumber(data.summary.totalPurchase)}원
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {data.summary.purchaseCount}건
            </div>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xs text-gray-500">매출 상태별</div>
            <div className="text-xs mt-1 space-y-0.5">
              {Object.entries(data.summary.salesByStatus).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-600">
                    {INVOICE_STATUS_CONFIG[k as InvoiceStatusType]?.label || k}
                  </span>
                  <span className="font-medium">{v}건</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xs text-gray-500">매입 상태별</div>
            <div className="text-xs mt-1 space-y-0.5">
              {Object.entries(data.summary.purchaseByStatus).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-600">
                    {INVOICE_STATUS_CONFIG[k as InvoiceStatusType]?.label || k}
                  </span>
                  <span className="font-medium">{v}건</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && <div className="p-8 text-center text-gray-500">로딩 중...</div>}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {!loading && displayGroups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>해당 기간에 계산서 발행 대상이 없습니다</p>
          </div>
        ) : !loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    품의코드
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    타입
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    P/N
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    품목
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    거래처
                  </th>
                  <th className="px-2 py-2 text-right font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    수량
                  </th>
                  <th className="px-2 py-2 text-right font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    단가
                  </th>
                  <th className="px-2 py-2 text-right font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    합계
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    상태
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    발행일
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    계산서번호
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    기타사항
                  </th>
                  <th className="px-2 py-2 text-center font-medium text-gray-700 border-b border-gray-300 whitespace-nowrap">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayGroups.map((group) => (
                  <GroupRows
                    key={group.approvalId}
                    group={group}
                    onMetaUpdate={handleMetaUpdate}
                    onAction={(type, record) => setAction({ type, record })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* 총 건수 */}
      {!loading && displayGroups.length > 0 && (
        <div className="text-xs text-gray-500 text-right pr-2">
          품의 {displayGroups.length}건 / 레코드 {totalRecords}건
        </div>
      )}

      {action && (
        <ActionModal
          state={action}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// Group rows (품의서 단위 묶음)
// ============================================================

function GroupRows({
  group,
  onMetaUpdate,
  onAction,
}: {
  group: InvoiceGroup
  onMetaUpdate: (
    id: string,
    field: 'invoiceDate' | 'invoiceNumber' | 'remarks',
    value: string | null
  ) => void
  onAction: (type: ActionType, record: InvoiceRecordRow) => void
}) {
  const count = group.records.length

  return (
    <>
      {group.records.map((record, idx) => {
        const isFirst = idx === 0
        const cfg = INVOICE_STATUS_CONFIG[record.status]
        const isCancelled = record.status === 'CANCELLED'
        const metaDisabled = isCancelled

        // 액션 가용성
        const canIssue = record.status === 'PENDING'
        const canAmend =
          record.status === 'ISSUED' || record.status === 'NEEDS_AMENDMENT'
        const canCancel = !isCancelled

        return (
          <tr
            key={record.id}
            className={`border-b border-gray-100 hover:bg-gray-50/50 ${
              isCancelled ? 'bg-red-50/30 text-gray-400' : ''
            } ${record.status === 'NEEDS_AMENDMENT' ? 'bg-yellow-50/40' : ''} ${
              isFirst ? 'border-t-2 border-t-gray-200' : ''
            }`}
          >
            {/* 품의코드 rowSpan */}
            {isFirst && (
              <td
                rowSpan={count}
                className="px-2 py-1.5 bg-gray-50/60 border-r border-gray-200 align-top"
              >
                <div className="font-mono font-semibold text-blue-700 text-[11px]">
                  {group.approvalCode || '-'}
                </div>
                <div className="text-[10px] text-gray-400">v{group.version}</div>
                <div className="text-[10px] text-gray-400">
                  {formatDate(group.approvalDate)}
                </div>
                {group.managerName && (
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {group.managerName}
                  </div>
                )}
                <div className="mt-1 space-y-0.5 text-[10px]">
                  <div className="text-blue-700">
                    매출 {formatNumber(group.salesTotalPrice)}
                  </div>
                  <div className="text-purple-700">
                    매입 {formatNumber(group.purchaseTotalPrice)}
                  </div>
                </div>
              </td>
            )}

            {/* 타입 */}
            <td className="px-2 py-1.5 text-center">
              <span
                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  record.invoiceType === 'SALES'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-purple-50 text-purple-700'
                }`}
              >
                {record.invoiceType === 'SALES' ? '매출' : '매입'}
              </span>
            </td>

            {/* P/N */}
            <td className="px-2 py-1.5 text-gray-600 font-mono text-[11px]">
              {record.partNumber || '-'}
            </td>

            {/* 품목 */}
            <td
              className="px-2 py-1.5 max-w-[180px] truncate"
              title={record.productName}
            >
              {record.productName}
            </td>

            {/* 거래처 */}
            <td
              className="px-2 py-1.5 text-gray-600 max-w-[120px] truncate"
              title={
                record.invoiceType === 'SALES'
                  ? record.clientCompany || ''
                  : record.vendorCompany || ''
              }
            >
              {record.invoiceType === 'SALES'
                ? record.clientCompany || '-'
                : record.vendorCompany || '-'}
            </td>

            {/* 수량/단가/합계 */}
            <td className="px-2 py-1.5 text-right">{record.quantity}</td>
            <td className="px-2 py-1.5 text-right">
              {formatNumber(record.unitPrice)}
            </td>
            <td className="px-2 py-1.5 text-right font-medium">
              {formatNumber(record.totalPrice)}
            </td>

            {/* 상태 */}
            <td className="px-2 py-1.5 text-center">
              <span
                className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cfg.color} ${cfg.bgColor}`}
                title={
                  isCancelled && record.cancelReason
                    ? `사유: ${record.cancelReason}`
                    : undefined
                }
              >
                {cfg.label}
              </span>
              {record.amendedFromId && (
                <div
                  className="text-[9px] text-yellow-700 mt-0.5"
                  title="수정발행된 레코드"
                >
                  수정본
                </div>
              )}
            </td>

            {/* 발행일 (인라인) */}
            <td className="px-1 py-1 text-center min-w-[90px]">
              <InlineDateEdit
                value={record.invoiceDate}
                disabled={metaDisabled}
                onSave={(v) => onMetaUpdate(record.id, 'invoiceDate', v)}
              />
            </td>

            {/* 계산서번호 (인라인) */}
            <td className="px-1 py-1 min-w-[100px]">
              <InlineTextEdit
                value={record.invoiceNumber}
                placeholder="번호"
                disabled={metaDisabled}
                onSave={(v) => onMetaUpdate(record.id, 'invoiceNumber', v)}
              />
            </td>

            {/* 기타사항 (인라인) */}
            <td className="px-1 py-1 min-w-[100px] max-w-[160px]">
              <InlineTextEdit
                value={record.remarks}
                disabled={metaDisabled}
                onSave={(v) => onMetaUpdate(record.id, 'remarks', v)}
              />
            </td>

            {/* 액션 */}
            <td className="px-1 py-1 text-center whitespace-nowrap">
              <div className="flex items-center justify-center gap-1">
                {canIssue && (
                  <button
                    onClick={() => onAction('issue', record)}
                    className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    발행
                  </button>
                )}
                {canAmend && (
                  <button
                    onClick={() => onAction('amend', record)}
                    className="px-1.5 py-0.5 text-[10px] bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    수정발행
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={() => onAction('cancel', record)}
                    className="px-1.5 py-0.5 text-[10px] border border-red-300 text-red-700 rounded hover:bg-red-50"
                  >
                    취소
                  </button>
                )}
                {isCancelled && (
                  <span className="text-[10px] text-gray-400">-</span>
                )}
              </div>
            </td>
          </tr>
        )
      })}
    </>
  )
}
