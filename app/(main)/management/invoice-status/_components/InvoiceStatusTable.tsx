'use client'

import { useState, useCallback } from 'react'
import type {
  FlatInvoiceRow,
  InvoiceStatusType,
} from '@/app/(main)/management/invoice-status/_types/invoice-status'
import { INVOICE_STATUS_CONFIG } from '@/app/(main)/management/invoice-status/_types/invoice-status'
import {
  formatNumber,
  formatDate,
  formatDateForInput,
} from '@/app/(main)/management/invoice-status/_lib/helpers'

interface InvoiceStatusTableProps {
  rows: FlatInvoiceRow[]
  onUpdate: (
    type: 'product' | 'item',
    id: string,
    field: string,
    value: string | null,
  ) => Promise<void>
}

// 인라인 편집 셀: DatePicker
function InlineDateCell({
  value,
  status,
  onSave,
}: {
  value: string | null
  status: InvoiceStatusType | null
  onSave: (date: string | null) => void
}) {
  const [editing, setEditing] = useState(false)

  if (!status) return <td className="px-2 py-1.5 text-center text-gray-400">-</td>

  if (status === 'NOT_REQUIRED') {
    return (
      <td className="px-2 py-1.5 text-center text-gray-400 font-medium">X</td>
    )
  }
  if (status === 'CANCELLED') {
    return (
      <td className="px-2 py-1.5 text-center text-red-400 line-through text-xs">
        {value ? formatDate(value) : '취소'}
      </td>
    )
  }

  if (editing) {
    return (
      <td className="px-1 py-1">
        <input
          type="date"
          defaultValue={formatDateForInput(value)}
          autoFocus
          onBlur={(e) => {
            const newVal = e.target.value || null
            setEditing(false)
            if (newVal !== formatDateForInput(value)) {
              onSave(newVal)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement
              const newVal = target.value || null
              setEditing(false)
              if (newVal !== formatDateForInput(value)) {
                onSave(newVal)
              }
            }
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-full px-1.5 py-0.5 text-xs border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>
    )
  }

  const displayDate = value ? formatDate(value) : ''
  const isIssued = status === 'ISSUED'
  const isNeedsAmendment = status === 'NEEDS_AMENDMENT'

  return (
    <td
      onClick={() => setEditing(true)}
      className={`px-2 py-1.5 text-center cursor-pointer hover:bg-blue-50 transition-colors text-xs ${
        isIssued
          ? 'text-green-700 font-medium'
          : isNeedsAmendment
            ? 'text-yellow-700 font-medium'
            : 'text-gray-400'
      }`}
      title="클릭하여 날짜 변경"
    >
      {displayDate || <span className="text-gray-300 italic">클릭</span>}
    </td>
  )
}

// 인라인 편집 셀: 텍스트 (기타사항)
function InlineTextCell({
  value,
  onSave,
}: {
  value: string | null
  onSave: (text: string | null) => void
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <td className="px-1 py-1">
        <input
          type="text"
          defaultValue={value || ''}
          autoFocus
          onBlur={(e) => {
            const newVal = e.target.value || null
            setEditing(false)
            if (newVal !== (value || null)) {
              onSave(newVal)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement
              const newVal = target.value || null
              setEditing(false)
              if (newVal !== (value || null)) {
                onSave(newVal)
              }
            }
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-full px-1.5 py-0.5 text-xs border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>
    )
  }

  return (
    <td
      onClick={() => setEditing(true)}
      className="px-2 py-1.5 text-xs text-gray-600 cursor-pointer hover:bg-blue-50 transition-colors max-w-[100px] truncate"
      title={value || '클릭하여 입력'}
    >
      {value || <span className="text-gray-300 italic">-</span>}
    </td>
  )
}

// 인라인 편집 셀: 상태 드롭다운
function InlineStatusCell({
  value,
  onSave,
}: {
  value: InvoiceStatusType
  onSave: (status: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const config = INVOICE_STATUS_CONFIG[value]

  if (editing) {
    return (
      <td className="px-1 py-1">
        <select
          defaultValue={value}
          autoFocus
          onBlur={(e) => {
            setEditing(false)
            if (e.target.value !== value) {
              onSave(e.target.value)
            }
          }}
          onChange={(e) => {
            setEditing(false)
            if (e.target.value !== value) {
              onSave(e.target.value)
            }
          }}
          className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {Object.entries(INVOICE_STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
      </td>
    )
  }

  return (
    <td
      onClick={() => setEditing(true)}
      className="px-1 py-1.5 text-center cursor-pointer hover:bg-blue-50 transition-colors"
      title="클릭하여 상태 변경"
    >
      <span
        className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${config.color} ${config.bgColor}`}
      >
        {config.label}
      </span>
    </td>
  )
}

export default function InvoiceStatusTable({
  rows,
  onUpdate,
}: InvoiceStatusTableProps) {
  const handleUpdate = useCallback(
    async (
      type: 'product' | 'item',
      id: string,
      field: string,
      value: string | null,
    ) => {
      await onUpdate(type, id, field, value)
    },
    [onUpdate],
  )

  if (rows.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <p className="text-lg font-medium">데이터가 없습니다</p>
        <p className="text-sm mt-1">
          조건에 맞는 계산서 발행 대상이 없습니다
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th
              className="px-2 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap"
              rowSpan={2}
            >
              품의코드
            </th>
            <th
              className="px-2 py-1.5 text-center font-semibold text-blue-700 border-b border-gray-300 bg-blue-50"
              colSpan={9}
            >
              매출
            </th>
            <th
              className="px-2 py-1.5 text-center font-semibold text-purple-700 border-b border-gray-300 bg-purple-50"
              colSpan={9}
            >
              매입
            </th>
          </tr>
          <tr>
            {/* 매출 하위 */}
            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-b border-gray-200 bg-blue-50/50 whitespace-nowrap">
              품목
            </th>
            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-b border-gray-200 bg-blue-50/50 whitespace-nowrap">
              매출처
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-gray-600 border-b border-gray-200 bg-blue-50/50 whitespace-nowrap">
              수량
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-gray-600 border-b border-gray-200 bg-blue-50/50 whitespace-nowrap">
              단가
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-gray-600 border-b border-gray-200 bg-blue-50/50 whitespace-nowrap">
              합계
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-gray-600 border-b border-gray-200 bg-blue-50/50 whitespace-nowrap">
              건별합계
            </th>
            <th className="px-2 py-1.5 text-center font-medium text-gray-600 border-b border-gray-200 bg-blue-50/50 whitespace-nowrap">
              상태
            </th>
            <th className="px-2 py-1.5 text-center font-medium text-gray-600 border-b border-gray-200 bg-blue-50/50 whitespace-nowrap">
              발행일
            </th>
            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-b border-r border-gray-300 bg-blue-50/50 whitespace-nowrap">
              기타사항
            </th>

            {/* 매입 하위 */}
            <th className="px-2 py-1.5 text-center font-medium text-gray-600 border-b border-gray-200 bg-purple-50/50 whitespace-nowrap">
              매입일
            </th>
            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-b border-gray-200 bg-purple-50/50 whitespace-nowrap">
              P/N
            </th>
            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-b border-gray-200 bg-purple-50/50 whitespace-nowrap">
              매입처
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-gray-600 border-b border-gray-200 bg-purple-50/50 whitespace-nowrap">
              수량
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-gray-600 border-b border-gray-200 bg-purple-50/50 whitespace-nowrap">
              단가
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-gray-600 border-b border-gray-200 bg-purple-50/50 whitespace-nowrap">
              합계
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-gray-600 border-b border-gray-200 bg-purple-50/50 whitespace-nowrap">
              건별합계
            </th>
            <th className="px-2 py-1.5 text-center font-medium text-gray-600 border-b border-gray-200 bg-purple-50/50 whitespace-nowrap">
              상태
            </th>
            <th className="px-2 py-1.5 text-center font-medium text-gray-600 border-b border-gray-200 bg-purple-50/50 whitespace-nowrap">
              발행일
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowKey = `${row.productId}-${row.itemId || index}`
            const isGroupStart = row.isFirstRowOfApproval

            return (
              <tr
                key={rowKey}
                className={`border-b border-gray-100 hover:bg-gray-50/50 ${
                  isGroupStart ? 'border-t-2 border-t-gray-300' : ''
                }`}
              >
                {/* 품의코드 (rowSpan) */}
                {row.isFirstRowOfApproval && (
                  <td
                    rowSpan={row.approvalRowSpan}
                    className="px-2 py-1.5 border-r border-gray-200 bg-gray-50/50 align-top"
                  >
                    <div className="font-mono font-semibold text-blue-700 text-[11px]">
                      {row.approvalCode}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      v{row.version}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {formatDate(row.approvalDate)}
                    </div>
                  </td>
                )}

                {/* === 매출 영역 === */}
                {row.isFirstRowOfProduct && (
                  <>
                    <td
                      rowSpan={row.productRowSpan}
                      className="px-2 py-1.5 align-top"
                    >
                      <div className="font-medium text-gray-900 truncate max-w-[140px]">
                        {row.productName}
                      </div>
                    </td>
                    <td
                      rowSpan={row.productRowSpan}
                      className="px-2 py-1.5 text-gray-600 truncate max-w-[100px] align-top"
                    >
                      {row.clientCompany}
                    </td>
                    <td
                      rowSpan={row.productRowSpan}
                      className="px-2 py-1.5 text-right align-top"
                    >
                      {row.productQuantity}
                    </td>
                    <td
                      rowSpan={row.productRowSpan}
                      className="px-2 py-1.5 text-right align-top"
                    >
                      {formatNumber(row.productUnitPrice)}
                    </td>
                    <td
                      rowSpan={row.productRowSpan}
                      className="px-2 py-1.5 text-right font-medium align-top"
                    >
                      {formatNumber(row.productTotalPrice)}
                    </td>
                  </>
                )}
                {/* 건별합계(매출) */}
                {row.isFirstRowOfApproval && (
                  <td
                    rowSpan={row.approvalRowSpan}
                    className="px-2 py-1.5 text-right font-bold text-blue-700 bg-blue-50/30 align-top"
                  >
                    {formatNumber(row.salesTotalByApproval)}
                  </td>
                )}
                {/* 매출 상태 + 발행일 + 기타사항 (Product rowSpan) */}
                {row.isFirstRowOfProduct && (
                  <>
                    <InlineStatusCell
                      key={`sales-status-${row.productId}`}
                      value={row.salesInvoiceStatus}
                      onSave={(status) =>
                        handleUpdate(
                          'product',
                          row.productId,
                          'salesInvoiceStatus',
                          status,
                        )
                      }
                    />
                    <InlineDateCell
                      key={`sales-date-${row.productId}`}
                      value={row.salesInvoiceDate}
                      status={row.salesInvoiceStatus}
                      onSave={(date) =>
                        handleUpdate(
                          'product',
                          row.productId,
                          'salesInvoiceDate',
                          date,
                        )
                      }
                    />
                    <InlineTextCell
                      key={`remarks-${row.productId}`}
                      value={row.salesInvoiceRemarks}
                      onSave={(text) =>
                        handleUpdate(
                          'product',
                          row.productId,
                          'salesInvoiceRemarks',
                          text,
                        )
                      }
                    />
                  </>
                )}

                {/* === 매입 영역 === */}
                <td className="px-2 py-1.5 text-center text-gray-500 border-l border-gray-200">
                  {row.purchaseDate ? formatDate(row.purchaseDate) : '-'}
                </td>
                <td className="px-2 py-1.5 text-gray-600 truncate max-w-[80px]">
                  {row.partNumber || '-'}
                </td>
                <td className="px-2 py-1.5 text-gray-600 truncate max-w-[100px]">
                  {row.vendorName || '-'}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {row.purchaseQty ?? '-'}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {formatNumber(row.purchasePrice) || '-'}
                </td>
                <td className="px-2 py-1.5 text-right font-medium">
                  {formatNumber(row.purchaseTotal) || '-'}
                </td>
                {/* 건별합계(매입) */}
                {row.isFirstRowOfApproval && (
                  <td
                    rowSpan={row.approvalRowSpan}
                    className="px-2 py-1.5 text-right font-bold text-purple-700 bg-purple-50/30 align-top"
                  >
                    {formatNumber(row.purchaseTotalByApproval)}
                  </td>
                )}
                {/* 매입 상태 + 발행일 */}
                {row.itemId && row.purchaseInvoiceStatus ? (
                  <>
                    <InlineStatusCell
                      key={`purchase-status-${row.itemId}`}
                      value={row.purchaseInvoiceStatus}
                      onSave={(status) =>
                        handleUpdate(
                          'item',
                          row.itemId!,
                          'purchaseInvoiceStatus',
                          status,
                        )
                      }
                    />
                    <InlineDateCell
                      key={`purchase-date-${row.itemId}`}
                      value={row.purchaseInvoiceDate}
                      status={row.purchaseInvoiceStatus}
                      onSave={(date) =>
                        handleUpdate(
                          'item',
                          row.itemId!,
                          'purchaseInvoiceDate',
                          date,
                        )
                      }
                    />
                  </>
                ) : (
                  <>
                    <td className="px-2 py-1.5 text-center text-gray-400">-</td>
                    <td className="px-2 py-1.5 text-center text-gray-400">-</td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
