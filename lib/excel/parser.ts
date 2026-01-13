import * as ExcelJS from 'exceljs'

export type DocType = 'SALES_QUOTE' | 'SALES_APPROVAL' | 'SALES_ORDER' | 'MA_QUOTE' | 'MA_APPROVAL'

export interface ParsedDocument {
  // 공통 필드
  clientCompany?: string
  clientContact?: string
  clientPhone?: string
  clientFax?: string
  clientMobile?: string // CP (휴대폰)
  clientEmail?: string
  vendorCompany?: string
  vendorContact?: string
  vendorPhone?: string
  vendorEmail?: string
  projectName?: string
  managerName?: string // 견적 담당
  managerPhone?: string // 담당자 연락처
  quoteDate?: Date
  deliveryDate?: Date
  validUntil?: string
  paymentTerms?: string
  notes?: string
  items: ParsedItem[]
  totalAmount?: number
  vatAmount?: number
  totalWithVat?: number

  // 품의서 전용 필드
  approvalCode?: string // 품의 코드 (D251202-01)
  approvalDate?: Date // 품의 일자
  approvalManager?: string // 품의 담당
  endUser?: string // End User
  modelType?: string // M/T
  serialNumber?: string // S/N
  invoiceDate?: Date // 계산서 발행일
  invoiceEmail?: string // 계산서 메일
  paymentDate?: string // 결제일
  deliveryAddress?: string // 배송주소
  receiverName?: string // 받으실분
  receiverPhone?: string // 연락처

  // 매입 정보 (품의서)
  purchaseItems?: ParsedPurchaseItem[]
  purchaseTotal?: number
  purchaseVat?: number
  purchaseTotalWithVat?: number

  // MA 견적서 전용
  maItems?: ParsedMAItem[]
  serviceTerms?: string // 서비스기간 조건
  contractTerms?: string // 계약 조건
  specialTerms?: string // 특약사항
}

export interface ParsedItem {
  partNumber?: string
  description?: string
  quantity: number
  srpPrice?: number
  unitPrice?: number
  totalPrice?: number
  purchasePrice?: number // 매입가 (품의서)
}

export interface ParsedPurchaseItem {
  partNumber?: string
  description?: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
  purchaseDate?: Date
  vendorCompany?: string
}

export interface ParsedMAItem {
  productName?: string // 기기명 (SR250)
  modelType?: string // M/T (7Y51)
  model?: string // Model (CTO1WW)
  serialNumber?: string // S/N
  serviceLevel?: string // 서비스 레벨 (Essential - Post Wty 24x7 4Hr Response)
  period?: string // 기간 (1년)
  startDate?: Date // 서비스개시일
  endDate?: Date // 서비스종료일
  totalPrice?: number // 계약기간 총계
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
  if (value && typeof value === 'object' && 'result' in value) {
    return typeof value.result === 'number' ? value.result : 0
  }
  return 0
}

function getDateValue(sheet: ExcelJS.Worksheet, address: string): Date | undefined {
  const cell = sheet.getCell(address)
  const value = cell.value

  // Date 객체인 경우
  if (value instanceof Date) return value

  // 숫자인 경우 (Excel serial date)
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
    return date
  }

  // 문자열로 변환해서 파싱 시도
  let dateStr = ''
  if (typeof value === 'string') {
    dateStr = value.trim()
  } else if (value && typeof value === 'object') {
    // richText 처리
    if ('richText' in value && Array.isArray(value.richText)) {
      dateStr = value.richText.map((r: { text: string }) => r.text).join('').trim()
    } else if ('text' in value && value.text) {
      dateStr = String(value.text).trim()
    }
  }

  if (!dateStr) return undefined

  // 다양한 날짜 형식 파싱 시도
  // 2026.01.09, 2026-01-09, 2026/01/09
  const patterns = [
    /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/, // 2026.01.09
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // 2026-01-09
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // 2026/01/09
  ]

  for (const pattern of patterns) {
    const match = dateStr.match(pattern)
    if (match) {
      const [, year, month, day] = match
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime())) return date
    }
  }

  // 일반 Date 파싱 시도
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? undefined : parsed
}

