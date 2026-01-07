import * as ExcelJS from 'exceljs'
import * as path from 'path'
import * as fs from 'fs/promises'
import { DocType } from '@prisma/client'

// 템플릿 파일 경로
const TEMPLATE_DIR = path.join(process.cwd(), 'templates')

const TEMPLATE_MAP: Record<DocType, string> = {
  SALES_QUOTE: 'sales-quote.xlsx',
  SALES_APPROVAL: 'sales-approval.xlsx',
  SALES_ORDER: 'sales-order.xlsx',
  MA_QUOTE: 'ma-quote.xlsx',
  MA_APPROVAL: 'ma-approval.xlsx',
}

// 공통 문서 데이터 인터페이스
export interface DocumentData {
  docNumber: string
  // 고객(매출처) 정보
  clientCompany?: string
  clientContact?: string
  clientPhone?: string
  clientFax?: string
  clientEmail?: string
  // 공급사(매입처) 정보
  vendorCompany?: string
  vendorContact?: string
  vendorPhone?: string
  vendorEmail?: string
  // 기본 정보
  projectName?: string
  quoteDate?: Date
  deliveryDate?: Date
  validUntil?: string
  paymentTerms?: string
  notes?: string
  // 담당자
  managerName?: string
  managerPhone?: string
  // 품목
  items: DocumentItem[]
  // 금액
  totalAmount?: number
  vatAmount?: number
  totalWithVat?: number
  // 품의서 전용
  approvalCode?: string
  endUser?: string
  invoiceEmail?: string
  deliveryAddress?: string
  receiverName?: string
  receiverPhone?: string
  // 매입 정보
  purchaseItems?: PurchaseItem[]
  purchaseTotal?: number
  // MA 전용
  maItems?: MAItem[]
  serviceTerms?: string
  specialTerms?: string
}

export interface DocumentItem {
  partNumber?: string
  description?: string
  quantity: number
  srpPrice?: number
  unitPrice?: number
  totalPrice?: number
}

export interface PurchaseItem {
  partNumber?: string
  description?: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
  purchaseDate?: Date
  vendorCompany?: string
}

export interface MAItem {
  productName?: string
  modelType?: string
  model?: string
  serialNumber?: string
  serviceLevel?: string
  period?: string
  startDate?: Date
  endDate?: Date
  totalPrice?: number
}

