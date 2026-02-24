// 계산서 상태
export type InvoiceStatusType =
  | 'PENDING'
  | 'ISSUED'
  | 'NEEDS_AMENDMENT'
  | 'NOT_REQUIRED'
  | 'CANCELLED'

// API 응답: Item (매입 정보)
export interface InvoiceItemRow {
  id: string
  partNumber: string | null
  description: string | null
  quantity: number
  vendorName: string | null
  purchaseQty: number
  purchasePrice: number | null
  purchaseTotal: number | null
  purchaseDate: string | null
  purchaseInvoiceStatus: InvoiceStatusType
  purchaseInvoiceDate: string | null
}

// API 응답: Product (매출 정보 + 하위 Items)
export interface InvoiceProductRow {
  id: string
  name: string
  quantity: number
  unitPrice: number | null
  totalPrice: number | null
  salesInvoiceStatus: InvoiceStatusType
  salesInvoiceDate: string | null
  salesInvoiceRemarks: string | null
  items: InvoiceItemRow[]
}

// API 응답: 품의코드별 그룹
export interface InvoiceGroup {
  approvalId: string
  approvalCode: string | null
  approvalDate: string | null
  clientCompany: string | null
  version: number
  managerName: string | null
  salesTotalPrice: number
  purchaseTotalPrice: number
  products: InvoiceProductRow[]
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
  vendorName: string | null
  invoiceStatus: string | null
}

// 테이블 렌더링용 flat row
export interface FlatInvoiceRow {
  // 품의 레벨
  approvalId: string
  approvalCode: string | null
  approvalDate: string | null
  clientCompany: string | null
  version: number

  // Product 레벨 (매출)
  productId: string
  productName: string
  productQuantity: number
  productUnitPrice: number | null
  productTotalPrice: number | null
  salesInvoiceStatus: InvoiceStatusType
  salesInvoiceDate: string | null
  salesInvoiceRemarks: string | null
  salesTotalByApproval: number

  // Item 레벨 (매입)
  itemId: string | null
  partNumber: string | null
  description: string | null
  vendorName: string | null
  purchaseQty: number | null
  purchasePrice: number | null
  purchaseTotal: number | null
  purchaseDate: string | null
  purchaseInvoiceStatus: InvoiceStatusType | null
  purchaseInvoiceDate: string | null
  purchaseTotalByApproval: number

  // rowSpan 정보
  isFirstRowOfApproval: boolean
  approvalRowSpan: number
  isFirstRowOfProduct: boolean
  productRowSpan: number
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
  NOT_REQUIRED: {
    label: '발행불필요',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
  CANCELLED: {
    label: '취소',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
  },
}