// ==================== Sales 견적서 파싱 ====================
function parseSalesQuote(sheet: ExcelJS.Worksheet): ParsedDocument {
  // 고객 정보 파싱 - 셀 값 그대로 읽기, "귀중" 접미사만 제거
  const clientCompany = getCellValue(sheet, 'C6').replace(/\s*귀중$/, '') || undefined
  const clientContact = getCellValue(sheet, 'C7') || undefined
  const clientPhone = getCellValue(sheet, 'C8') || undefined
  const clientFax = getCellValue(sheet, 'C9') || undefined
  const clientMobile = getCellValue(sheet, 'C10') || undefined // CP (휴대폰)
  const clientEmail = getCellValue(sheet, 'C11') || undefined

  // 날짜/조건 정보
  const quoteDate = getDateValue(sheet, 'C14')
  const deliveryDate = getDateValue(sheet, 'C15')
  const validUntil = getCellValue(sheet, 'C16') || undefined
  const paymentTerms = getCellValue(sheet, 'C17') || undefined
  const managerName = getCellValue(sheet, 'C18') || undefined // 견적 담당
  const projectName = getCellValue(sheet, 'C19') || undefined

  // 품목 파싱 (R23부터 데이터)
  const items: ParsedItem[] = []
  let row = 23

  while (row < 100) {
    const partNumber = getCellValue(sheet, `B${row}`)
    const description = getCellValue(sheet, `C${row}`)
    const quantity = getNumericValue(sheet, `D${row}`)
    const srpPrice = getNumericValue(sheet, `E${row}`)
    const unitPrice = getNumericValue(sheet, `F${row}`)
    const totalPrice = getNumericValue(sheet, `G${row}`)

    // 합계 행 확인
    if (partNumber.includes('제안금액') || partNumber.includes('합계')) {
      break
    }

    // 빈 행 확인 - 모든 값이 비어있으면 중단
    if (!partNumber && !description && quantity === 0 && totalPrice === 0) {
      break
    }

    // 실제 데이터가 있는 행만 추가
    if (description || totalPrice > 0) {
      items.push({
        partNumber: partNumber || undefined,
        description: description || undefined,
        quantity: quantity || 1,
        srpPrice: srpPrice || undefined,
        unitPrice: unitPrice || undefined,
        totalPrice: totalPrice || undefined,
      })
    }

    row++
  }

  // 합계 금액 파싱
  const totalAmount = getNumericValue(sheet, 'E28') || getNumericValue(sheet, 'G28')
  const totalWithVat = getNumericValue(sheet, 'E29') || getNumericValue(sheet, 'G29')
  const vatAmount = totalWithVat - totalAmount

  // 기타사항
  const notes = getCellValue(sheet, 'B31') || undefined

  return {
    clientCompany,
    clientContact,
    clientPhone,
    clientFax,
    clientMobile,
    clientEmail,
    projectName,
    managerName,
    quoteDate,
    deliveryDate,
    validUntil,
    paymentTerms,
    notes,
    items,
    totalAmount,
    vatAmount,
    totalWithVat,
  }
}

