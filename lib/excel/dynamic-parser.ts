import * as ExcelJS from 'exceljs'
import type { DocType, ParsedDocument, ParsedItem, ParsedPurchaseItem, ParsedProduct } from './parser'

// 템플릿 설정 타입
export interface ExcelTemplateConfig {
  id: string
  name: string
  docType: string
  fieldMappings: Record<string, string>  // { "customerCompany": "C5", ... }
  itemTableHeaderRow: number
  itemTableStartRow: number
  itemTableEndRow?: number | null
  salesColumnMappings: Record<string, string>  // { "itemName": "C", "itemQty": "E", ... }
  purchaseColumnMappings: Record<string, string>  // { "purchaseVendor": "I", ... }
  mainItemDetection?: string  // 메인 품목 감지 규칙 (예: "unitPrice > 0")
  subItemDetection?: string   // 하위 품목 감지 규칙
  totalRowDetection?: string  // 합계 행 감지 규칙
}

// 셀 값 추출 헬퍼
function getCellValue(sheet: ExcelJS.Worksheet, address: string): string {
  const cell = sheet.getCell(address)
  const value = cell.value
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined) {
      return String(value.result)
    }
    if ('text' in value && value.text) {
      return String(value.text).trim()
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((r: { text: string }) => r.text).join('').trim()
    }
  }
  return String(value).trim()
}

function getNumericValue(sheet: ExcelJS.Worksheet, address: string): number {
  const cell = sheet.getCell(address)
  const value = cell.value
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/,/g, ''))
    return isNaN(num) ? 0 : num
  }
  if (value && typeof value === 'object') {
    if ('result' in value) {
      const result = value.result
      if (typeof result === 'number') return result
      if (typeof result === 'string') {
        const num = parseFloat(result.replace(/,/g, ''))
        return isNaN(num) ? 0 : num
      }
    }
  }
  return 0
}

function getDateValue(sheet: ExcelJS.Worksheet, address: string): Date | undefined {
  const cell = sheet.getCell(address)
  const value = cell.value

  if (value instanceof Date) return value

  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30)
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
  }

  let dateStr = ''
  if (typeof value === 'string') {
    dateStr = value.trim()
  } else if (value && typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      dateStr = value.richText.map((r: { text: string }) => r.text).join('').trim()
    } else if ('text' in value && value.text) {
      dateStr = String(value.text).trim()
    }
  }

  if (!dateStr) return undefined

  const patterns = [
    /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/,
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
  ]

  for (const pattern of patterns) {
    const match = dateStr.match(pattern)
    if (match) {
      const [, year, month, day] = match
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime())) return date
    }
  }

  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? undefined : parsed
}

// 열 문자를 주소로 변환 (예: "C", 17 -> "C17")
function colRowToAddress(colLetter: string, row: number): string {
  return `${colLetter}${row}`
}

// 동적 파서 메인 함수
export async function parseWithTemplate(
  buffer: Buffer,
  template: ExcelTemplateConfig
): Promise<ParsedDocument> {
  const workbook = new ExcelJS.Workbook()

  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  } catch (loadError) {
    console.error('ExcelJS 로드 오류:', loadError)
    throw new Error(`엑셀 파일을 로드할 수 없습니다: ${loadError instanceof Error ? loadError.message : '알 수 없는 오류'}`)
  }

  let sheet = workbook.getWorksheet(1)
  if (!sheet && workbook.worksheets.length > 0) {
    sheet = workbook.worksheets[0]
  }

  if (!sheet) {
    throw new Error('워크시트를 찾을 수 없습니다')
  }

  // 1. 문서 정보 필드 추출 (fieldMappings 기반)
  const docInfo = extractDocumentInfo(sheet, template.fieldMappings)

  // 2. 품목 테이블 파싱 (열 매핑 기반)
  const { items, purchaseItems, products, totalAmount, purchaseTotal } = parseItemTable(
    sheet,
    template
  )

  // 결과 조합
  const result: ParsedDocument = {
    ...docInfo,
    items,
    purchaseItems,
    products: products.length > 0 ? products : undefined,
    totalAmount,
    purchaseTotal,
  }

  return result
}

