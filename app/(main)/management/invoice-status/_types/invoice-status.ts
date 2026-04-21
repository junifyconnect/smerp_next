// 계산서 상태 (재설계 후)
// NOT_REQUIRED는 더 이상 존재하지 않는다 — 발행 대상이 아니면 InvoiceRecord 자체를 만들지 않음.
export type InvoiceStatusType =
  | 'PENDING'
  | 'ISSUED'
  | 'NEEDS_AMENDMENT'
  | 'CANCELLED'

export type InvoiceTypeKind = 'SALES' | 'PURCHASE'

// API 응답: 한 행 = 한 InvoiceRecord
export interface InvoiceRecordRow {
  id: string
  invoiceType: InvoiceTypeKind

  // 매출 식별 (SALES일 때 채워짐)
  productId: string | null
  salesItemId: string | null

  // 매입 식별 (PURCHASE일 때 채워짐)
  vendorCompany: string | null

  // 공통 메타
  clientCompany: string | null

  // 스냅샷
  productName: string
  partNumber: string | null
  quantity: number
  unitPrice: number
  totalPrice: number

  // 상태/발행
  status: InvoiceStatusType
  invoiceDate: string | null
  invoiceNumber: string | null
  remarks: string | null

  // 체인/취소
  amendedFromId: string | null
  cancelledAt: string | null
  cancelReason: string | null

  createdAt: string
}

// API 응답: 품의서 그룹
export interface InvoiceGroup {
  approvalId: string
  approvalCode: string | null
  approvalDate: string | null
  clientCompany: string | null
  version: number
  managerName: string | null
  salesTotalPrice: number
  purchaseTotalPrice: number
  records: InvoiceRecordRow[]
}

// API 응답: 요약
export interface InvoiceSummary {
  totalSales: number
  totalPurchase: number
  salesCount: number
  purchaseCount: number
  salesByStatus: Record<string, number>
  purchaseByStatus: Record<string, number>
}

// API 응답: 전체
export interface InvoiceStatusResponse {
  groups: InvoiceGroup[]
  summary: InvoiceSummary
}

// 필터
export interface InvoiceStatusFilters {
  month: string | null
  approvalCode: string | null
  clientCompany: string | null
  vendorCompany: string | null
  invoiceStatus: InvoiceStatusType | null
  invoiceType: InvoiceTypeKind | null
}

// 상태 라벨 + 색상
export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatusType,
  { label: string; color: string; bgColor: string }
> = {
  PENDING: {
    label: '미발행',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
  },
  ISSUED: {
    label: '발행완료',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
  },
  NEEDS_AMENDMENT: {
    label: '수정필요',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
  },
  CANCELLED: {
    label: '취소',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
  },
}