// 날짜 포맷팅 헬퍼
function formatDate(date?: Date): string {
  if (!date) return ''
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 금액 포맷팅 헬퍼
function formatCurrency(amount?: number): string {
  if (!amount) return ''
  return new Intl.NumberFormat('ko-KR').format(amount)
}

// ==================== Sales 견적서 생성 ====================
export async function generateSalesQuote(data: DocumentData): Promise<Buffer> {
  const templatePath = path.join(TEMPLATE_DIR, TEMPLATE_MAP.SALES_QUOTE)

  const workbook = new ExcelJS.Workbook()

  try {
    await fs.access(templatePath)
    await workbook.xlsx.readFile(templatePath)
  } catch {
    // 템플릿 없으면 기본 생성
    return generateSalesQuoteBasic(data)
  }

  const sheet = workbook.getWorksheet('견적서') || workbook.getWorksheet(1)
  if (!sheet) throw new Error('워크시트를 찾을 수 없습니다')

  // 고객 정보 채우기
  sheet.getCell('C6').value = data.clientCompany ? `${data.clientCompany} 귀중` : ''
  sheet.getCell('C7').value = data.clientContact || ''
  sheet.getCell('C8').value = data.clientPhone || ''
  sheet.getCell('C9').value = data.clientFax || ''
  sheet.getCell('C11').value = data.clientEmail || ''

  // 날짜/조건 정보
  sheet.getCell('C14').value = data.quoteDate || ''
  sheet.getCell('C15').value = data.deliveryDate || ''
  sheet.getCell('C16').value = data.validUntil || ''
  sheet.getCell('C17').value = data.paymentTerms || ''
  sheet.getCell('C18').value = data.managerName
    ? `${data.managerName}(${data.managerPhone || ''})`
    : ''
  sheet.getCell('C19').value = data.projectName || ''

  // 품목 채우기 (R23부터 시작)
  const startRow = 23
  let totalSum = 0

  // 기존 품목 행 삭제 (예시 데이터)
  // 템플릿에서 품목 영역을 찾아 정리
  for (let i = 0; i < 5; i++) {
    const row = startRow + i
    sheet.getCell(`B${row}`).value = ''
    sheet.getCell(`C${row}`).value = ''
    sheet.getCell(`D${row}`).value = ''
    sheet.getCell(`E${row}`).value = ''
    sheet.getCell(`F${row}`).value = ''
    sheet.getCell(`G${row}`).value = ''
  }

  // 새 품목 입력
  data.items.forEach((item, index) => {
    const row = startRow + index

    sheet.getCell(`B${row}`).value = item.partNumber || ''
    sheet.getCell(`C${row}`).value = item.description || ''
    sheet.getCell(`D${row}`).value = item.quantity || 1
    sheet.getCell(`E${row}`).value = item.srpPrice || ''
    sheet.getCell(`F${row}`).value = item.unitPrice || ''

    const itemTotal = item.totalPrice || item.quantity * (item.unitPrice || 0)
    sheet.getCell(`G${row}`).value = itemTotal
    totalSum += itemTotal
  })

  // 합계 업데이트
  const sumRowBase = 28 // 템플릿의 합계 행 위치
  sheet.getCell(`E${sumRowBase}`).value = data.totalAmount || totalSum
  sheet.getCell(`F${sumRowBase}`).value = data.totalAmount || totalSum
  sheet.getCell(`G${sumRowBase}`).value = data.totalAmount || totalSum

  const vatTotal = data.totalWithVat || Math.round((data.totalAmount || totalSum) * 1.1)
  sheet.getCell(`E${sumRowBase + 1}`).value = vatTotal
  sheet.getCell(`F${sumRowBase + 1}`).value = vatTotal
  sheet.getCell(`G${sumRowBase + 1}`).value = vatTotal

  // 기타사항
  sheet.getCell('B31').value = data.notes || ''

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// 템플릿 없을 때 기본 견적서 생성
async function generateSalesQuoteBasic(data: DocumentData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('견적서')

  // 헤더
  sheet.mergeCells('B1:G3')
  sheet.getCell('B1').value = 'Quotation'
  sheet.getCell('B1').font = { size: 22, bold: true }
  sheet.getCell('B1').alignment = { horizontal: 'center', vertical: 'middle' }

  // 고객 정보
  const labels = ['회  사', '참  조', '전  화', 'F a x', 'C    P', 'E-mail']
  const values = [
    data.clientCompany ? `${data.clientCompany} 귀중` : '',
    data.clientContact || '',
    data.clientPhone || '',
    data.clientFax || '',
    '',
    data.clientEmail || '',
  ]

  labels.forEach((label, i) => {
    sheet.getCell(`B${6 + i}`).value = label
    sheet.getCell(`C${6 + i}`).value = values[i]
  })

  // 견적 조건
  sheet.getCell('B14').value = '견 적 일'
  sheet.getCell('C14').value = formatDate(data.quoteDate)
  sheet.getCell('B15').value = '납 기 일'
  sheet.getCell('C15').value = formatDate(data.deliveryDate)
  sheet.getCell('B16').value = '유효기간'
  sheet.getCell('C16').value = data.validUntil || ''
  sheet.getCell('B17').value = '결제조건'
  sheet.getCell('C17').value = data.paymentTerms || ''
  sheet.getCell('B18').value = '견적담당'
  sheet.getCell('C18').value = data.managerName || ''
  sheet.getCell('B19').value = '프로젝트명'
  sheet.getCell('C19').value = data.projectName || ''

  // 품목 테이블 헤더
  const headerRow = 21
  const headers = ['P/N', 'Description', "Q'ty", 'SRP', 'Price', 'Sum']
  headers.forEach((header, index) => {
    const cell = sheet.getCell(headerRow, 2 + index)
    cell.value = header
    cell.font = { bold: true }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }
    cell.border = {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  // 품목 데이터
  let totalSum = 0
  data.items.forEach((item, index) => {
    const row = headerRow + 2 + index
    sheet.getCell(`B${row}`).value = item.partNumber || ''
    sheet.getCell(`C${row}`).value = item.description || ''
    sheet.getCell(`D${row}`).value = item.quantity || 1
    sheet.getCell(`E${row}`).value = item.srpPrice || ''
    sheet.getCell(`F${row}`).value = item.unitPrice || ''
    const itemTotal = item.totalPrice || item.quantity * (item.unitPrice || 0)
    sheet.getCell(`G${row}`).value = itemTotal
    totalSum += itemTotal
  })

  // 합계
  const sumRow = headerRow + 2 + data.items.length + 1
  sheet.mergeCells(`B${sumRow}:D${sumRow}`)
  sheet.getCell(`B${sumRow}`).value = '제안금액(VAT별도)'
  sheet.getCell(`E${sumRow}`).value = data.totalAmount || totalSum
  sheet.mergeCells(`B${sumRow + 1}:D${sumRow + 1}`)
  sheet.getCell(`B${sumRow + 1}`).value = '제안금액(VAT포함)'
  sheet.getCell(`E${sumRow + 1}`).value =
    data.totalWithVat || Math.round((data.totalAmount || totalSum) * 1.1)

  // 열 너비
  sheet.getColumn('B').width = 15
  sheet.getColumn('C').width = 50
  sheet.getColumn('D').width = 8
  sheet.getColumn('E').width = 15
  sheet.getColumn('F').width = 15
  sheet.getColumn('G').width = 15

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ==================== Sales 품의서 생성 ====================
export async function generateSalesApproval(data: DocumentData): Promise<Buffer> {
  const templatePath = path.join(TEMPLATE_DIR, TEMPLATE_MAP.SALES_APPROVAL)

  const workbook = new ExcelJS.Workbook()

  try {
    await fs.access(templatePath)
    await workbook.xlsx.readFile(templatePath)
  } catch {
    return generateSalesApprovalBasic(data)
  }

  const sheet = workbook.getWorksheet('SALES') || workbook.getWorksheet(1)
  if (!sheet) throw new Error('워크시트를 찾을 수 없습니다')

  // 기본 정보
  sheet.getCell('D9').value = data.approvalCode || data.docNumber || ''
  sheet.getCell('D10').value = data.quoteDate || new Date()
  sheet.getCell('D11').value = data.managerName || ''

  // 매출처 정보
  const clientInfo = [data.clientCompany, data.clientContact, data.clientPhone]
    .filter(Boolean)
    .join(' / ')
  sheet.getCell('D13').value = clientInfo
  sheet.getCell('D14').value = data.endUser || ''

  // 품목 채우기 (R17부터)
  const startRow = 17

  // 기존 데이터 클리어
  for (let i = 0; i < 5; i++) {
    const row = startRow + i
    ;['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach((col) => {
      sheet.getCell(`${col}${row}`).value = ''
    })
  }

  // 매출 품목 입력
  let salesTotal = 0
  let purchaseTotal = 0

  data.items.forEach((item, index) => {
    const row = startRow + index

    sheet.getCell(`C${row}`).value = item.partNumber || ''
    sheet.getCell(`D${row}`).value = item.description || ''
    sheet.getCell(`E${row}`).value = item.quantity || 1
    sheet.getCell(`F${row}`).value = item.unitPrice || ''

    const itemTotal = item.totalPrice || item.quantity * (item.unitPrice || 0)
    sheet.getCell(`G${row}`).value = itemTotal
    salesTotal += itemTotal

    // 매입 정보 (있는 경우)
    const purchaseItem = data.purchaseItems?.[index]
    if (purchaseItem) {
      sheet.getCell(`H${row}`).value = purchaseItem.purchaseDate || ''
      sheet.getCell(`I${row}`).value = purchaseItem.vendorCompany || ''
      sheet.getCell(`J${row}`).value = purchaseItem.quantity || item.quantity || 1
      sheet.getCell(`K${row}`).value = purchaseItem.unitPrice || ''
      const purchaseItemTotal =
        purchaseItem.totalPrice || purchaseItem.quantity * (purchaseItem.unitPrice || 0)
      sheet.getCell(`L${row}`).value = purchaseItemTotal
      purchaseTotal += purchaseItemTotal
    }
  })

  // 합계
  sheet.getCell('G22').value = data.totalAmount || salesTotal
  sheet.getCell('L22').value = data.purchaseTotal || purchaseTotal
  sheet.getCell('L23').value = Math.round((data.purchaseTotal || purchaseTotal) * 1.1)

  // 기타 정보
  sheet.getCell('D24').value = data.notes || ''
  sheet.getCell('D26').value = data.invoiceEmail || ''
  sheet.getCell('D27').value = data.paymentTerms || ''
  sheet.getCell('D29').value = data.deliveryAddress || ''
  sheet.getCell('D30').value =
    data.receiverName && data.receiverPhone
      ? `${data.receiverName} / ${data.receiverPhone}`
      : data.receiverName || ''
  sheet.getCell('D31').value = data.deliveryDate || ''

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

async function generateSalesApprovalBasic(data: DocumentData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('SALES')

  // 제목
  sheet.mergeCells('C5:L6')
  sheet.getCell('C5').value = 'SALES 통합 품의서'
  sheet.getCell('C5').font = { size: 18, bold: true }
  sheet.getCell('C5').alignment = { horizontal: 'center', vertical: 'middle' }

  // 기본 정보
  sheet.getCell('C9').value = '품의 코드'
  sheet.getCell('D9').value = data.approvalCode || data.docNumber || ''
  sheet.getCell('C10').value = '품의 일자'
  sheet.getCell('D10').value = formatDate(data.quoteDate)
  sheet.getCell('C11').value = '품의 담당'
  sheet.getCell('D11').value = data.managerName || ''
  sheet.getCell('C13').value = '매출처/담당/연락처'
  sheet.getCell('D13').value =
    [data.clientCompany, data.clientContact, data.clientPhone].filter(Boolean).join(' / ')

  // 품목 테이블 헤더
  const headerRow = 16
  const salesHeaders = ['P/N', '품목', '수량', '단가', '합계']
  const purchaseHeaders = ['매입일', '매입처', '수량', '단가', '합계']

  salesHeaders.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, 3 + i)
    cell.value = h
    cell.font = { bold: true }
  })

  purchaseHeaders.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, 8 + i)
    cell.value = h
    cell.font = { bold: true }
  })

  // 품목 데이터
  let salesTotal = 0
  let purchaseTotal = 0

  data.items.forEach((item, index) => {
    const row = headerRow + 1 + index

    sheet.getCell(`C${row}`).value = item.partNumber || ''
    sheet.getCell(`D${row}`).value = item.description || ''
    sheet.getCell(`E${row}`).value = item.quantity || 1
    sheet.getCell(`F${row}`).value = item.unitPrice || ''
    const itemTotal = item.totalPrice || item.quantity * (item.unitPrice || 0)
    sheet.getCell(`G${row}`).value = itemTotal
    salesTotal += itemTotal

    const purchaseItem = data.purchaseItems?.[index]
    if (purchaseItem) {
      sheet.getCell(`H${row}`).value = formatDate(purchaseItem.purchaseDate)
      sheet.getCell(`I${row}`).value = purchaseItem.vendorCompany || ''
      sheet.getCell(`J${row}`).value = purchaseItem.quantity || 1
      sheet.getCell(`K${row}`).value = purchaseItem.unitPrice || ''
      const pTotal =
        purchaseItem.totalPrice || purchaseItem.quantity * (purchaseItem.unitPrice || 0)
      sheet.getCell(`L${row}`).value = pTotal
      purchaseTotal += pTotal
    }
  })

  // 합계 행
  const sumRow = headerRow + 1 + data.items.length + 1
  sheet.mergeCells(`C${sumRow}:F${sumRow}`)
  sheet.getCell(`C${sumRow}`).value = '매출금액 합계(VAT별도)'
  sheet.getCell(`G${sumRow}`).value = data.totalAmount || salesTotal
  sheet.mergeCells(`H${sumRow}:K${sumRow}`)
  sheet.getCell(`H${sumRow}`).value = '매입금액 합계(VAT별도)'
  sheet.getCell(`L${sumRow}`).value = data.purchaseTotal || purchaseTotal

  // 열 너비
  sheet.getColumn('C').width = 12
  sheet.getColumn('D').width = 40
  sheet.getColumn('E').width = 8
  sheet.getColumn('F').width = 12
  sheet.getColumn('G').width = 12
  sheet.getColumn('H').width = 12
  sheet.getColumn('I').width = 15
  sheet.getColumn('J').width = 8
  sheet.getColumn('K').width = 12
  sheet.getColumn('L').width = 12

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ==================== Sales 발주서 생성 ====================
export async function generateSalesOrder(data: DocumentData): Promise<Buffer> {
  const templatePath = path.join(TEMPLATE_DIR, TEMPLATE_MAP.SALES_ORDER)

  const workbook = new ExcelJS.Workbook()

  try {
    await fs.access(templatePath)
    await workbook.xlsx.readFile(templatePath)
  } catch {
    return generateSalesOrderBasic(data)
  }

  const sheet = workbook.getWorksheet('발주서') || workbook.getWorksheet(1)
  if (!sheet) throw new Error('워크시트를 찾을 수 없습니다')

  // 매입처 정보
  sheet.getCell('B6').value = data.vendorCompany ? `${data.vendorCompany} 귀중` : ''
  sheet.getCell('B7').value = data.vendorContact || ''
  sheet.getCell('B8').value = data.vendorPhone || ''
  sheet.getCell('B9').value = data.vendorEmail || ''

  // 발주 정보
  sheet.getCell('F7').value = data.quoteDate || new Date()
  sheet.getCell('F8').value = data.deliveryAddress || ''
  sheet.getCell('F9').value = data.managerName
    ? `${data.managerName}(${data.managerPhone || ''})`
    : ''
  sheet.getCell('F10').value = data.paymentTerms || ''
  sheet.getCell('F11').value = data.managerName
    ? `${data.managerName}(${data.managerPhone || ''})`
    : ''

  // 품목 채우기 (R16부터)
  const startRow = 16
  let totalSum = 0

  // 기존 데이터 클리어
  for (let i = 0; i < 15; i++) {
    const row = startRow + i
    ;['B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
      sheet.getCell(`${col}${row}`).value = ''
    })
  }

  // 품목 입력
  data.items.forEach((item, index) => {
    const row = startRow + index

    sheet.getCell(`B${row}`).value = item.partNumber || ''
    sheet.getCell(`C${row}`).value = item.description || ''
    sheet.getCell(`D${row}`).value = item.quantity || 1
    sheet.getCell(`E${row}`).value = item.srpPrice || ''
    sheet.getCell(`F${row}`).value = item.unitPrice || ''

    const itemTotal = item.totalPrice || item.quantity * (item.unitPrice || 0)
    sheet.getCell(`G${row}`).value = itemTotal
    totalSum += itemTotal
  })

  // 합계 (R29~31)
  const total = data.totalAmount || totalSum
  const vat = data.vatAmount || Math.round(total * 0.1)
  const totalWithVat = data.totalWithVat || total + vat

  sheet.getCell('G29').value = total
  sheet.getCell('G30').value = vat
  sheet.getCell('G31').value = totalWithVat

  // 비고
  sheet.getCell('B34').value = data.notes || ''

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

