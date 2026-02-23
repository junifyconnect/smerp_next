'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ============================================================
// Types
// ============================================================

interface InvoiceRow {
  productId: string
  itemId: string | null
  approvalId: string
  approvalCode: string | null
  approvalVersion: number
  approvalDate: string | null
  clientCompany: string | null
  // 매출
  productName: string
  partNumber: string | null
  description: string | null
  salesQty: number
  salesUnitPrice: number | null
  salesTotalPrice: number | null
  salesGroupTotal: number
  salesInvoiceStatus: string
  salesInvoiceDate: string | null
  salesInvoiceRemarks: string | null
  // 매입
  purchaseDate: string | null
  vendorName: string | null
  purchaseQty: number | null
  purchasePrice: number | null
  purchaseTotal: number | null
  purchaseGroupTotal: number
  purchaseInvoiceStatus: string | null
  purchaseInvoiceDate: string | null
  // 메타
  isFirstInProduct: boolean
  productRowSpan: number
}

interface Summary {
  salesTotal: number
  purchaseTotal: number
  rowCount: number
}

// ============================================================
// Constants
// ============================================================

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  PENDING: { label: '', className: '' },
  ISSUED: { label: '발행', className: 'text-green-700 bg-green-50' },
  NEEDS_AMENDMENT: { label: '수정필요', className: 'text-yellow-800 bg-yellow-100' },
  NOT_REQUIRED: { label: '✕', className: 'text-gray-500 bg-gray-100' },
  CANCELLED: { label: '취소', className: 'text-red-500 line-through bg-red-50' },
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: '미발행' },
  { value: 'ISSUED', label: '발행완료' },
  { value: 'NOT_REQUIRED', label: '발행불필요' },
  { value: 'NEEDS_AMENDMENT', label: '수정필요' },
  { value: 'CANCELLED', label: '취소' },
]

const FILTER_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'PENDING', label: '미발행' },
  { value: 'ISSUED', label: '발행완료' },
  { value: 'NOT_REQUIRED', label: '발행불필요' },
  { value: 'NEEDS_AMENDMENT', label: '수정필요' },
]

// ============================================================
// Helpers
// ============================================================

