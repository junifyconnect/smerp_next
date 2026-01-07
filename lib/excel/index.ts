export {
  generateExcel,
  generateSalesQuote,
  generateSalesApproval,
  generateSalesOrder,
  generateMAQuote,
  generateMAApproval,
  generateQuoteExcel,
  generateApprovalExcel,
  generateOrderExcel,
} from './generator'
export type { DocumentData, DocumentItem, PurchaseItem, MAItem } from './generator'

export { parseExcel, detectDocType } from './parser'
export type {
  ParsedDocument,
  ParsedItem,
  ParsedPurchaseItem,
  ParsedMAItem,
} from './parser'