// ==================== Sales 품의서 파싱 ====================
function parseSalesApproval(sheet: ExcelJS.Worksheet): ParsedDocument {
  // 기본 정보
  const approvalCode = getCellValue(sheet, 'D9').replace(/^\[.*\].*$/, '').trim()
  const approvalDate = getDateValue(sheet, 'D10')
  const approvalManager = getCellValue(sheet, 'D11')

  // 매출처 정보
  const clientInfo = getCellValue(sheet, 'D13') // "견적 나간 회사 / 해당 담당자 / 담당자 연락처"
  const clientParts = clientInfo.split('/').map(s => s.trim())
  const clientCompany = clientParts[0]?.replace(/^\[.*\].*$/, '') || undefined
  const clientContact = clientParts[1] || undefined
  const clientPhone = clientParts[2] || undefined

  const endUser = getCellValue(sheet, 'D14').replace(/^\[.*\].*$/, '')
  const modelTypeSerial = getCellValue(sheet, 'D15') // "M/T / S/N"

  // 매출 품목 파싱 (R16이 헤더, R17부터 데이터)
  const items: ParsedItem[] = []
  const purchaseItems: ParsedPurchaseItem[] = []
  let row = 17

  while (row < 50) {
    const partNumber = getCellValue(sheet, `C${row}`)
    const description = getCellValue(sheet, `D${row}`)
    const quantity = getNumericValue(sheet, `E${row}`)
    const unitPrice = getNumericValue(sheet, `F${row}`)
    const totalPrice = getNumericValue(sheet, `G${row}`)

    // 합계 행 확인
    if (partNumber.includes('합계') || getCellValue(sheet, `C${row}`).includes('합계')) {
      break
    }

    // 빈 행 확인
    if (!partNumber && !description && quantity === 0) {
      break
    }

    // 매출 품목
    if (description || quantity > 0 || totalPrice > 0) {
      const cleanPartNumber = partNumber.replace(/^\[품목명\]\s*/, '').replace(/^예시_/, '')
      items.push({
        partNumber: cleanPartNumber || undefined,
        description: description?.replace(/^\[제품명\]$/, '') || undefined,
        quantity: quantity || 1,
        unitPrice: unitPrice || undefined,
        totalPrice: totalPrice || undefined,
      })

      // 매입 품목 (같은 행의 I~L열)
      const purchaseDate = getDateValue(sheet, `H${row}`)
      const vendorCompany = getCellValue(sheet, `I${row}`)
      const purchaseQty = getNumericValue(sheet, `J${row}`)
      const purchaseUnitPrice = getNumericValue(sheet, `K${row}`)
      const purchaseTotalPrice = getNumericValue(sheet, `L${row}`)

      if (vendorCompany || purchaseTotalPrice > 0) {
        purchaseItems.push({
          partNumber: cleanPartNumber || undefined,
          description: description || undefined,
          quantity: purchaseQty || quantity || 1,
          unitPrice: purchaseUnitPrice || undefined,
          totalPrice: purchaseTotalPrice || undefined,
          purchaseDate,
          vendorCompany: vendorCompany || undefined,
        })
      }
    }

    row++
  }

  // 합계 금액
  const totalAmount = getNumericValue(sheet, 'G22') || getNumericValue(sheet, 'F22')
  const purchaseTotal = getNumericValue(sheet, 'L22')
  const purchaseTotalWithVat = getNumericValue(sheet, 'L23')

  // 기타 정보
  const notes = getCellValue(sheet, 'D24').replace(/^예시_/, '')
  const invoiceDate = getCellValue(sheet, 'D25')
  const invoiceEmail = getCellValue(sheet, 'D26').replace(/^\[.*\]$/, '')
  const paymentDate = getCellValue(sheet, 'D27').replace(/^\[.*\].*$/, '')
  const deliveryAddress = getCellValue(sheet, 'D29').replace(/^\[.*\].*$/, '')
  const receiverInfo = getCellValue(sheet, 'D30')
  const deliveryDateStr = getCellValue(sheet, 'D31')

  return {
    approvalCode: approvalCode || undefined,
    approvalDate,
    approvalManager: approvalManager || undefined,
    clientCompany,
    clientContact,
    clientPhone,
    endUser: endUser || undefined,
    modelType: modelTypeSerial || undefined,
    items,
    purchaseItems,
    totalAmount,
    purchaseTotal,
    purchaseTotalWithVat,
    notes: notes || undefined,
    invoiceEmail: invoiceEmail || undefined,
    paymentTerms: paymentDate || undefined,
    deliveryAddress: deliveryAddress || undefined,
    receiverName: receiverInfo?.split('/')[0]?.trim() || undefined,
    receiverPhone: receiverInfo?.split('/')[1]?.trim() || undefined,
    deliveryDate: deliveryDateStr ? new Date(deliveryDateStr) : undefined,
  }
}

