'use client'

import Image from 'next/image'

interface DocumentItem {
  partNumber?: string
  description?: string
  quantity: number
  srpPrice?: number
  unitPrice?: number
  totalPrice?: number
}

interface DocumentFormTemplateProps {
  formData: {
    title: string
    projectName: string
    clientCompany: string
    clientContact: string
    clientPhone: string
    clientFax: string
    clientCP: string
    clientEmail: string
    quoteDate: string
    deliveryDate: string
    validUntil: string
    paymentTerms: string
    managerName: string
    managerPhone: string
    notes: string
  }
  items: DocumentItem[]
  totals: { total: number; vat: number; totalWithVat: number }
  onDataChange: (field: string, value: string) => void
  onItemChange: (index: number, field: keyof DocumentItem, value: string | number) => void
  onAddItem: () => void
  onRemoveItem: (index: number) => void
}

export function DocumentFormTemplate({
  formData,
  items,
  totals,
  onDataChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
}: DocumentFormTemplateProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount)
  }

  const handleEditableChange = (field: string, element: HTMLElement) => {
    const value = element.textContent || ''
    onDataChange(field, value)
  }

  const handleItemEditableChange = (
    index: number,
    field: keyof DocumentItem,
    element: HTMLElement
  ) => {
    const value = element.textContent || ''
    if (field === 'quantity' || field === 'unitPrice' || field === 'totalPrice' || field === 'srpPrice') {
      const numValue = parseInt(value.replace(/,/g, '')) || 0
      onItemChange(index, field, numValue)
    } else {
      onItemChange(index, field, value)
    }
    // 금액 자동 계산
    if (field === 'quantity' || field === 'unitPrice') {
      const item = items[index]
      const quantity = field === 'quantity' ? parseInt(value.replace(/,/g, '')) || 0 : item.quantity
      const unitPrice = field === 'unitPrice' ? parseInt(value.replace(/,/g, '')) || 0 : item.unitPrice || 0
      const totalPrice = quantity * unitPrice
      onItemChange(index, 'totalPrice', totalPrice)
    }
  }

  return (
    <div className="bg-gray-100 p-8 rounded-xl">
      <div className="bg-white p-12 shadow-lg max-w-4xl mx-auto" style={{ minHeight: '297mm', fontFamily: '맑은 고딕, Malgun Gothic, sans-serif', color: '#000' }}>
        {/* Quotation 타이틀 - 제일 위 */}
        <div className="text-center mb-6">
          <div className="text-3xl font-bold" style={{ letterSpacing: '4px' }}>Quotation</div>
        </div>

        {/* 상단 헤더 영역 */}
        <div className="flex justify-between items-start mb-4">
          {/* 왼쪽: 고객 정보 테이블 */}
          <div className="flex-1 mr-4">
            <table
              className="w-full border-collapse"
              style={{ fontSize: '11px', color: '#000' }}
            >
              <tbody>
                <tr>
                  <td className="w-20 pr-4 align-top text-center font-semibold text-black">회 사</td>
                  <td
                    className="text-black font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const text = e.currentTarget.textContent || ''
                      const company = text.replace(/\s*귀중$/, '')
                      onDataChange('clientCompany', company)
                      e.currentTarget.innerHTML = company ? `${company} 귀중` : ''
                    }}
                    dangerouslySetInnerHTML={{
                      __html: formData.clientCompany ? `${formData.clientCompany} 귀중` : '',
                    }}
                  />
                </tr>
                <tr>
                  <td className="pr-4 align-top text-center font-semibold text-black">참 조</td>
                  <td
                    className="text-black font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleEditableChange('clientContact', e.currentTarget)}
                  >
                    {formData.clientContact}
                  </td>
                </tr>
                <tr>
                  <td className="pr-4 align-top text-center font-semibold text-black">전 화</td>
                  <td
                    className="text-black font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleEditableChange('clientPhone', e.currentTarget)}
                  >
                    {formData.clientPhone}
                  </td>
                </tr>
                <tr>
                  <td className="pr-4 align-top text-center font-semibold text-black">Fax</td>
                  <td
                    className="text-black font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleEditableChange('clientFax', e.currentTarget)}
                  >
                    {formData.clientFax}
                  </td>
                </tr>
                <tr>
                  <td className="pr-4 align-top text-center font-semibold text-black">C P</td>
                  <td
                    className="text-black font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleEditableChange('clientCP', e.currentTarget)}
                  >
                    {formData.clientCP}
                  </td>
                </tr>
                <tr>
                  <td className="pr-4 align-top text-center font-semibold text-black">E-mail</td>
                  <td
                    className="text-black font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleEditableChange('clientEmail', e.currentTarget)}
                  >
                    {formData.clientEmail}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 견적 정보 테이블 */}
            <div className="mt-4">
              <table
                className="w-full border-collapse"
                style={{ fontSize: '11px', color: '#000' }}
              >
                <tbody>
                  <tr>
                    <td className="w-20 pr-4 align-top text-center font-semibold text-black">견적일</td>
                    <td
                      className="text-black font-bold"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleEditableChange('quoteDate', e.currentTarget)}
                    >
                      {formatDate(formData.quoteDate)}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 align-top text-center font-semibold text-black">납기일</td>
                    <td
                      className="text-black font-bold"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleEditableChange('deliveryDate', e.currentTarget)}
                    >
                      {formData.deliveryDate || '별도협의'}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 align-top text-center font-semibold text-black">유효기간</td>
                    <td
                      className="text-black font-bold"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleEditableChange('validUntil', e.currentTarget)}
                    >
                      {formData.validUntil || '견적일로부터 15일'}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 align-top text-center font-semibold text-black">결제조건</td>
                    <td
                      className="text-black font-bold"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleEditableChange('paymentTerms', e.currentTarget)}
                    >
                      {formData.paymentTerms}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 align-top text-center font-semibold text-black">견적담당</td>
                    <td className="text-black font-bold">
                      {formData.managerName}
                      {formData.managerPhone && ` (${formData.managerPhone})`}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 align-top text-center font-semibold text-black">프로젝트명</td>
                    <td
                      className="text-black font-bold"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleEditableChange('projectName', e.currentTarget)}
                    >
                      {formData.projectName}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 오른쪽: 로고 및 회사 정보 */}
          <div className="flex-shrink-0" style={{ width: '280px' }}>            
            {/* 로고 영역 */}
            <div className="mb-3">
              <div className="mb-2">
                <Image
                  src="/imgs/quotes_sm_logo.png"
                  alt="ServerMate Logo"
                  width={120}
                  height={60}
                  className="h-auto"
                  style={{ maxWidth: '120px' }}
                />
              </div>
              <div>
                <Image
                  src="/imgs/quotes_logo_2.png"
                  alt="OPTIONS CONTINUATION PROGRAM"
                  width={120}
                  height={40}
                  className="h-auto"
                  style={{ maxWidth: '120px' }}
                />
              </div>
            </div>

            {/* 회사 정보 */}
            <div className="text-left text-xs font-bold" style={{ fontSize: '10px', lineHeight: '1.5' }}>
              <div>서울시 금천구 가산디지털1로 131</div>
              <div>(BYC하이시티 B동 1201호)</div>
              <div className="mt-1">
                &lt;Tel: 070-8892-1452 Fax: 070-8892-1459&gt;
              </div>
              <div className="mt-2 text-left" style={{ fontSize: '9px' }}>
                대표 서서형 (온라인견적시 직인생략)
              </div>
            </div>
          </div>
        </div>



        {/* 단위 표시 */}
        <div className="mb-2 text-xs text-black text-right font-bold" style={{ fontSize: '10px' }}>
          단위:원 (VAT별도)
        </div>

        {/* 품목 테이블 */}
        <table
          className="w-full mb-4 border-collapse"
          style={{ fontSize: '12px', border: '1px solid #000', color: '#000' }}
        >
          <thead>
            <tr>
              <th
                className="border border-black p-2 text-center font-bold"
                style={{ width: '80px', backgroundColor: '#0F243F', color: '#ffffff' }}
              >
                P/N
              </th>
              <th
                className="border border-black p-2 text-center font-bold"
                style={{ backgroundColor: '#0F243F', color: '#ffffff' }}
              >
                Description
              </th>
              <th
                className="border border-black p-2 text-center font-bold"
                style={{ width: '45px', backgroundColor: '#0F243F', color: '#ffffff' }}
              >
                Q&apos;ty
              </th>
              <th
                className="border border-black p-2 text-center font-bold"
                style={{ width: '80px', backgroundColor: '#0F243F', color: '#ffffff' }}
              >
                SRP
              </th>
              <th
                className="border border-black p-2 text-center font-bold"
                style={{ width: '80px', backgroundColor: '#0F243F', color: '#ffffff' }}
              >
                Price
              </th>
              <th
                className="border border-black p-2 text-center font-bold"
                style={{ width: '90px', backgroundColor: '#0F243F', color: '#ffffff' }}
              >
                Sum
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td
                  className="border border-black p-2 text-black"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleItemEditableChange(index, 'partNumber', e.currentTarget)}
                >
                  {item.partNumber}
                </td>
                <td
                  className="border border-black p-2 text-black"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleItemEditableChange(index, 'description', e.currentTarget)}
                  style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}
                >
                  {item.description}
                </td>
                <td
                  className="border border-black p-2 text-right text-black"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleItemEditableChange(index, 'quantity', e.currentTarget)}
                >
                  {item.quantity}
                </td>
                <td
                  className="border border-black p-2 text-right text-black"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleItemEditableChange(index, 'srpPrice', e.currentTarget)}
                >
                  {item.srpPrice ? formatCurrency(item.srpPrice) : ''}
                </td>
                <td
                  className="border border-black p-2 text-right text-black"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleItemEditableChange(index, 'unitPrice', e.currentTarget)}
                >
                  {item.unitPrice ? formatCurrency(item.unitPrice) : ''}
                </td>
                <td className="border border-black p-2 text-right font-semibold text-black">
                  {item.totalPrice ? formatCurrency(item.totalPrice) : ''}
                </td>
              </tr>
            ))}
            {/* 빈 행 추가 버튼 */}
            <tr>
              <td colSpan={6} className="border border-black p-2 text-center">
                <button
                  type="button"
                  onClick={onAddItem}
                  className="text-blue-600 hover:text-blue-800 text-xs underline"
                >
                  + 품목 추가
                </button>
              </td>
            </tr>
            {/* 합계 행 (원본 엑셀의 초록색 영역) */}
            <tr>
              <td
                colSpan={3}
                className="border border-black font-bold text-black text-center"
                style={{ backgroundColor: '#92D050', fontSize: '16px' }}
              >
                제안금액(VAT별도)
              </td>
              <td
                colSpan={3}
                className="border border-black px-2 text-right font-bold"
                style={{ backgroundColor: '#92D050', fontSize: '16px' }}
              >
                {formatCurrency(totals.total)}
              </td>
            </tr>
            <tr>
              <td
                colSpan={3}
                className="border border-black font-bold text-black text-center"
                style={{ backgroundColor: '#92D050', fontSize: '16px' }}
              >
                제안금액(VAT포함)
              </td>
              <td
                colSpan={3}
                className="border border-black px-2 text-right font-bold"
                style={{ backgroundColor: '#92D050', color: '#0000CC', fontSize: '16px' }}
              >
                {formatCurrency(totals.totalWithVat)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 기타사항 */}
        <div className="mb-4 text-black" style={{ fontSize: '11px' }}>
          <div className="font-bold mb-2 text-black">기타사항</div>
          <div
            className="min-h-20 text-black font-bold"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleEditableChange('notes', e.currentTarget)}
            style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}
          >
            {formData.notes || '[견적서의 상세 내역 or 견적서 추가 내용]'}
          </div>
        </div>

        {/* 특별 문구 */}
        <div className="mb-4 text-xs text-black font-bold" style={{ fontSize: '10px', lineHeight: '1.6' }}>
          * 당사는 이 견적상의 가격 및 조건들을 수용하고 이 견적서를 귀사에 대한 공식 발주서로 대신 하고자 합니다
        </div>

        {/* 구매자 확인란 */}
        <div className="mb-4 text-black" style={{ fontSize: '11px' }}>
          <div className="font-bold mb-2 text-black">* 구매자 확인란 :</div>
          <div className="space-y-2 text-black" style={{ fontSize: '10px' }}>
            {/* 1행: 회사명 / 명판 및 직인 */}
            <div className="flex gap-8">
              <div className="flex-1">
                <span className="font-semibold text-black">회사명 :</span>
                <span
                  className="ml-2 inline-block min-w-40 text-black font-bold"
                  contentEditable
                  suppressContentEditableWarning
                />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-black">명판 및 직인 :</span>
                <span
                  className="ml-2 inline-block min-w-40 text-black font-bold"
                  contentEditable
                  suppressContentEditableWarning
                />
              </div>
            </div>

            {/* 2행: 담당자, 연락처 */}
            <div>
              <span className="font-semibold text-black">담당자, 연락처 :</span>
                <span
                  className="ml-2 inline-block min-w-64 text-black font-bold"
                  contentEditable
                  suppressContentEditableWarning
                />
            </div>

            {/* 3행: 배송지 / 결제조건 */}
            <div className="flex gap-8">
              <div className="flex-1">
                <span className="font-semibold text-black">배송지 :</span>
                <span
                  className="ml-2 inline-block min-w-40 text-black font-bold"
                  contentEditable
                  suppressContentEditableWarning
                />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-black">결제조건 :</span>
                <span
                  className="ml-2 inline-block min-w-40 text-black font-bold"
                  contentEditable
                  suppressContentEditableWarning
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