// 문서 정보 추출
function extractDocumentInfo(
  sheet: ExcelJS.Worksheet,
  fieldMappings: Record<string, string>
): Partial<ParsedDocument> {
  const result: Partial<ParsedDocument> = {}

  for (const [field, address] of Object.entries(fieldMappings)) {
    if (!address) continue

    const rawValue = getCellValue(sheet, address)

    switch (field) {
      case 'documentDate':
      case 'approvalDate':
      case 'quoteDate':
        result.quoteDate = getDateValue(sheet, address)
        result.approvalDate = result.quoteDate
        break

      case 'documentNumber':
      case 'approvalCode':
        result.approvalCode = rawValue || undefined
        break

      case 'customerCompany':
      case 'clientCompany':
        result.clientCompany = rawValue?.replace(/\s*귀중$/, '') || undefined
        break

      case 'customerContact':
      case 'clientContact':
        result.clientContact = rawValue || undefined
        break

      case 'projectName':
        result.projectName = rawValue || undefined
        break

      case 'validUntil':
        result.validUntil = rawValue || undefined
        break

      case 'deliveryDate':
        result.deliveryDate = getDateValue(sheet, address)
        break

      case 'endUser':
        result.endUser = rawValue || undefined
        break

      case 'notes':
        result.notes = rawValue || undefined
        break

      case 'approvalManager':
      case 'managerName':
        result.approvalManager = rawValue || undefined
        result.managerName = rawValue || undefined
        break

      default:
        // 알 수 없는 필드는 무시
        break
    }
  }

  return result
}