function formatNumber(num: number | string | null | undefined) {
  if (num === null || num === undefined || num === '') return ''
  return Number(num).toLocaleString()
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ============================================================
// Inline Editable Components
// ============================================================

function InlineDatePicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (val: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full text-center px-1 py-0.5 rounded hover:bg-blue-50 min-h-[24px] text-xs"
        title="클릭하여 수정"
      >
        {value ? formatDate(value) : <span className="text-gray-300">-</span>}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      type="date"
      defaultValue={value ? new Date(value).toISOString().split('T')[0] : ''}
      onBlur={(e) => {
        setEditing(false)
        const newVal = e.target.value || null
        const oldVal = value ? new Date(value).toISOString().split('T')[0] : null
        if (newVal !== oldVal) onChange(newVal)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setEditing(false)
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className="w-full text-xs border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  )
}

function InlineText({
  value,
  onChange,
  placeholder = '-',
}: {
  value: string | null
  onChange: (val: string) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full text-left px-1 py-0.5 rounded hover:bg-blue-50 min-h-[24px] text-xs truncate"
        title="클릭하여 수정"
      >
        {value || <span className="text-gray-300">{placeholder}</span>}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value || ''}
      onBlur={(e) => {
        setEditing(false)
        if (e.target.value !== (value || '')) onChange(e.target.value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setEditing(false)
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className="w-full text-xs border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  )
}

function InlineStatusSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (val: string) => void
}) {
  const display = STATUS_DISPLAY[value] || STATUS_DISPLAY.PENDING

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value !== value) onChange(e.target.value)
      }}
      className={`text-xs rounded px-1 py-0.5 border-0 cursor-pointer focus:ring-1 focus:ring-blue-400 ${display.className}`}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// ============================================================
// Main Page
// ============================================================

export default function InvoiceStatusPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 필터
  const [month, setMonth] = useState(getCurrentMonth())
  const [approvalCode, setApprovalCode] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (month) params.set('month', month)
      if (approvalCode) params.set('approvalCode', approvalCode)
      if (clientCompany) params.set('clientCompany', clientCompany)
      if (vendorName) params.set('vendorName', vendorName)
      if (invoiceStatus) params.set('invoiceStatus', invoiceStatus)
      params.set('limit', '500')

      const res = await fetch(`/api/management/invoice-status?${params}`)
      if (!res.ok) throw new Error('데이터를 불러오는데 실패했습니다')
      const data = await res.json()
      setRows(data.rows || [])
      setSummary(data.summary || null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [month, approvalCode, clientCompany, vendorName, invoiceStatus])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 인라인 수정
  const handleInlineUpdate = async (
    type: 'sales' | 'purchase',
    id: string,
    field: 'invoiceStatus' | 'invoiceDate' | 'remarks',
    value: string | null,
  ) => {
    try {
      const res = await fetch('/api/management/invoice-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, field, value }),
      })
      if (!res.ok) throw new Error('수정 실패')
      // 로컬 상태 업데이트 (재조회 대신)
      setRows((prev) =>
        prev.map((row) => {
          if (type === 'sales' && row.productId === id) {
            if (field === 'invoiceStatus') return { ...row, salesInvoiceStatus: value || 'PENDING' }
            if (field === 'invoiceDate') return { ...row, salesInvoiceDate: value }
            if (field === 'remarks') return { ...row, salesInvoiceRemarks: value }
          }
          if (type === 'purchase' && row.itemId === id) {
            if (field === 'invoiceStatus') return { ...row, purchaseInvoiceStatus: value || 'PENDING' }
            if (field === 'invoiceDate') return { ...row, purchaseInvoiceDate: value }
          }
          return row
        }),
      )
    } catch {
      alert('수정에 실패했습니다')
      fetchData()
    }
  }

  // rowSpan 계산 (품의코드 기준)
  const approvalSpanMap = new Map<string, { count: number; firstIdx: number }>()
  rows.forEach((row, idx) => {
    const key = row.approvalCode || 'UNKNOWN'
    if (!approvalSpanMap.has(key)) {
      approvalSpanMap.set(key, { count: 0, firstIdx: idx })
    }
    approvalSpanMap.get(key)!.count++
  })

  // 월 이동
  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">계산서 발행현황</h1>
        <p className="text-gray-500 mt-1 text-sm">품의서 승인 후 매출/매입 계산서 통합 관리</p>
      </div>

      {/* 필터바 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 월 선택 */}
          <div className="flex items-center gap-1">
            <button onClick={() => shiftMonth(-1)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded">
              ◀
            </button>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <button onClick={() => shiftMonth(1)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded">
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
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-28"
          />

          <select
            value={invoiceStatus}
            onChange={(e) => setInvoiceStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            {FILTER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setMonth(getCurrentMonth())
              setApprovalCode('')
              setClientCompany('')
              setVendorName('')
              setInvoiceStatus('')
            }}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 요약 */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xs text-gray-500">매출 합계</div>
            <div className="text-lg font-bold text-blue-700">{formatNumber(summary.salesTotal)}원</div>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xs text-gray-500">매입 합계</div>
            <div className="text-lg font-bold text-purple-700">{formatNumber(summary.purchaseTotal)}원</div>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xs text-gray-500">총 행 수</div>
            <div className="text-lg font-bold text-gray-700">{summary.rowCount}건</div>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && <div className="p-8 text-center text-gray-500">로딩 중...</div>}
        {error && <div className="p-4 bg-red-50 text-red-700 text-sm">{error}</div>}

        {!loading && rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>해당 기간에 계산서 발행 대상이 없습니다</p>
          </div>
        ) : !loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  <th colSpan={10} className="px-2 py-1.5 text-center text-blue-700 font-bold bg-blue-50/50 border-r-2 border-gray-300">
                    매출
                  </th>
                  <th colSpan={7} className="px-2 py-1.5 text-center text-purple-700 font-bold bg-purple-50/50">
                    매입
                  </th>
                </tr>
                <tr className="bg-gray-100 border-b border-gray-300">
                  {/* 매출 */}
                  <th className="px-2 py-2 text-left font-medium text-gray-600 whitespace-nowrap border-r border-gray-200">품의코드</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 whitespace-nowrap">P/N</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 whitespace-nowrap">품목</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 whitespace-nowrap">매출처</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 whitespace-nowrap">수량</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 whitespace-nowrap">단가</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 whitespace-nowrap">합계</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 whitespace-nowrap">건별합계</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap">매출계산서</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 whitespace-nowrap border-r-2 border-gray-300">기타사항</th>
                  {/* 매입 */}
                  <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap">매입일</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-600 whitespace-nowrap">매입처</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 whitespace-nowrap">수량</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 whitespace-nowrap">단가</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 whitespace-nowrap">합계</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-600 whitespace-nowrap">건별합계</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap">매입계산서</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const aCode = row.approvalCode || 'UNKNOWN'
                  const spanInfo = approvalSpanMap.get(aCode)!
                  const isFirstInApproval = spanInfo.firstIdx === idx

                  // 상태별 행 배경
                  const salesStatus = row.salesInvoiceStatus
                  const purchaseStatus = row.purchaseInvoiceStatus
                  let rowBg = ''
                  if (salesStatus === 'NEEDS_AMENDMENT' || purchaseStatus === 'NEEDS_AMENDMENT') {
                    rowBg = 'bg-yellow-50'
                  }

                  return (
                    <tr
                      key={`${row.productId}-${row.itemId || 'no-item'}`}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 ${rowBg}`}
                    >
                      {/* 품의코드 (approval 단위 rowSpan) */}
                      {isFirstInApproval && (
                        <td
                          className="px-2 py-1.5 border-r border-gray-200 font-mono font-medium text-blue-700 bg-gray-50/50 align-top"
                          rowSpan={spanInfo.count}
                        >
                          <div>{row.approvalCode}</div>
                          <div className="text-[10px] text-gray-400">v{row.approvalVersion}</div>
                        </td>
                      )}

                      {/* P/N */}
                      <td className="px-2 py-1.5 text-gray-600">{row.partNumber || ''}</td>

                      {/* 품목 */}
                      <td className="px-2 py-1.5 max-w-[160px] truncate" title={row.description || row.productName}>
                        {row.description || row.productName}
                      </td>

                      {/* 매출처 (product 단위 rowSpan) */}
                      {row.isFirstInProduct && (
                        <td className="px-2 py-1.5 text-gray-600 truncate max-w-[100px]" rowSpan={row.productRowSpan}>
                          {row.clientCompany}
                        </td>
                      )}

                      {/* 매출 수량/단가/합계 (product 단위) */}
                      {row.isFirstInProduct && (
                        <>
                          <td className="px-2 py-1.5 text-right" rowSpan={row.productRowSpan}>
                            {row.salesQty}
                          </td>
                          <td className="px-2 py-1.5 text-right" rowSpan={row.productRowSpan}>
                            {formatNumber(row.salesUnitPrice)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium" rowSpan={row.productRowSpan}>
                            {formatNumber(row.salesTotalPrice)}
                          </td>
                        </>
                      )}

                      {/* 건별합계 (approval 단위) */}
                      {isFirstInApproval && (
                        <td
                          className="px-2 py-1.5 text-right font-bold border-r border-gray-100 bg-blue-50/30"
                          rowSpan={spanInfo.count}
                        >
                          {formatNumber(row.salesGroupTotal)}
                        </td>
                      )}

                      {/* 매출계산서 발행일 + 상태 (product 단위) */}
                      {row.isFirstInProduct && (
                        <td className="px-1 py-1 text-center" rowSpan={row.productRowSpan}>
                          <div className="space-y-0.5">
                            <InlineStatusSelect
                              value={row.salesInvoiceStatus}
                              onChange={(val) => handleInlineUpdate('sales', row.productId, 'invoiceStatus', val)}
                            />
                            <InlineDatePicker
                              value={row.salesInvoiceDate}
                              onChange={(val) => handleInlineUpdate('sales', row.productId, 'invoiceDate', val)}
                            />
                          </div>
                        </td>
                      )}

                      {/* 기타사항 (product 단위) */}
                      {row.isFirstInProduct && (
                        <td className="px-1 py-1 border-r-2 border-gray-300 min-w-[80px]" rowSpan={row.productRowSpan}>
                          <InlineText
                            value={row.salesInvoiceRemarks}
                            onChange={(val) => handleInlineUpdate('sales', row.productId, 'remarks', val)}
                          />
                        </td>
                      )}

                      {/* ── 매입 ── */}

                      {/* 매입일 */}
                      <td className="px-2 py-1.5 text-center text-gray-600">
                        {formatDate(row.purchaseDate)}
                      </td>

                      {/* 매입처 */}
                      <td className="px-2 py-1.5 text-gray-600 truncate max-w-[100px]">
                        {row.vendorName || ''}
                      </td>

                      {/* 매입 수량/단가/합계 */}
                      <td className="px-2 py-1.5 text-right">{row.purchaseQty ?? ''}</td>
                      <td className="px-2 py-1.5 text-right">{formatNumber(row.purchasePrice)}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{formatNumber(row.purchaseTotal)}</td>

                      {/* 매입 건별합계 (approval 단위) */}
                      {isFirstInApproval && (
                        <td
                          className="px-2 py-1.5 text-right font-bold bg-purple-50/30"
                          rowSpan={spanInfo.count}
                        >
                          {formatNumber(row.purchaseGroupTotal)}
                        </td>
                      )}

                      {/* 매입계산서 발행일 + 상태 */}
                      <td className="px-1 py-1 text-center">
                        {row.purchaseInvoiceStatus ? (
                          <div className="space-y-0.5">
                            <InlineStatusSelect
                              value={row.purchaseInvoiceStatus}
                              onChange={(val) =>
                                row.itemId && handleInlineUpdate('purchase', row.itemId, 'invoiceStatus', val)
                              }
                            />
                            <InlineDatePicker
                              value={row.purchaseInvoiceDate}
                              onChange={(val) =>
                                row.itemId && handleInlineUpdate('purchase', row.itemId, 'invoiceDate', val)
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