// ==================== Sales 발주서 파싱 ====================
function parseSalesOrder(sheet: ExcelJS.Worksheet): ParsedDocument {
  // 매입처 정보
  // B6: 매입처명 (예: "ABC회사 귀중")
  // C7~C9: 담당자, 연락처, 이메일
  let vendorCompany = getCellValue(sheet, 'B6')
  if (vendorCompany.endsWith('귀중')) {
    vendorCompany = vendorCompany.replace(/\s*귀중$/, '').replace(/^\[.*\]$/, '')
  }
  const vendorContact = getCellValue(sheet, 'C7').replace(/^\[.*\]$/, '')
  const vendorPhone = getCellValue(sheet, 'C8').replace(/^\[.*\]$/, '')
  const vendorEmail = getCellValue(sheet, 'C9').replace(/^\[.*\]$/, '')

  // 발주 정보
  const orderDate = getDateValue(sheet, 'F7') || getDateValue(sheet, 'G7')
  const deliveryAddress = getCellValue(sheet, 'F8') || getCellValue(sheet, 'G8')
  const orderManagerRaw = getCellValue(sheet, 'F9') || getCellValue(sheet, 'G9')
  const paymentTerms = getCellValue(sheet, 'F10') || getCellValue(sheet, 'G10')

  // 담당자 정보 파싱: "김대훈(010-2994-4720)" -> 이름과 전화번호 분리
  let orderManagerName: string | undefined
  let orderManagerPhone: string | undefined
  if (orderManagerRaw) {
    const managerMatch = orderManagerRaw.match(/^(.+?)\(([^)]+)\)$/)
    if (managerMatch) {
      orderManagerName = managerMatch[1].trim()
      orderManagerPhone = managerMatch[2].trim()
    } else {
      orderManagerName = orderManagerRaw
    }
  }

  // 품목 파싱 (R15가 헤더, R16부터 데이터)
  const items: ParsedItem[] = []
  let row = 16

  while (row < 50) {
    const partNumber = getCellValue(sheet, `B${row}`)
    const description = getCellValue(sheet, `C${row}`)
    const quantity = getNumericValue(sheet, `D${row}`)
    const srpPrice = getNumericValue(sheet, `E${row}`)
    const unitPrice = getNumericValue(sheet, `F${row}`)
    const totalPrice = getNumericValue(sheet, `G${row}`)

    // 합계 행 확인
    if (partNumber.includes('합') && partNumber.includes('계')) {
      break
    }

    // 품목 데이터가 있는 경우만 추가 (설명이 있거나 가격이 있는 경우)
    if (description || totalPrice > 0) {
      const cleanPartNumber = partNumber.replace(/^\[품목명\]\s*/, '').replace(/^예시_/, '')
      // 발주서는 설명이 여러 줄로 나뉘어 있음 - 첫 줄만 취급하거나 합치기
      const cleanDescription = description.replace(/^'/, '').trim()

      if (cleanDescription || totalPrice > 0) {
        items.push({
          partNumber: cleanPartNumber || undefined,
          description: cleanDescription || undefined,
          quantity: quantity || 1,
          srpPrice: srpPrice || undefined,
          unitPrice: unitPrice || undefined,
          totalPrice: totalPrice || undefined,
        })
      }
    }

    row++
  }

  // 합계 금액
  const totalAmount = getNumericValue(sheet, 'G29') || getNumericValue(sheet, 'F29')
  const vatAmount = getNumericValue(sheet, 'G30') || getNumericValue(sheet, 'F30')
  const totalWithVat = getNumericValue(sheet, 'G31') || getNumericValue(sheet, 'F31')

  // 비고
  const notes = getCellValue(sheet, 'B34')

  return {
    vendorCompany: vendorCompany || undefined,
    vendorContact: vendorContact || undefined,
    vendorPhone: vendorPhone || undefined,
    vendorEmail: vendorEmail || undefined,
    quoteDate: orderDate,
    deliveryAddress: deliveryAddress?.replace(/^예시_/, '') || undefined,
    approvalManager: orderManagerName || undefined,
    managerPhone: orderManagerPhone || undefined,
    paymentTerms: paymentTerms || undefined,
    items,
    totalAmount,
    vatAmount,
    totalWithVat,
    notes: notes || undefined,
  }
}