// 품목 테이블 파싱
function parseItemTable(
  sheet: ExcelJS.Worksheet,
  template: ExcelTemplateConfig
): {
  items: ParsedItem[]
  purchaseItems: ParsedPurchaseItem[]
  products: ParsedProduct[]
  totalAmount: number
  purchaseTotal: number
} {
  const items: ParsedItem[] = []
  const purchaseItems: ParsedPurchaseItem[] = []
  const products: ParsedProduct[] = []

  const { salesColumnMappings, purchaseColumnMappings, itemTableStartRow, itemTableEndRow } = template

  let currentProduct: ParsedProduct | null = null
  let row = itemTableStartRow
  const maxRow = itemTableEndRow || 100

  while (row <= maxRow) {
    // 영업 열에서 값 읽기
    const itemNo = salesColumnMappings.itemNo
      ? getCellValue(sheet, colRowToAddress(salesColumnMappings.itemNo, row))
      : ''
    const itemName = salesColumnMappings.itemName
      ? getCellValue(sheet, colRowToAddress(salesColumnMappings.itemName, row))
      : ''
    const itemSpec = salesColumnMappings.itemSpec
      ? getCellValue(sheet, colRowToAddress(salesColumnMappings.itemSpec, row))
      : ''
    const itemQty = salesColumnMappings.itemQty
      ? getNumericValue(sheet, colRowToAddress(salesColumnMappings.itemQty, row))
      : 0
    const salesUnitPrice = salesColumnMappings.salesUnitPrice
      ? getNumericValue(sheet, colRowToAddress(salesColumnMappings.salesUnitPrice, row))
      : 0
    const salesTotalPrice = salesColumnMappings.salesTotalPrice
      ? getNumericValue(sheet, colRowToAddress(salesColumnMappings.salesTotalPrice, row))
      : 0
    const remarks = salesColumnMappings.remarks
      ? getCellValue(sheet, colRowToAddress(salesColumnMappings.remarks, row))
      : ''

    // 매입 열에서 값 읽기
    const purchaseVendor = purchaseColumnMappings.purchaseVendor
      ? getCellValue(sheet, colRowToAddress(purchaseColumnMappings.purchaseVendor, row))
      : ''
    const purchaseUnitPrice = purchaseColumnMappings.purchaseUnitPrice
      ? getNumericValue(sheet, colRowToAddress(purchaseColumnMappings.purchaseUnitPrice, row))
      : 0
    const purchaseTotalPrice = purchaseColumnMappings.purchaseTotalPrice
      ? getNumericValue(sheet, colRowToAddress(purchaseColumnMappings.purchaseTotalPrice, row))
      : 0

    // 합계 행 확인 (품목명에 "합계", "매출금액" 등이 포함)
    const isTotalRow =
      itemNo.includes('합계') ||
      itemName.includes('합계') ||
      itemNo.includes('매출금액') ||
      itemName.includes('매출금액')

    if (isTotalRow) {
      break
    }

    // 빈 행 확인
    const isEmpty = !itemNo && !itemName && !itemSpec && itemQty === 0 && salesUnitPrice === 0 && salesTotalPrice === 0

    if (isEmpty) {
      // 연속 2개 빈 행이면 중단
      row++
      const nextItemName = salesColumnMappings.itemName
        ? getCellValue(sheet, colRowToAddress(salesColumnMappings.itemName, row))
        : ''
      const nextPrice = salesColumnMappings.salesTotalPrice
        ? getNumericValue(sheet, colRowToAddress(salesColumnMappings.salesTotalPrice, row))
        : 0
      if (!nextItemName && nextPrice === 0) {
        break
      }
      continue
    }

    // 메인 품목 판단: 단가/합계가 있고 품목번호(P/N)가 없는 경우
    const isMainItem = (salesUnitPrice > 0 || salesTotalPrice > 0) && !itemNo

    // 하위 품목 판단: 품목번호(P/N)가 있고 단가가 없는 경우
    const isSubItem = !!itemNo && salesUnitPrice === 0 && salesTotalPrice === 0

    if (isMainItem) {
      // 이전 제품 저장
      if (currentProduct) {
        products.push(currentProduct)
      }

      // 새 제품 생성
      currentProduct = {
        name: itemName || '제품',
        quantity: itemQty || 1,
        unitPrice: salesUnitPrice || salesTotalPrice,
        totalPrice: salesTotalPrice,
        items: [],
      }

      // items에도 추가
      items.push({
        partNumber: undefined,
        description: itemName || undefined,
        quantity: itemQty || 1,
        unitPrice: salesUnitPrice || undefined,
        totalPrice: salesTotalPrice || undefined,
      })

      // 매입 정보가 있으면 추가
      if (purchaseVendor || purchaseUnitPrice > 0 || purchaseTotalPrice > 0) {
        purchaseItems.push({
          partNumber: undefined,
          description: itemName || undefined,
          quantity: itemQty || 1,
          unitPrice: purchaseUnitPrice || undefined,
          totalPrice: purchaseTotalPrice || undefined,
          vendorCompany: purchaseVendor || undefined,
        })
      }
    } else if (isSubItem && currentProduct) {
      // 하위 품목 추가
      currentProduct.items.push({
        partNumber: itemNo || undefined,
        description: itemSpec || itemName || undefined,
        quantity: itemQty || 1,
        unitPrice: salesUnitPrice || undefined,
        totalPrice: salesTotalPrice || undefined,
      })

      // items에도 추가
      items.push({
        partNumber: itemNo || undefined,
        description: itemSpec || itemName || undefined,
        quantity: itemQty || 1,
        unitPrice: salesUnitPrice || undefined,
        totalPrice: salesTotalPrice || undefined,
      })

      // 하위 품목별 매입 정보
      if (purchaseVendor || purchaseUnitPrice > 0 || purchaseTotalPrice > 0) {
        purchaseItems.push({
          partNumber: itemNo || undefined,
          description: itemSpec || itemName || undefined,
          quantity: itemQty || 1,
          unitPrice: purchaseUnitPrice || undefined,
          totalPrice: purchaseTotalPrice || undefined,
          vendorCompany: purchaseVendor || undefined,
        })
      }
    } else if (itemName || salesTotalPrice > 0) {
      // 일반 품목 (제품 구조 없이 단순 품목)
      items.push({
        partNumber: itemNo || undefined,
        description: itemSpec ? `${itemName}\n${itemSpec}` : itemName || undefined,
        quantity: itemQty || 1,
        unitPrice: salesUnitPrice || undefined,
        totalPrice: salesTotalPrice || undefined,
      })

      if (purchaseVendor || purchaseUnitPrice > 0 || purchaseTotalPrice > 0) {
        purchaseItems.push({
          partNumber: itemNo || undefined,
          description: itemSpec ? `${itemName}\n${itemSpec}` : itemName || undefined,
          quantity: itemQty || 1,
          unitPrice: purchaseUnitPrice || undefined,
          totalPrice: purchaseTotalPrice || undefined,
          vendorCompany: purchaseVendor || undefined,
        })
      }
    }

    row++
  }

  // 마지막 제품 저장
  if (currentProduct) {
    products.push(currentProduct)
  }

  // 합계 계산
  const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
  const purchaseTotal = purchaseItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)

  return {
    items,
    purchaseItems,
    products,
    totalAmount,
    purchaseTotal,
  }
}

