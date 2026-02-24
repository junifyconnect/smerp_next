'use client'

import { useState } from 'react'
import type { InvoiceStatusFilters } from '@/app/(main)/management/invoice-status/_types/invoice-status'
import { INVOICE_STATUS_CONFIG } from '@/app/(main)/management/invoice-status/_types/invoice-status'

interface InvoiceFilterBarProps {
  filters: InvoiceStatusFilters
  onFilterChange: (filters: InvoiceStatusFilters) => void
}

export default function InvoiceFilterBar({
  filters,
  onFilterChange,
}: InvoiceFilterBarProps) {
  const [approvalCodeInput, setApprovalCodeInput] = useState(
    filters.approvalCode || '',
  )
  const [clientCompanyInput, setClientCompanyInput] = useState(
    filters.clientCompany || '',
  )
  const [vendorNameInput, setVendorNameInput] = useState(
    filters.vendorName || '',
  )

  const handleMonthChange = (month: string) => {
    onFilterChange({ ...filters, month: month || null })
  }

  const handleStatusChange = (status: string) => {
    onFilterChange({ ...filters, invoiceStatus: status || null })
  }

  const handleSearch = () => {
    onFilterChange({
      ...filters,
      approvalCode: approvalCodeInput || null,
      clientCompany: clientCompanyInput || null,
      vendorName: vendorNameInput || null,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleReset = () => {
    setApprovalCodeInput('')
    setClientCompanyInput('')
    setVendorNameInput('')
    onFilterChange({
      month: filters.month, // 월은 유지
      approvalCode: null,
      clientCompany: null,
      vendorName: null,
      invoiceStatus: null,
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* 월 선택 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">월</label>
          <input
            type="month"
            value={filters.month || ''}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 품의코드 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">품의코드</label>
          <input
            type="text"
            value={approvalCodeInput}
            onChange={(e) => setApprovalCodeInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="D251231-01"
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 매출처 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">매출처</label>
          <input
            type="text"
            value={clientCompanyInput}
            onChange={(e) => setClientCompanyInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="매출처"
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 매입처 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">매입처</label>
          <input
            type="text"
            value={vendorNameInput}
            onChange={(e) => setVendorNameInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="매입처"
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 상태 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">상태</label>
          <select
            value={filters.invoiceStatus || ''}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">전체</option>
            {Object.entries(INVOICE_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* 검색/초기화 */}
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            검색
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  )
}
