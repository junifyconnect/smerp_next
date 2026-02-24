import type {
  InvoiceGroup,
  InvoiceStatusType,
  FlatInvoiceRow,
} from '@/app/(main)/management/invoice-status/_types/invoice-status'

/**
 * 중첩 구조의 InvoiceGroup[] → 테이블 렌더링용 flat row 배열로 변환
 * 각 row는 Product(매출) + Item(매입) 한 줄
 * Product에 Item이 여러 개면 여러 row, 매출 정보는 첫 행만 (rowSpan)
 */
export function flattenGroups(groups: InvoiceGroup[]): FlatInvoiceRow[] {
  const rows: FlatInvoiceRow[] = []

  for (const group of groups) {
    // 이 품의코드의 총 행 수 계산
    let approvalRowCount = 0
    for (const product of group.products) {
      approvalRowCount += Math.max(product.items.length, 1)
    }

    let isFirstRowOfApproval = true

    for (const product of group.products) {
      const productRowCount = Math.max(product.items.length, 1)

      if (product.items.length === 0) {
        // Item이 없는 Product (매출만 있는 경우)
        rows.push({
          approvalId: group.approvalId,
          approvalCode: group.approvalCode,
          approvalDate: group.approvalDate,
          clientCompany: group.clientCompany,
          version: group.version,

          productId: product.id,
          productName: product.name,
          productQuantity: product.quantity,
          productUnitPrice: product.unitPrice,
          productTotalPrice: product.totalPrice,
          salesInvoiceStatus: product.salesInvoiceStatus as InvoiceStatusType,
          salesInvoiceDate: product.salesInvoiceDate,
          salesInvoiceRemarks: product.salesInvoiceRemarks,
          salesTotalByApproval: group.salesTotalPrice,

          itemId: null,
          partNumber: null,
          description: null,
          vendorName: null,
          purchaseQty: null,
          purchasePrice: null,
          purchaseTotal: null,
          purchaseDate: null,
          purchaseInvoiceStatus: null,
          purchaseInvoiceDate: null,
          purchaseTotalByApproval: group.purchaseTotalPrice,

          isFirstRowOfApproval,
          approvalRowSpan: isFirstRowOfApproval ? approvalRowCount : 0,
          isFirstRowOfProduct: true,
          productRowSpan: productRowCount,
        })
        isFirstRowOfApproval = false
      } else {
        for (let i = 0; i < product.items.length; i++) {
          const item = product.items[i]
          rows.push({
            approvalId: group.approvalId,
            approvalCode: group.approvalCode,
            approvalDate: group.approvalDate,
            clientCompany: group.clientCompany,
            version: group.version,

            productId: product.id,
            productName: product.name,
            productQuantity: product.quantity,
            productUnitPrice: product.unitPrice,
            productTotalPrice: product.totalPrice,
            salesInvoiceStatus: product.salesInvoiceStatus as InvoiceStatusType,
            salesInvoiceDate: product.salesInvoiceDate,
            salesInvoiceRemarks: product.salesInvoiceRemarks,
            salesTotalByApproval: group.salesTotalPrice,

            itemId: item.id,
            partNumber: item.partNumber,
            description: item.description,
            vendorName: item.vendorName,
            purchaseQty: item.purchaseQty,
            purchasePrice: item.purchasePrice,
            purchaseTotal: item.purchaseTotal,
            purchaseDate: item.purchaseDate,
            purchaseInvoiceStatus:
              item.purchaseInvoiceStatus as InvoiceStatusType,
            purchaseInvoiceDate: item.purchaseInvoiceDate,
            purchaseTotalByApproval: group.purchaseTotalPrice,

            isFirstRowOfApproval,
            approvalRowSpan: isFirstRowOfApproval ? approvalRowCount : 0,
            isFirstRowOfProduct: i === 0,
            productRowSpan: i === 0 ? productRowCount : 0,
          })
          isFirstRowOfApproval = false
        }
      }
    }
  }

  return rows
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return ''
  return Number(num).toLocaleString()
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

export function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0]
}

/**
 * 현재 월을 YYYY-MM 형식으로 반환
 */
export function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
