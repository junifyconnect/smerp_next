import type {
  SalesLedger,
  PurchaseLedger,
  MABilling,
  ProductCategory,
  PaymentStatus,
} from '@prisma/client'

/**
 * 매출장/매입장 API 응답에서 영업(SalesLedger/PurchaseLedger) 데이터와
 * MA(MABilling) 데이터를 통합 조회하기 위한 normalize 헬퍼.
 *
 * BUSINESS_RULES §10.1: MABilling은 MA의 원장 대체 엔티티이므로,
 * 매출장/매입장 집계 API는 SalesLedger + MABilling UNION을 반환해야 한다.
 */

export type LedgerSource = 'SALES_APPROVAL' | 'MA_BILLING'

export interface UnifiedSalesEntry {
  id: string
  source: LedgerSource

  // 거래 식별
  approvalCode: string | null
  vendorCode: string | null
  transactionDate: Date
  clientCompany: string
  endUser: string | null

  // 분류
  category: ProductCategory
  subCategory: string | null

  // 거래 내용
  description: string
  quantity: number
  unitPrice: number
  supplyAmount: number
  vatAmount: number
  totalAmount: number
  grossProfit: number | null

  // 결제
  paymentDueDate: Date | null
  paymentDate: Date | null
  paymentStatus: PaymentStatus

  // 담당자
  managerName: string | null

  // 연결
  salesApprovalId: string | null
  maContractId: string | null // MA 소스일 때
}

export interface UnifiedPurchaseEntry {
  id: string
  source: LedgerSource

  approvalCode: string | null
  vendorCode: string | null
  invoiceDate: Date
  vendorCompany: string
  clientCompany: string | null

  category: ProductCategory
  subCategory: string | null

  itemName: string
  quantity: number
  unitPrice: number
  supplyAmount: number
  vatAmount: number
  totalAmount: number

  paymentDueDate: Date | null
  paymentDate: Date | null
  paymentStatus: PaymentStatus

  salesApprovalId: string | null
  maContractId: string | null
}

export function fromSalesLedger(l: SalesLedger): UnifiedSalesEntry {
  return {
    id: l.id,
    source: 'SALES_APPROVAL',
    approvalCode: l.approvalCode,
    vendorCode: l.vendorCode,
    transactionDate: l.transactionDate,
    clientCompany: l.clientCompany,
    endUser: l.endUser,
    category: l.category,
    subCategory: l.subCategory,
    description: l.description,
    quantity: l.quantity,
    unitPrice: Number(l.unitPrice),
    supplyAmount: Number(l.supplyAmount),
    vatAmount: Number(l.vatAmount),
    totalAmount: Number(l.totalAmount),
    grossProfit: l.grossProfit !== null ? Number(l.grossProfit) : null,
    paymentDueDate: l.paymentDueDate,
    paymentDate: l.paymentDate,
    paymentStatus: l.paymentStatus,
    managerName: l.managerName,
    salesApprovalId: l.salesApprovalId,
    maContractId: null,
  }
}

/**
 * MABilling을 매출 원장 행으로 normalize.
 * salesAmount === 0인 행은 호출 전에 필터링해야 함.
 */
export function fromMABillingSales(
  b: MABilling & { maContract: { id: string; maApprovalId: string } }
): UnifiedSalesEntry {
  return {
    id: `ma-sales-${b.id}`, // 프론트에서 구분용 prefix
    source: 'MA_BILLING',
    approvalCode: null,
    vendorCode: null,
    transactionDate: b.dueDate,
    clientCompany: b.clientCompany,
    endUser: null,
    category: 'MA',
    subCategory: null,
    description: b.itemName,
    quantity: 1,
    unitPrice: Number(b.salesAmount),
    supplyAmount: Number(b.salesAmount),
    vatAmount: Number(b.salesVatAmount),
    totalAmount: Number(b.salesTotalAmount),
    grossProfit: Number(b.salesAmount) - Number(b.purchaseAmount),
    paymentDueDate: b.dueDate,
    paymentDate: b.paymentDate,
    paymentStatus: b.paymentStatus,
    managerName: null,
    salesApprovalId: null,
    maContractId: b.maContract.id,
  }
}

export function fromPurchaseLedger(l: PurchaseLedger): UnifiedPurchaseEntry {
  return {
    id: l.id,
    source: 'SALES_APPROVAL',
    approvalCode: l.approvalCode,
    vendorCode: l.vendorCode,
    invoiceDate: l.invoiceDate,
    vendorCompany: l.vendorCompany,
    clientCompany: l.clientCompany,
    category: l.category,
    subCategory: l.subCategory,
    itemName: l.itemName,
    quantity: l.quantity,
    unitPrice: Number(l.unitPrice),
    supplyAmount: Number(l.supplyAmount),
    vatAmount: Number(l.vatAmount),
    totalAmount: Number(l.totalAmount),
    paymentDueDate: l.paymentDueDate,
    paymentDate: l.paymentDate,
    paymentStatus: l.paymentStatus,
    salesApprovalId: l.salesApprovalId,
    maContractId: null,
  }
}

/**
 * MABilling을 매입 원장 행으로 normalize.
 * purchaseAmount === 0 또는 vendorCompany가 없는 행은 호출 전에 필터링해야 함.
 */
export function fromMABillingPurchase(
  b: MABilling & { maContract: { id: string; maApprovalId: string } }
): UnifiedPurchaseEntry {
  return {
    id: `ma-purchase-${b.id}`,
    source: 'MA_BILLING',
    approvalCode: null,
    vendorCode: null,
    invoiceDate: b.dueDate,
    vendorCompany: b.vendorCompany || '',
    clientCompany: b.clientCompany,
    category: 'MA',
    subCategory: null,
    itemName: b.itemName,
    quantity: 1,
    unitPrice: Number(b.purchaseAmount),
    supplyAmount: Number(b.purchaseAmount),
    vatAmount: Number(b.purchaseVatAmount),
    totalAmount: Number(b.purchaseTotalAmount),
    paymentDueDate: b.dueDate,
    paymentDate: b.paymentDate,
    paymentStatus: b.paymentStatus,
    salesApprovalId: null,
    maContractId: b.maContract.id,
  }
}