// Prisma 클라이언트 타입 (느슨한 타입으로 호환성 확보)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientLike = { excelTemplate: any }

// DB에서 템플릿을 조회하고 파싱하는 래퍼 함수
export async function parseWithTemplateId(
  buffer: Buffer,
  templateId: string,
  prisma: PrismaClientLike
): Promise<ParsedDocument> {
  const template = await prisma.excelTemplate.findUnique({
    where: { id: templateId },
  })

  if (!template) {
    throw new Error(`템플릿을 찾을 수 없습니다: ${templateId}`)
  }

  // JSON 필드 파싱 (Prisma에서는 JsonValue로 반환됨)
  const config: ExcelTemplateConfig = {
    id: template.id,
    name: template.name,
    docType: template.docType,
    fieldMappings: (template.fieldMappings || {}) as Record<string, string>,
    itemTableHeaderRow: template.itemTableHeaderRow,
    itemTableStartRow: template.itemTableStartRow,
    itemTableEndRow: template.itemTableEndRow,
    salesColumnMappings: (template.salesColumnMappings || {}) as Record<string, string>,
    purchaseColumnMappings: (template.purchaseColumnMappings || {}) as Record<string, string>,
    mainItemDetection: template.mainItemDetection,
    subItemDetection: template.subItemDetection,
    totalRowDetection: template.totalRowDetection,
  }

  return parseWithTemplate(buffer, config)
}

// 문서 타입에 맞는 기본 템플릿으로 파싱
export async function parseWithDefaultTemplate(
  buffer: Buffer,
  docType: DocType,
  prisma: PrismaClientLike
): Promise<ParsedDocument | null> {
  const template = await prisma.excelTemplate.findFirst({
    where: {
      docType,
      isDefault: true,
      isActive: true,
    },
  })

  if (!template) {
    return null // 기본 템플릿이 없으면 null 반환 (기존 파서 사용하도록)
  }

  // JSON 필드 파싱 (Prisma에서는 JsonValue로 반환됨)
  const config: ExcelTemplateConfig = {
    id: template.id,
    name: template.name,
    docType: template.docType,
    fieldMappings: (template.fieldMappings || {}) as Record<string, string>,
    itemTableHeaderRow: template.itemTableHeaderRow,
    itemTableStartRow: template.itemTableStartRow,
    itemTableEndRow: template.itemTableEndRow,
    salesColumnMappings: (template.salesColumnMappings || {}) as Record<string, string>,
    purchaseColumnMappings: (template.purchaseColumnMappings || {}) as Record<string, string>,
    mainItemDetection: template.mainItemDetection,
    subItemDetection: template.subItemDetection,
    totalRowDetection: template.totalRowDetection,
  }

  return parseWithTemplate(buffer, config)
}