// ==================== MA 견적서 파싱 ====================
function parseMAQuote(sheet: ExcelJS.Worksheet): ParsedDocument {
  // 수신/참조/발신 정보
  const clientCompany = getCellValue(sheet, 'B4').replace(/^\[.*\]$/, '')
  const clientContact = getCellValue(sheet, 'B5').replace(/^\[.*\]$/, '')
  const senderInfo = getCellValue(sheet, 'B6') // 발신자 정보
  const approvalManager = getCellValue(sheet, 'C6') // 담당자명
  const quoteDate = getDateValue(sheet, 'I6')

  // 고객명
  const customerName = getCellValue(sheet, 'D16').replace(/^\[.*\]$/, '')

  // MA 품목 파싱 (R18이 헤더, R19부터 데이터)
  const maItems: ParsedMAItem[] = []
  let row = 19

  while (row < 50) {
    const productName = getCellValue(sheet, `A${row}`)
    const modelType = getCellValue(sheet, `B${row}`)
    const model = getCellValue(sheet, `C${row}`)
    const serialNumber = getCellValue(sheet, `D${row}`)
    const serviceLevel = getCellValue(sheet, `E${row}`)
    const period = getCellValue(sheet, `F${row}`)
    const startDate = getDateValue(sheet, `G${row}`)
    const endDate = getDateValue(sheet, `H${row}`)
    const totalPrice = getNumericValue(sheet, `I${row}`)

    // 합계 행 확인
    if (productName.includes('합계') || productName.includes('유지정비료')) {
      break
    }

    // 빈 행 확인
    if (!productName && !modelType && !serialNumber) {
      break
    }

    if (productName || serialNumber || totalPrice > 0) {
      maItems.push({
        productName: productName?.replace(/^ex\)/, '') || undefined,
        modelType: modelType?.replace(/^모델타입.*$/, '') || undefined,
        model: model?.replace(/^모델명.*$/, '') || undefined,
        serialNumber: serialNumber || undefined,
        serviceLevel: serviceLevel || undefined,
        period: period || undefined,
        startDate,
        endDate,
        totalPrice: totalPrice || undefined,
      })
    }

    row++
  }

  // 합계 금액
  const monthlyAmount = getNumericValue(sheet, 'I21')
  const totalAmount = getNumericValue(sheet, 'I22')

  // 조건들
  const serviceTerms = getCellValue(sheet, 'A25') // 24 * 7 * 365 * 4
  const validUntil = getCellValue(sheet, 'C29') // 15일
  const paymentTerms = getCellValue(sheet, 'A31')
  const specialTerms = getCellValue(sheet, 'A33')

  return {
    clientCompany: clientCompany || customerName || undefined,
    clientContact: clientContact || undefined,
    approvalManager: approvalManager || undefined,
    quoteDate,
    maItems,
    totalAmount,
    serviceTerms: serviceTerms || undefined,
    validUntil: validUntil || undefined,
    paymentTerms: paymentTerms || undefined,
    specialTerms: specialTerms || undefined,
    items: [], // MA는 maItems 사용
  }
}

// ==================== MA 품의서 파싱 ====================
function parseMAApproval(sheet: ExcelJS.Worksheet): ParsedDocument {
  // 기본 정보
  const approvalDate = getDateValue(sheet, 'E6')
  const approvalManager = getCellValue(sheet, 'E7')

  // 품목 정보 (R11이 헤더, R12부터 데이터)
  const items: ParsedItem[] = []
  const purchaseItems: ParsedPurchaseItem[] = []
  let row = 12

  while (row < 30) {
    const smCode = getCellValue(sheet, `D${row}`)
    const vendorCode = getCellValue(sheet, `E${row}`)
    const customerName = getCellValue(sheet, `F${row}`)
    const clientCompany = getCellValue(sheet, `G${row}`)
    const salesPrice = getNumericValue(sheet, `H${row}`)
    const quantity = getNumericValue(sheet, `I${row}`)
    const billingType = getCellValue(sheet, `J${row}`) // 일시불/월간
    const startDate = getDateValue(sheet, `K${row}`)
    const endDate = getDateValue(sheet, `L${row}`)
    const purchaseCompany = getCellValue(sheet, `M${row}`)
    const purchasePrice = getNumericValue(sheet, `N${row}`)
    const purchaseBillingType = getCellValue(sheet, `O${row}`)
    const gpAmount = getNumericValue(sheet, `R${row}`)
    const gpRate = getNumericValue(sheet, `S${row}`)

    // 빈 행 확인
    if (!customerName && !clientCompany && salesPrice === 0) {
      break
    }

    if (customerName || salesPrice > 0) {
      items.push({
        partNumber: smCode || undefined,
        description: customerName?.replace(/^\[.*\]$/, '') || undefined,
        quantity: quantity || 1,
        unitPrice: salesPrice || undefined,
        totalPrice: salesPrice || undefined,
      })

      if (purchaseCompany || purchasePrice > 0) {
        purchaseItems.push({
          partNumber: vendorCode || undefined,
          description: customerName || undefined,
          quantity: quantity || 1,
          unitPrice: purchasePrice || undefined,
          totalPrice: purchasePrice || undefined,
          vendorCompany: purchaseCompany?.replace(/^\[.*\]$/, '') || undefined,
        })
      }
    }

    row++
  }

  // 상세내용 시트가 있으면 추가 파싱
  // (시트 이름이 "상세내용_예시"인 경우)

  return {
    approvalDate,
    approvalManager: approvalManager || undefined,
    items,
    purchaseItems,
    totalAmount: items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
    purchaseTotal: purchaseItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
  }
}

