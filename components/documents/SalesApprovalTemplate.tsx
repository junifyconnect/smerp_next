'use client'

import React from 'react'

import type { SalesItem, PurchaseItem } from './SalesApprovalForm'

interface SalesApprovalTemplateProps {
  formData: {
    invoiceIssueDate: string
    approvalCode: string
    approvalDate: string
    approvalOwner: string
    salesContactLine: string
    endUser: string
    mtSn: string
    etc: string
    invoicePlannedDate: string
    invoiceEmail: string
    paymentDue: string
    shippingAddress: string
    shippingReceiver: string
    shippingReceiverPhone: string
    shippingDate: string
  }
  salesItems: SalesItem[]
  purchaseItems: PurchaseItem[]
  salesTotal: number
  purchaseTotals: { total: number; totalWithVat: number }
  onDataChange: (field: keyof SalesApprovalTemplateProps['formData'], value: string) => void
  onSalesItemChange: (index: number, field: keyof SalesItem, value: string | number) => void
  onPurchaseItemChange: (index: number, field: keyof PurchaseItem, value: string | number) => void
  onAddRow: () => void
}

export function SalesApprovalTemplate({
  formData,
  salesItems,
  purchaseItems,
  salesTotal,
  purchaseTotals,
  onDataChange,
  onSalesItemChange,
  onPurchaseItemChange,
  onAddRow,
}: SalesApprovalTemplateProps) {
  const maxRows = Math.max(salesItems.length, purchaseItems.length, 1)

  const handleEditableChange = (
    field: keyof SalesApprovalTemplateProps['formData'],
    el: HTMLElement
  ) => {
    onDataChange(field, el.textContent || '')
  }

  const handleSalesCell = (index: number, field: keyof SalesItem, el: HTMLElement) => {
    const text = el.textContent || ''
    if (field === 'quantity' || field === 'unitPrice' || field === 'totalPrice') {
      const n = parseInt(text.replace(/,/g, ''), 10) || 0
      onSalesItemChange(index, field, n)
    } else {
      onSalesItemChange(index, field, text)
    }
  }

  const handlePurchaseCell = (index: number, field: keyof PurchaseItem, el: HTMLElement) => {
    const text = el.textContent || ''
    if (field === 'quantity' || field === 'unitPrice' || field === 'totalPrice') {
      const n = parseInt(text.replace(/,/g, ''), 10) || 0
      onPurchaseItemChange(index, field, n)
    } else {
      onPurchaseItemChange(index, field, text)
    }
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('ko-KR').format(n)

  return (
    <div className="bg-gray-100 p-8 rounded-xl">
      <div
        className="bg-white mx-auto shadow-lg"
        style={{
          width: '297mm',          // A4 가로
          minHeight: '210mm',      // A4 세로
          padding: '20mm',
          fontFamily: '맑은 고딕, Malgun Gothic, sans-serif',
          color: '#000',
          boxSizing: 'border-box',
        }}
      >
        {/* 제목 */}
        <div className="text-center mb-4">
          <div className="inline-block border-b border-black pb-1">
            <span className="text-2xl font-bold tracking-[0.2em]">SALES 통합 품의서</span>
          </div>
        </div>

        {/* 상단 정보 (일렬 배치) */}
        <table
          className="w-full mb-4 border-collapse"
          style={{ fontSize: '11px' }}
        >
          <tbody>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                계산서 발행일
              </th>
              <td
                className="px-2 py-1 font-bold"
                colSpan={3}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('invoiceIssueDate', e.currentTarget)}
              >
                {formData.invoiceIssueDate}
              </td>
            </tr>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                품의 코드
              </th>
              <td
                className="px-2 py-1 font-bold"
                colSpan={3}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('approvalCode', e.currentTarget)}
              >
                {formData.approvalCode}
              </td>
            </tr>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                품의 일자
              </th>
              <td
                className="px-2 py-1 font-bold"
                colSpan={3}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('approvalDate', e.currentTarget)}
              >
                {formData.approvalDate}
              </td>
            </tr>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                품의 담당
              </th>
              <td
                className="px-2 py-1 font-bold"
                colSpan={3}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('approvalOwner', e.currentTarget)}
              >
                {formData.approvalOwner}
              </td>
            </tr>
            {/* 공백 라인 */}
            <tr>
              <td className="px-2 py-2" colSpan={4}>&nbsp;</td>
            </tr>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                매출처/담당/연락처
              </th>
              <td
                className="px-2 py-1 font-bold"
                colSpan={3}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('salesContactLine', e.currentTarget)}
              >
                {formData.salesContactLine}
              </td>
            </tr>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                End User
              </th>
              <td
                className="px-2 py-1 font-bold"
                colSpan={3}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('endUser', e.currentTarget)}
              >
                {formData.endUser}
              </td>
            </tr>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                MT&amp;S/N
              </th>
              <td
                className="px-2 py-1 font-bold"
                colSpan={3}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('mtSn', e.currentTarget)}
              >
                {formData.mtSn}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 메인 테이블: 매출/매입 동시 표시 */}
        <table
          className="w-full mb-4 border-collapse"
          style={{ fontSize: '11px', border: '1px solid #000' }}
        >
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 text-center font-bold" style={{ backgroundColor: '#B4C6E7' }}>P/N</th>
              <th className="border border-black px-2 py-1 text-center font-bold" style={{ backgroundColor: '#B4C6E7' }}>품목</th>
              <th className="border border-black px-2 py-1 text-center font-bold" style={{ backgroundColor: '#B4C6E7' }}>수량</th>
              <th className="border border-black px-2 py-1 text-center font-bold" style={{ backgroundColor: '#B4C6E7' }}>단가</th>
              <th className="border border-black px-2 py-1 text-center font-bold" style={{ backgroundColor: '#B4C6E7' }}>합계</th>

              <th className="border border-black px-2 py-1 text-center font-bold" >매입일/계산서</th>
              <th className="border border-black px-2 py-1 text-center font-bold" >매입처</th>
              <th className="border border-black px-2 py-1 text-center font-bold" >수량</th>
              <th className="border border-black px-2 py-1 text-center font-bold" >단가</th>
              <th className="border border-black px-2 py-1 text-center font-bold" >합계</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, i) => {
              const s = salesItems[i]
              const p = purchaseItems[i]
              return (
                <tr key={i}>
                  {/* 매출 쪽 */}
                  <td
                    className="border border-black px-2 py-1 font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSalesCell(i, 'partNumber', e.currentTarget)}
                  >
                    {s?.partNumber}
                  </td>
                  <td
                    className="border border-black px-2 py-1 font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSalesCell(i, 'description', e.currentTarget)}
                  >
                    {s?.description}
                  </td>
                  <td
                    className="border border-black px-2 py-1 text-right font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSalesCell(i, 'quantity', e.currentTarget)}
                  >
                    {s?.quantity ?? ''}
                  </td>
                  <td
                    className="border border-black px-2 py-1 text-right font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleSalesCell(i, 'unitPrice', e.currentTarget)}
                  >
                    {s?.unitPrice ? formatCurrency(s.unitPrice) : ''}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold">
                    {s?.totalPrice ? formatCurrency(s.totalPrice) : ''}
                  </td>

                  {/* 매입 쪽 */}
                  <td
                    className="border border-black px-2 py-1 font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handlePurchaseCell(i, 'dateOrInvoice', e.currentTarget)}
                  >
                    {p?.dateOrInvoice}
                  </td>
                  <td
                    className="border border-black px-2 py-1 font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handlePurchaseCell(i, 'vendor', e.currentTarget)}
                  >
                    {p?.vendor}
                  </td>
                  <td
                    className="border border-black px-2 py-1 text-right font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handlePurchaseCell(i, 'quantity', e.currentTarget)}
                  >
                    {p?.quantity ?? ''}
                  </td>
                  <td
                    className="border border-black px-2 py-1 text-right font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handlePurchaseCell(i, 'unitPrice', e.currentTarget)}
                  >
                    {p?.unitPrice ? formatCurrency(p.unitPrice) : ''}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold">
                    {p?.totalPrice ? formatCurrency(p.totalPrice) : ''}
                  </td>
                </tr>
              )
            })}
            <tr>
              <td
                colSpan={10}
                className="border border-black px-2 py-1 text-center text-xs text-blue-700 cursor-pointer font-bold"
                onClick={onAddRow}
              >
                + 행 추가
              </td>
            </tr>
            {/* 합계: 테이블 바로 아래에 붙이기 */}
            {/* 합계: 매출/매입 한 줄 + 매입 VAT포함 한 줄 */}
            <tr>
              {/* 매출 합계 (좌측 5칸) */}
              <td
                colSpan={3}
                className="border border-black px-2 py-2 text-center font-bold"
              >
                매출금액 합계(VAT별도)
              </td>
              <td
                colSpan={2}
                className="border border-black px-2 py-2 text-right font-bold"
              >
                {formatCurrency(salesTotal)}
              </td>
              {/* 매입 합계 (우측 5칸) */}
              <td
                colSpan={3}
                className="border border-black px-2 py-2 text-center font-bold"
              >
                매입금액 합계(VAT별도)
              </td>
              <td
                colSpan={2}
                className="border border-black px-2 py-2 text-right font-bold"
              >
                {formatCurrency(purchaseTotals.total)}
              </td>
            </tr>
            <tr>
              {/* 좌측은 빈칸 */}
              <td colSpan={5} className="border border-black px-2 py-2" />
              {/* 우측: 매입 VAT포함 */}
              <td
                colSpan={3}
                className="border border-black px-2 py-2 text-center font-bold"
              >
                매입금액 합계(VAT포함)
              </td>
              <td
                colSpan={2}
                className="border border-black px-2 py-2 text-right font-bold"
              >
                {formatCurrency(purchaseTotals.totalWithVat)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 계산서 / 배송 정보 - 일렬 배치 */}
        <table
          className="w-full mb-4 border-collapse"
          style={{ fontSize: '11px' }}
        >
          <tbody>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                기타
              </th>
              <td
                className="px-2 py-1 font-bold"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('etc', e.currentTarget)}
                style={{ minHeight: '40px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}
              >
                {formData.etc}
              </td>
            </tr>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                계산서 발행예정일
              </th>
              <td
                className="px-2 py-1 font-bold"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('invoicePlannedDate', e.currentTarget)}
              >
                {formData.invoicePlannedDate}
              </td>
            </tr>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                계산서 메일
              </th>
              <td
                className="px-2 py-1 font-bold"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('invoiceEmail', e.currentTarget)}
              >
                {formData.invoiceEmail}
              </td>
            </tr>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                결제일
              </th>
              <td
                className="px-2 py-1 font-bold"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('paymentDue', e.currentTarget)}
              >
                {formData.paymentDue}
              </td>
            </tr>

            {/* 공백 */}
            <tr>
              <td className="px-2 py-2" colSpan={2}>&nbsp;</td>
            </tr>

            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                배송주소
              </th>
              <td
                className="px-2 py-1 font-bold"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('shippingAddress', e.currentTarget)}
              >
                {formData.shippingAddress}
              </td>
            </tr>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                받으실분 / 연락처
              </th>
              <td
                className="px-2 py-1 font-bold"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const text = e.currentTarget.textContent || ''
                  const [receiver, phone] = text.split('/').map((v) => v.trim())
                  onDataChange('shippingReceiver', receiver || '')
                  onDataChange('shippingReceiverPhone', phone || '')
                }}
              >
                {formData.shippingReceiver}
                {formData.shippingReceiverPhone ? ` / ${formData.shippingReceiverPhone}` : ''}
              </td>
            </tr>
            <tr>
              <th className="w-26 px-2 py-1 text-left font-bold">
                배송일
              </th>
              <td
                className="px-2 py-1 font-bold"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleEditableChange('shippingDate', e.currentTarget)}
              >
                {formData.shippingDate}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 결재란 - 오른쪽 절반만 사용 */}
        <div className="mt-4 flex justify-end">
          <table
            className="border-collapse"
            style={{ fontSize: '11px', border: '1px solid #000', width: '50%' }}
          >
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 bg-gray-100 text-center font-bold">제공</th>
                <th className="border border-black px-2 py-1 bg-gray-100 text-center font-bold">대표이사</th>
                <th className="border border-black px-2 py-1 bg-gray-100 text-center font-bold">영업팀장</th>
                <th className="border border-black px-2 py-1 bg-gray-100 text-center font-bold">영업담당</th>
                <th className="border border-black px-2 py-1 bg-gray-100 text-center font-bold">출고</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-6 text-center font-bold">서명</td>
                <td className="border border-black px-2 py-6 font-bold" />
                <td className="border border-black px-2 py-6 font-bold" />
                <td className="border border-black px-2 py-6 text-center font-bold">✓</td>
                <td className="border border-black px-2 py-6 font-bold" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


