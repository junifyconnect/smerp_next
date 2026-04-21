import { NextResponse } from 'next/server'

/**
 * ⚠ DEPRECATED
 *
 * 계산서 재설계(2026-04-20)로 인해 이 엔드포인트는 폐기되었습니다.
 * 통합 엔드포인트 사용:
 *   - GET   /api/management/invoice-status?invoiceType=PURCHASE
 *   - POST  /api/management/invoices/issue
 *   - POST  /api/management/invoices/amend
 *   - POST  /api/management/invoices/cancel
 *
 * Item.purchaseInvoiceStatus 필드는 더 이상 존재하지 않습니다 (InvoiceRecord로 이관).
 * 매입 계산서 단위는 매입처(vendorCompany) 단일화.
 */
export async function GET() {
  return NextResponse.json(
    {
      error:
        'DEPRECATED: /api/management/purchase-invoice-status는 폐기되었습니다. /api/management/invoice-status?invoiceType=PURCHASE 를 사용하세요.',
    },
    { status: 410 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    {
      error:
        'DEPRECATED: 상태 전이는 /api/management/invoices/issue|amend|cancel 전용 API를 사용하세요.',
    },
    { status: 410 }
  )
}