// ==================== 메인 파싱 함수 ====================
export async function parseExcel(
  buffer: Buffer,
  docType: DocType
): Promise<ParsedDocument> {
  const workbook = new ExcelJS.Workbook()

  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  } catch (loadError) {
    console.error('ExcelJS 로드 오류:', loadError)
    throw new Error(`엑셀 파일을 로드할 수 없습니다: ${loadError instanceof Error ? loadError.message : '알 수 없는 오류'}`)
  }

  // 첫 번째 시트 또는 인덱스로 시트 찾기
  let sheet = workbook.getWorksheet(1)

  // 인덱스로 못 찾으면 worksheets 배열에서 첫 번째 시트 사용
  if (!sheet && workbook.worksheets.length > 0) {
    sheet = workbook.worksheets[0]
  }

  if (!sheet) {
    const sheetCount = workbook.worksheets.length
    throw new Error(`워크시트를 찾을 수 없습니다 (시트 수: ${sheetCount})`)
  }

  switch (docType) {
    case 'SALES_QUOTE':
      return parseSalesQuote(sheet)
    case 'SALES_APPROVAL':
      return parseSalesApproval(sheet)
    case 'SALES_ORDER':
      return parseSalesOrder(sheet)
    case 'MA_QUOTE':
      return parseMAQuote(sheet)
    case 'MA_APPROVAL':
      return parseMAApproval(sheet)
    default:
      throw new Error(`지원하지 않는 문서 타입: ${docType}`)
  }
}

// ==================== 문서 타입 자동 감지 ====================
export async function detectDocType(buffer: Buffer): Promise<DocType | null> {
  const workbook = new ExcelJS.Workbook()

  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  } catch {
    return null
  }

  // 첫 번째 시트 또는 인덱스로 시트 찾기
  let sheet = workbook.getWorksheet(1)
  if (!sheet && workbook.worksheets.length > 0) {
    sheet = workbook.worksheets[0]
  }
  if (!sheet) return null

  const sheetName = sheet.name.toLowerCase()

  // 시트 이름으로 판단
  if (sheetName.includes('유지보수') && sheetName.includes('품의')) {
    return 'MA_APPROVAL'
  }
  if (sheetName.includes('sales') || sheetName === 'sales') {
    return 'SALES_APPROVAL'
  }
  if (sheetName.includes('발주')) {
    return 'SALES_ORDER'
  }

  // 내용으로 판단
  const cell1 = getCellValue(sheet, 'B1')
  const cell2 = getCellValue(sheet, 'A2')
  const cell5 = getCellValue(sheet, 'C5')

  if (cell1.includes('Quotation') || cell1.includes('견적')) {
    return 'SALES_QUOTE'
  }
  if (cell2.includes('유지정비') || cell2.includes('시스템 유지정비')) {
    return 'MA_QUOTE'
  }
  if (cell5.includes('SALES') && cell5.includes('품의')) {
    return 'SALES_APPROVAL'
  }

  // 특정 셀 패턴으로 추가 판단
  const b4 = getCellValue(sheet, 'B4')
  if (b4.includes('발') && b4.includes('주') && b4.includes('서')) {
    return 'SALES_ORDER'
  }

  // 기본값
  if (sheetName.includes('견적')) {
    return 'SALES_QUOTE'
  }

  return null
}