async function generateSalesOrderBasic(data: DocumentData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('발주서')

  // 회사 정보
  sheet.mergeCells('B2:F2')
  sheet.getCell('B2').value =
    '서울시 금천구 가산디지털단지1로 131 (BYC하이시티 B동 1201호)\n<Tel :070-8892-1451~7  Fax:070-8892-1459>'

  // 제목
  sheet.mergeCells('B4:G4')
  sheet.getCell('B4').value = '발   주   서'
  sheet.getCell('B4').font = { size: 18, bold: true }
  sheet.getCell('B4').alignment = { horizontal: 'center' }

  // 매입처/발주자 정보
  sheet.getCell('B6').value = data.vendorCompany ? `${data.vendorCompany} 귀중` : ''
  sheet.getCell('B7').value = data.vendorContact || ''
  sheet.getCell('B8').value = data.vendorPhone || ''
  sheet.getCell('B9').value = data.vendorEmail || ''

  sheet.getCell('D6').value = '발   주   자'
  sheet.getCell('F6').value = '(주)서버메이트 (107-86-68756)'
  sheet.getCell('D7').value = '발 주 일 자'
  sheet.getCell('F7').value = formatDate(data.quoteDate)
  sheet.getCell('D8').value = '납품/작업 장소'
  sheet.getCell('F8').value = data.deliveryAddress || ''
  sheet.getCell('D9').value = '담당자'
  sheet.getCell('F9').value = data.managerName || ''
  sheet.getCell('D10').value = '결 제 조 건'
  sheet.getCell('F10').value = data.paymentTerms || ''

  // 품목 테이블
  sheet.getCell('B13').value = '다음과 같이 발주하오니 납품요청일에 납품하여 주시기 바랍니다.'

  const headerRow = 15
  const headers = ['Part No.', '품      목', '수량', '소비자가', '공급단가', '금액']
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, 2 + i)
    cell.value = h
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
  })

  let totalSum = 0
  data.items.forEach((item, index) => {
    const row = headerRow + 1 + index
    sheet.getCell(`B${row}`).value = item.partNumber || ''
    sheet.getCell(`C${row}`).value = item.description || ''
    sheet.getCell(`D${row}`).value = item.quantity || 1
    sheet.getCell(`E${row}`).value = item.srpPrice || ''
    sheet.getCell(`F${row}`).value = item.unitPrice || ''
    const itemTotal = item.totalPrice || item.quantity * (item.unitPrice || 0)
    sheet.getCell(`G${row}`).value = itemTotal
    totalSum += itemTotal
  })

  // 합계
  const sumRow = headerRow + 1 + data.items.length + 1
  const total = data.totalAmount || totalSum
  const vat = Math.round(total * 0.1)

  sheet.mergeCells(`B${sumRow}:D${sumRow}`)
  sheet.getCell(`B${sumRow}`).value = '합        계'
  sheet.getCell(`G${sumRow}`).value = total

  sheet.mergeCells(`B${sumRow + 1}:D${sumRow + 1}`)
  sheet.getCell(`B${sumRow + 1}`).value = 'V .   A  .  T'
  sheet.getCell(`G${sumRow + 1}`).value = vat

  sheet.mergeCells(`B${sumRow + 2}:D${sumRow + 2}`)
  sheet.getCell(`B${sumRow + 2}`).value = '총합계(V.A.T포함)'
  sheet.getCell(`G${sumRow + 2}`).value = total + vat

  // 열 너비
  sheet.getColumn('B').width = 15
  sheet.getColumn('C').width = 45
  sheet.getColumn('D').width = 8
  sheet.getColumn('E').width = 12
  sheet.getColumn('F').width = 12
  sheet.getColumn('G').width = 12

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ==================== MA 견적서 생성 ====================
export async function generateMAQuote(data: DocumentData): Promise<Buffer> {
  const templatePath = path.join(TEMPLATE_DIR, TEMPLATE_MAP.MA_QUOTE)

  const workbook = new ExcelJS.Workbook()

  try {
    await fs.access(templatePath)
    await workbook.xlsx.readFile(templatePath)
  } catch {
    return generateMAQuoteBasic(data)
  }

  const sheet = workbook.getWorksheet('견적서') || workbook.getWorksheet(1)
  if (!sheet) throw new Error('워크시트를 찾을 수 없습니다')

  // 수신/참조/발신
  sheet.getCell('B4').value = data.clientCompany || ''
  sheet.getCell('B5').value = data.clientContact || ''
  sheet.getCell('C6').value = data.managerName || ''
  sheet.getCell('I6').value = data.quoteDate || new Date()

  // 고객명
  sheet.getCell('D16').value = data.clientCompany || ''

  // MA 품목 채우기 (R19부터)
  const startRow = 19

  // 기존 데이터 클리어
  for (let i = 0; i < 5; i++) {
    const row = startRow + i
    ;['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach((col) => {
      sheet.getCell(`${col}${row}`).value = ''
    })
  }

  // MA 품목 입력
  let totalSum = 0
  const maItems = data.maItems || []

  maItems.forEach((item, index) => {
    const row = startRow + index

    sheet.getCell(`A${row}`).value = item.productName || ''
    sheet.getCell(`B${row}`).value = item.modelType || ''
    sheet.getCell(`C${row}`).value = item.model || ''
    sheet.getCell(`D${row}`).value = item.serialNumber || ''
    sheet.getCell(`E${row}`).value = item.serviceLevel || ''
    sheet.getCell(`F${row}`).value = item.period || ''
    sheet.getCell(`G${row}`).value = item.startDate || ''
    sheet.getCell(`H${row}`).value = item.endDate || ''
    sheet.getCell(`I${row}`).value = item.totalPrice || 0
    totalSum += item.totalPrice || 0
  })

  // 합계
  sheet.getCell('I22').value = data.totalAmount || totalSum

  // 조건
  sheet.getCell('C29').value = data.validUntil || ''
  sheet.getCell('A33').value = data.specialTerms || ''

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

async function generateMAQuoteBasic(data: DocumentData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('견적서')

  // 제목
  sheet.mergeCells('A2:I2')
  sheet.getCell('A2').value = '시스템 유지정비 서비스 견적서'
  sheet.getCell('A2').font = { size: 16, bold: true }
  sheet.getCell('A2').alignment = { horizontal: 'center' }

  // 수신/참조/발신
  sheet.getCell('A4').value = '수신 :'
  sheet.getCell('B4').value = data.clientCompany || ''
  sheet.getCell('A5').value = '참조 :'
  sheet.getCell('B5').value = data.clientContact || ''
  sheet.getCell('A6').value = '발신 :'
  sheet.getCell('B6').value = '㈜서버메이트'
  sheet.getCell('C6').value = data.managerName || ''
  sheet.getCell('I6').value = formatDate(data.quoteDate)

  // 고객명
  sheet.mergeCells('A16:C16')
  sheet.getCell('A16').value = '고객명'
  sheet.mergeCells('D16:I16')
  sheet.getCell('D16').value = data.clientCompany || ''

  // 품목 테이블 헤더
  const headerRow = 18
  const headers = ['기기명', 'M/T', 'Model', 'S/N', '기기명 & 상세SPEC', '기간', '서비스개시일', '서비스종료일', '계약기간 총계']
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, 1 + i)
    cell.value = h
    cell.font = { bold: true, size: 9 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
  })

  // MA 품목
  let totalSum = 0
  const maItems = data.maItems || []

  maItems.forEach((item, index) => {
    const row = headerRow + 1 + index
    sheet.getCell(`A${row}`).value = item.productName || ''
    sheet.getCell(`B${row}`).value = item.modelType || ''
    sheet.getCell(`C${row}`).value = item.model || ''
    sheet.getCell(`D${row}`).value = item.serialNumber || ''
    sheet.getCell(`E${row}`).value = item.serviceLevel || ''
    sheet.getCell(`F${row}`).value = item.period || ''
    sheet.getCell(`G${row}`).value = formatDate(item.startDate)
    sheet.getCell(`H${row}`).value = formatDate(item.endDate)
    sheet.getCell(`I${row}`).value = item.totalPrice || 0
    totalSum += item.totalPrice || 0
  })

  // 합계
  const sumRow = headerRow + 1 + maItems.length + 1
  sheet.mergeCells(`A${sumRow}:H${sumRow}`)
  sheet.getCell(`A${sumRow}`).value = '계약기간 유지정비료 합계 (VAT별도)'
  sheet.getCell(`I${sumRow}`).value = data.totalAmount || totalSum

  // 열 너비
  sheet.getColumn('A').width = 12
  sheet.getColumn('B').width = 10
  sheet.getColumn('C').width = 10
  sheet.getColumn('D').width = 12
  sheet.getColumn('E').width = 35
  sheet.getColumn('F').width = 8
  sheet.getColumn('G').width = 12
  sheet.getColumn('H').width = 12
  sheet.getColumn('I').width = 15

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ==================== MA 품의서 생성 ====================
export async function generateMAApproval(data: DocumentData): Promise<Buffer> {
  const templatePath = path.join(TEMPLATE_DIR, TEMPLATE_MAP.MA_APPROVAL)

  const workbook = new ExcelJS.Workbook()

  try {
    await fs.access(templatePath)
    await workbook.xlsx.readFile(templatePath)
  } catch {
    return generateMAApprovalBasic(data)
  }

  const sheet = workbook.getWorksheet(1)
  if (!sheet) throw new Error('워크시트를 찾을 수 없습니다')

  // 기본 정보
  sheet.getCell('E6').value = data.quoteDate || new Date()
  sheet.getCell('E7').value = data.managerName || ''

  // 품목 (R12부터)
  const startRow = 12

  data.items.forEach((item, index) => {
    const row = startRow + index

    sheet.getCell(`F${row}`).value = item.description || '' // 고객사
    sheet.getCell(`G${row}`).value = data.clientCompany || '' // 매출처
    sheet.getCell(`H${row}`).value = item.totalPrice || '' // 매출가
    sheet.getCell(`I${row}`).value = item.quantity || 1 // 수량
  })

  // 매입 정보
  if (data.purchaseItems) {
    data.purchaseItems.forEach((item, index) => {
      const row = startRow + index

      sheet.getCell(`M${row}`).value = item.vendorCompany || '' // 매입처
      sheet.getCell(`N${row}`).value = item.totalPrice || '' // 매입가
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

async function generateMAApprovalBasic(data: DocumentData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('유지보수 품의서')

  // 제목
  sheet.mergeCells('D3:V3')
  sheet.getCell('D3').value = '유지보수 품의서'
  sheet.getCell('D3').font = { size: 18, bold: true }
  sheet.getCell('D3').alignment = { horizontal: 'center' }

  // 기본 정보
  sheet.getCell('D6').value = '품의일자 :'
  sheet.getCell('E6').value = formatDate(data.quoteDate)
  sheet.getCell('D7').value = '담당자 :'
  sheet.getCell('E7').value = data.managerName || ''

  // 품목 테이블 헤더
  const headerRow = 11
  const headers = ['SM코드', '벤더코드', '고객사', '매출처', '매출가', '수량', '청구구분', '계약시작', '계약종료', '매입처', '매입가', '청구구분', 'GP', 'GP율']
  headers.forEach((h, i) => {
    const cell = sheet.getCell(headerRow, 4 + i)
    cell.value = h
    cell.font = { bold: true, size: 9 }
  })

  // 품목
  data.items.forEach((item, index) => {
    const row = headerRow + 1 + index
    sheet.getCell(`F${row}`).value = item.description || ''
    sheet.getCell(`G${row}`).value = data.clientCompany || ''
    sheet.getCell(`H${row}`).value = item.totalPrice || ''
    sheet.getCell(`I${row}`).value = item.quantity || 1
  })

  // 매입 정보
  if (data.purchaseItems) {
    data.purchaseItems.forEach((item, index) => {
      const row = headerRow + 1 + index
      sheet.getCell(`M${row}`).value = item.vendorCompany || ''
      sheet.getCell(`N${row}`).value = item.totalPrice || ''
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ==================== 메인 생성 함수 ====================
export async function generateExcel(docType: DocType, data: DocumentData): Promise<Buffer> {
  switch (docType) {
    case 'SALES_QUOTE':
      return generateSalesQuote(data)
    case 'SALES_APPROVAL':
      return generateSalesApproval(data)
    case 'SALES_ORDER':
      return generateSalesOrder(data)
    case 'MA_QUOTE':
      return generateMAQuote(data)
    case 'MA_APPROVAL':
      return generateMAApproval(data)
    default:
      throw new Error(`지원하지 않는 문서 타입: ${docType}`)
  }
}

// 기존 함수명 호환성 유지
export const generateQuoteExcel = generateSalesQuote
export const generateApprovalExcel = generateSalesApproval
export const generateOrderExcel = generateSalesOrder
