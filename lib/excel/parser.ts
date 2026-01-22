import * as ExcelJS from 'exceljs'

export type DocType = 'SALES_QUOTE' | 'SALES_APPROVAL' | 'SALES_ORDER' | 'MA_QUOTE' | 'MA_APPROVAL'

// 제품 그룹 (품목들을 묶어서 통합 견적)
export interface ParsedProduct {
  name: string
  quantity: number
  srpPrice?: number
  unitPrice?: number
  totalPrice?: number
  items: ParsedItem[] // 참고용 상세 내역
}

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
  products?: ParsedProduct[] // 제품 그룹 (새 구조)
  items: ParsedItem[] // 레거시 호환용
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

  // MA 품의서 전용 (통합 구조)
  maApprovalItems?: ParsedMAApprovalItem[]
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

// MA 품의서 통합 아이템 (엑셀 구조: 매출/매입 한 행)
export interface ParsedMAApprovalItem {
  smCode?: string           // SM코드
  vendorCode?: string       // 벤더코드
  clientCompany?: string    // 고객사
  salesCompany?: string     // 매출처
  salesPrice?: number       // 매출가
  quantity?: number         // 수량
  salesBillingType?: string // 청구구분(매출)
  startDate?: Date          // 계약기간 시작
  endDate?: Date            // 계약기간 종료
  purchaseCompany?: string  // 매입처
  purchasePrice?: number    // 매입가
  purchaseBillingType?: string // 청구구분(매입)
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
    // 수식 결과값 처리
    if ('result' in value) {
      const result = value.result
      if (typeof result === 'number') return result
      if (typeof result === 'string') {
        const num = parseFloat(result.replace(/,/g, ''))
        return isNaN(num) ? 0 : num
      }
    }
    // formula 객체 처리 (ExcelJS에서 수식은 {formula: '=...', result: 값} 형태)
    if ('formula' in value && 'result' in value) {
      const result = (value as { formula: string; result: unknown }).result
      if (typeof result === 'number') return result
    }
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

  // 헤더 행 찾기 (B열에 "P/N" 또는 C열에 "Description"이 있는 행)
  let headerRow = 21 // 기본값
  for (let r = 15; r <= 30; r++) {
    const colB = getCellValue(sheet, `B${r}`)
    const colC = getCellValue(sheet, `C${r}`)
    if (colB.includes('P/N') || colC.toLowerCase().includes('description')) {
      headerRow = r
      break
    }
  }

  // 제품 + 품목 파싱 (헤더 다음 행부터)
  // 규칙: B열(P/N) 비어있고 C열(Description)과 G열(Sum)에 값 있으면 제품
  //       B열(P/N)에 값 있으면 하위 품목
  const products: ParsedProduct[] = []
  const items: ParsedItem[] = [] // 레거시 호환용
  let currentProduct: ParsedProduct | null = null
  let row = headerRow + 1

  while (row < 100) {
    const partNumber = getCellValue(sheet, `B${row}`)
    const description = getCellValue(sheet, `C${row}`)
    const quantity = getNumericValue(sheet, `D${row}`)
    const srpPrice = getNumericValue(sheet, `E${row}`)
    const unitPrice = getNumericValue(sheet, `F${row}`)
    const totalPrice = getNumericValue(sheet, `G${row}`)

    // 합계 행 확인
    if (partNumber.includes('제안금액') || partNumber.includes('합계') ||
        description.includes('제안금액') || description.includes('합계')) {
      break
    }

    // 빈 행 확인 - 모든 값이 비어있으면 중단
    if (!partNumber && !description && quantity === 0 && totalPrice === 0) {
      break
    }

    // 제품 행 판별: B열(P/N) 비어있고, C열(Description)과 G열(Sum)에 값 있음
    const isProductRow = !partNumber && description && totalPrice > 0

    // 품목 행 판별: B열(P/N)에 값 있음
    const isItemRow = !!partNumber

    if (isProductRow) {
      // 이전 제품 저장
      if (currentProduct) {
        products.push(currentProduct)
      }

      // 새 제품 생성
      currentProduct = {
        name: description,
        quantity: quantity || 1,
        srpPrice: srpPrice || undefined,
        unitPrice: unitPrice || totalPrice, // 단가가 없으면 합계를 단가로
        totalPrice: totalPrice,
        items: [],
      }

      // 레거시 호환: 제품도 items에 추가
      items.push({
        partNumber: undefined,
        description: description,
        quantity: quantity || 1,
        srpPrice: srpPrice || undefined,
        unitPrice: unitPrice || totalPrice,
        totalPrice: totalPrice,
      })
    } else if (isItemRow && currentProduct) {
      // 현재 제품의 하위 품목으로 추가
      currentProduct.items.push({
        partNumber: partNumber,
        description: description || undefined,
        quantity: quantity || 1,
        srpPrice: srpPrice || undefined,
        unitPrice: unitPrice || undefined,
        totalPrice: totalPrice || undefined,
      })

      // 레거시 호환: 품목도 items에 추가
      items.push({
        partNumber: partNumber,
        description: description || undefined,
        quantity: quantity || 1,
        srpPrice: srpPrice || undefined,
        unitPrice: unitPrice || undefined,
        totalPrice: totalPrice || undefined,
      })
    } else if (description || totalPrice > 0) {
      // 제품 없이 품목만 있는 경우 (레거시 형식)
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

  // 마지막 제품 저장
  if (currentProduct) {
    products.push(currentProduct)
  }

  // 합계 금액 파싱 (동적으로 찾기)
  let totalAmount = 0
  let totalWithVat = 0
  for (let r = row; r < row + 10; r++) {
    const labelB = getCellValue(sheet, `B${r}`)
    const labelE = getCellValue(sheet, `E${r}`)

    if (labelB.includes('제안금액') || labelE.includes('VAT별도')) {
      totalAmount = getNumericValue(sheet, `G${r}`) || getNumericValue(sheet, `E${r}`)
    }
    if (labelB.includes('합계') || labelE.includes('VAT포함')) {
      totalWithVat = getNumericValue(sheet, `G${r}`) || getNumericValue(sheet, `E${r}`)
    }
  }

  // 레거시 위치에서도 확인
  if (!totalAmount) {
    totalAmount = getNumericValue(sheet, 'E28') || getNumericValue(sheet, 'G28')
  }
  if (!totalWithVat) {
    totalWithVat = getNumericValue(sheet, 'E29') || getNumericValue(sheet, 'G29')
  }

  const vatAmount = totalWithVat > totalAmount ? totalWithVat - totalAmount : Math.round(totalAmount * 0.1)

  // 기타사항 (동적으로 찾기)
  let notes = ''
  for (let r = row; r < row + 15; r++) {
    const labelB = getCellValue(sheet, `B${r}`)
    if (labelB.includes('기타') || labelB.includes('비고')) {
      notes = getCellValue(sheet, `C${r}`) || getCellValue(sheet, `B${r + 1}`) || ''
      break
    }
  }
  if (!notes) {
    notes = getCellValue(sheet, 'B31') || undefined
  }

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
    notes: notes || undefined,
    products: products.length > 0 ? products : undefined,
    items,
    totalAmount,
    vatAmount,
    totalWithVat,
  }
}

// 품의서 품목 구조 (메인 + 하위)
interface ParsedApprovalItem {
  productName: string // 메인 품목명
  quantity: number
  unitPrice?: number
  totalPrice?: number
  details: {
    partNumber?: string // 하위 품목 P/N (시리얼번호)
    description?: string // 하위 품목 상세내용
    quantity?: number
  }[]
}

interface ParsedApprovalPurchaseItem extends ParsedApprovalItem {
  purchaseDate?: Date
  vendorCompany?: string
}

// ==================== Sales 품의서 파싱 ====================
// 분석 결과 실제 열 매핑 (R16이 헤더):
// C열 = P/N, D열 = 품목, E열 = 수량, F열 = 단가, G열 = 합계
// H열 = 매입일, I열 = 매입처, J열 = 매입수량, K열 = 매입단가, L열 = 매입합계
function parseSalesApproval(sheet: ExcelJS.Worksheet): ParsedDocument {
  // 기본 정보 (R9~R11) - D열에 값이 있음 (C열은 라벨)
  const approvalCode = getCellValue(sheet, 'D9').replace(/^\[.*\].*$/, '').trim()
  const approvalDate = getDateValue(sheet, 'D10')
  const approvalManager = getCellValue(sheet, 'D11')

  // 매출처 정보 (R13~R15) - D열에 값이 있음
  // D13: "주니파이커넥트 / 장진강 담당님 / 010-1234-5678"
  const clientInfo = getCellValue(sheet, 'D13')
  const clientParts = clientInfo.split('/').map(s => s.trim())
  const clientCompany = clientParts[0]?.replace(/^\[.*\].*$/, '') || undefined
  const clientContact = clientParts[1] || undefined
  const clientPhone = clientParts[2] || undefined

  const endUser = getCellValue(sheet, 'D14').replace(/^\[.*\].*$/, '')
  const modelTypeSerial = getCellValue(sheet, 'D15') // "MT&S/N"

  // 매출 품목 파싱 (R16이 헤더, R17부터 데이터)
  // 실제 구조: C=P/N, D=품목, E=수량, F=단가, G=합계, H=매입일, I=매입처, J=매입수량, K=매입단가, L=매입합계
  const approvalItems: ParsedApprovalItem[] = []
  const approvalPurchaseItems: ParsedApprovalPurchaseItem[] = []
  let currentItem: ParsedApprovalItem | null = null
  let currentPurchaseItem: ParsedApprovalPurchaseItem | null = null
  let row = 17

  while (row < 50) {
    const partNumber = getCellValue(sheet, `C${row}`)  // P/N (Chassis, CPU 등)
    const description = getCellValue(sheet, `D${row}`) // 품목명 (R660XS, 상세설명 등)
    const quantity = getNumericValue(sheet, `E${row}`) // 수량
    const unitPrice = getNumericValue(sheet, `F${row}`) // 단가
    const totalPrice = getNumericValue(sheet, `G${row}`) // 합계

    // 합계 행 확인 (B열에 "매출금액 합계" 등이 있으면 중단)
    if (partNumber.includes('합계') || partNumber.includes('매출금액')) {
      break
    }

    // 빈 행 확인 (모든 값이 비어있으면 중단)
    if (!partNumber && !description && quantity === 0 && unitPrice === 0 && totalPrice === 0) {
      break
    }

    // 메인 품목 판단: 단가/합계가 있는 행 (예: R660XS 행)
    const isMainItem = (unitPrice > 0 || totalPrice > 0)

    // 하위 품목 판단: B열에 카테고리(예: Chassis, CPU)가 있고 단가가 없는 행
    const isSubItem = (partNumber || description) && unitPrice === 0 && totalPrice === 0 && currentItem

    if (isMainItem) {
      // 이전 메인 품목 저장
      if (currentItem) {
        approvalItems.push(currentItem)
      }
      if (currentPurchaseItem) {
        approvalPurchaseItems.push(currentPurchaseItem)
        currentPurchaseItem = null
      }

      // 새 메인 품목 생성 (C열의 제품명 사용)
      const cleanDescription = description
        ?.replace(/^\[제품명\]/, '')
        ?.replace(/^ProductCode/, '')
        ?.trim() || '제품'

      currentItem = {
        productName: cleanDescription,
        quantity: quantity || 1,
        unitPrice: unitPrice || undefined,
        totalPrice: totalPrice || undefined,
        details: [],
      }

      // 매입 정보 확인 (같은 행의 H~L열)
      const purchaseDate = getDateValue(sheet, `H${row}`)
      const vendorCompany = getCellValue(sheet, `I${row}`)
      const purchaseQty = getNumericValue(sheet, `J${row}`)
      const purchaseUnitPrice = getNumericValue(sheet, `K${row}`)
      const purchaseTotalPrice = getNumericValue(sheet, `L${row}`)

      if (vendorCompany || purchaseTotalPrice > 0) {
        currentPurchaseItem = {
          productName: cleanDescription,
          quantity: purchaseQty || quantity || 1,
          unitPrice: purchaseUnitPrice || undefined,
          totalPrice: purchaseTotalPrice || undefined,
          purchaseDate,
          vendorCompany: vendorCompany || undefined,
          details: [],
        }
      }
    } else if (isSubItem && currentItem) {
      // 하위 품목 추가 (C열=카테고리, D열=상세설명)
      const cleanPartNumber = partNumber
        ?.replace(/^\[품목명\]\s*/, '')
        ?.replace(/^예시_/, '')
        ?.trim()

      currentItem.details.push({
        partNumber: cleanPartNumber || undefined,
        description: description || undefined,
        quantity: quantity || undefined,
      })

      // 하위 품목별 매입 정보 확인 (각 품목마다 다른 매입처 가능)
      const subPurchaseDate = getDateValue(sheet, `H${row}`)
      const subVendorCompany = getCellValue(sheet, `I${row}`)
      const subPurchaseQty = getNumericValue(sheet, `J${row}`)
      const subPurchaseUnitPrice = getNumericValue(sheet, `K${row}`)
      const subPurchaseTotalPrice = getNumericValue(sheet, `L${row}`)

      // 하위 품목에 매입 정보가 있으면 별도 매입 품목으로 추가
      if (subVendorCompany || subPurchaseTotalPrice > 0) {
        approvalPurchaseItems.push({
          productName: `${currentItem.productName} - ${cleanPartNumber || description || '품목'}`,
          quantity: subPurchaseQty || quantity || 1,
          unitPrice: subPurchaseUnitPrice || undefined,
          totalPrice: subPurchaseTotalPrice || undefined,
          purchaseDate: subPurchaseDate,
          vendorCompany: subVendorCompany || undefined,
          details: [{
            partNumber: cleanPartNumber || undefined,
            description: description || undefined,
            quantity: quantity || undefined,
          }],
        })
      }
    }

    row++
  }

  // 마지막 메인 품목 저장
  if (currentItem) {
    approvalItems.push(currentItem)
  }
  if (currentPurchaseItem) {
    approvalPurchaseItems.push(currentPurchaseItem)
  }

  // 기존 ParsedItem 형식으로 변환 (하위 호환성)
  const items: ParsedItem[] = approvalItems.map(item => ({
    partNumber: item.productName, // productName을 partNumber로 (upload route에서 productName으로 변환)
    description: item.details.map(d =>
      `${d.partNumber ? `[${d.partNumber}] ` : ''}${d.description || ''}${d.quantity ? ` x${d.quantity}` : ''}`
    ).join('\n') || undefined,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    // 새 구조 정보도 추가로 전달
    _details: item.details,
  } as ParsedItem & { _details?: typeof item.details }))

  const purchaseItems: ParsedPurchaseItem[] = approvalPurchaseItems.map(item => ({
    partNumber: item.productName,
    description: item.details.map(d =>
      `${d.partNumber ? `[${d.partNumber}] ` : ''}${d.description || ''}${d.quantity ? ` x${d.quantity}` : ''}`
    ).join('\n') || undefined,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    purchaseDate: item.purchaseDate,
    vendorCompany: item.vendorCompany,
    _details: item.details,
  } as ParsedPurchaseItem & { _details?: typeof item.details }))

  // 합계 금액 - F/G열에 매출합계, L열에 매입합계 (행은 동적으로 찾음)
  let totalAmount = 0
  let purchaseTotal = 0
  let purchaseTotalWithVat = 0

  // 합계 행 찾기 (row부터 탐색)
  for (let r = row; r < row + 10; r++) {
    const labelC = getCellValue(sheet, `C${r}`)
    if (labelC.includes('매출금액') && labelC.includes('VAT별도')) {
      totalAmount = getNumericValue(sheet, `G${r}`) || getNumericValue(sheet, `F${r}`)
    }
    if (labelC.includes('매입금액') && labelC.includes('VAT별도')) {
      purchaseTotal = getNumericValue(sheet, `L${r}`)
    }
    if (labelC.includes('매입금액') && labelC.includes('VAT포함')) {
      purchaseTotalWithVat = getNumericValue(sheet, `L${r}`)
    }
  }

  // 기타 정보 - D열에 값이 있음 (C열은 라벨)
  let notes = ''
  let invoiceEmail = ''
  let paymentDate = ''
  let deliveryAddress = ''
  let receiverInfo = ''
  let deliveryDateStr = ''

  // 기타 정보 동적으로 찾기
  for (let r = row; r < 50; r++) {
    const labelC = getCellValue(sheet, `C${r}`)
    const valueD = getCellValue(sheet, `D${r}`)

    if (labelC.includes('기타')) {
      notes = valueD.replace(/^예시_/, '')
    }
    if (labelC.includes('계산서') && labelC.includes('메일')) {
      invoiceEmail = valueD.replace(/^\[.*\]$/, '')
    }
    if (labelC.includes('결제일')) {
      paymentDate = valueD.replace(/^\[.*\].*$/, '')
    }
    if (labelC.includes('배송주소')) {
      deliveryAddress = valueD.replace(/^\[.*\].*$/, '')
    }
    if (labelC.includes('받으실분') || labelC.includes('연락처')) {
      receiverInfo = valueD
    }
    if (labelC.includes('배송일')) {
      deliveryDateStr = valueD
    }
  }

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

// ==================== MA 견적서 양식 감지 ====================
type MAQuoteFormat = 'V1' | 'V2'

function detectMAQuoteFormat(sheet: ExcelJS.Worksheet): MAQuoteFormat {
  const sheetName = sheet.name.toLowerCase()

  // SM_MA 시트명이면 V2 양식
  if (sheetName.includes('sm_ma') || sheetName === 'sm_ma') {
    return 'V2'
  }

  // B5에 "발신"이 있으면 V2 (V1은 B5가 "참조")
  const b5Value = getCellValue(sheet, 'A5')
  if (b5Value.includes('발신')) {
    return 'V2'
  }

  // J열에 데이터가 있고 "계약기간 총계"가 J열에 있으면 V2
  const j17Value = getCellValue(sheet, 'J17')
  if (j17Value.includes('계약기간') || j17Value.includes('총계')) {
    return 'V2'
  }

  // 기본값은 V1
  return 'V1'
}

// ==================== MA 견적서 파싱 ====================
function parseMAQuote(sheet: ExcelJS.Worksheet): ParsedDocument {
  const format = detectMAQuoteFormat(sheet)

  if (format === 'V2') {
    return parseMAQuoteV2(sheet)
  }
  return parseMAQuoteV1(sheet)
}

// V1 양식: ERP 예시용 (시트명: 견적서, 열 A~I)
function parseMAQuoteV1(sheet: ExcelJS.Worksheet): ParsedDocument {
  // 수신/참조/발신 정보
  let clientCompany = getCellValue(sheet, 'B4').replace(/^\[.*\]$/, '').replace(/\s*귀중$/, '')
  const clientContact = getCellValue(sheet, 'B5').replace(/^\[.*\]$/, '')
  const approvalManager = getCellValue(sheet, 'C6') // 담당자명
  const quoteDate = getDateValue(sheet, 'I6')

  // 고객명 (D16에서 가져오기)
  const customerName = getCellValue(sheet, 'D16').replace(/^\[.*\]$/, '').replace(/^\[매출처.*\]$/, '')
  if (!clientCompany || clientCompany.includes('[')) {
    clientCompany = customerName
  }

  // 기계설치주소
  const installAddress = getCellValue(sheet, 'E17') || getCellValue(sheet, 'D17')

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

    // 예시 데이터 필터링
    const isExample = productName.includes('ex)') || productName.includes('제품명') ||
                      modelType.includes('모델타입') || model.includes('모델명')

    if ((productName || serialNumber || totalPrice > 0) && !isExample) {
      maItems.push({
        productName: productName?.replace(/^ex\)/, '').trim() || undefined,
        modelType: modelType?.replace(/^모델타입.*$/, '').trim() || undefined,
        model: model?.replace(/^모델명.*$/, '').trim() || undefined,
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

  // 합계 금액 (동적으로 찾기)
  let monthlyAmount = 0
  let totalAmount = 0
  for (let r = 20; r < 30; r++) {
    const label = getCellValue(sheet, `A${r}`)
    if (label.includes('월간') && label.includes('금액')) {
      monthlyAmount = getNumericValue(sheet, `I${r}`)
    }
    if (label.includes('합계') && !label.includes('월간')) {
      totalAmount = getNumericValue(sheet, `I${r}`)
      break
    }
  }

  // 조건들 (동적으로 찾기)
  let serviceTerms = ''
  let validUntil = ''
  let paymentTerms = ''
  let specialTerms = ''

  for (let r = 23; r < 40; r++) {
    const cellA = getCellValue(sheet, `A${r}`)
    const cellC = getCellValue(sheet, `C${r}`)

    if (cellA.includes('서비스기간')) {
      serviceTerms = getCellValue(sheet, `A${r + 1}`)?.trim() || ''
    }
    if (cellA.includes('견적 유효기간')) {
      validUntil = cellC || cellA.replace(/.*:/, '').trim()
    }
    if (cellA.includes('지급조건')) {
      paymentTerms = cellA
    }
    if (cellA.includes('특약사항')) {
      specialTerms = cellA
    }
  }

  return {
    clientCompany: clientCompany || undefined,
    clientContact: clientContact || undefined,
    approvalManager: approvalManager || undefined,
    quoteDate,
    deliveryAddress: installAddress || undefined,
    maItems,
    totalAmount: totalAmount || monthlyAmount * 12,
    serviceTerms: serviceTerms || undefined,
    validUntil: validUntil || undefined,
    paymentTerms: paymentTerms || undefined,
    specialTerms: specialTerms || undefined,
    items: [], // MA는 maItems 사용
  }
}

// V2 양식: SM_MA (시트명: SM_MA, 열 A~J, 행이 1씩 위로)
function parseMAQuoteV2(sheet: ExcelJS.Worksheet): ParsedDocument {
  // 수신 정보 (B4: "주니파이커넥트 귀중")
  let clientCompany = getCellValue(sheet, 'B4').replace(/\s*귀중$/, '').trim()

  // 발신 정보 (B5: "㈜서버메이트 김대훈 _ 070-8892-1455")
  const senderInfo = getCellValue(sheet, 'B5')
  let approvalManager = ''
  if (senderInfo.includes('_')) {
    const parts = senderInfo.split('_')
    const companyAndName = parts[0].trim()
    // "㈜서버메이트 김대훈" -> "김대훈"
    const nameParts = companyAndName.split(/\s+/)
    approvalManager = nameParts[nameParts.length - 1] || ''
  }

  // 견적일 (J5)
  const quoteDate = getDateValue(sheet, 'J5')

  // 고객명 (C15)
  const customerName = getCellValue(sheet, 'C15').trim()
  if (!clientCompany || clientCompany.includes('[')) {
    clientCompany = customerName
  }

  // 기계설치주소 (C16)
  const installAddress = getCellValue(sheet, 'C16').trim()

  // MA 품목 파싱 (R17이 헤더, R18부터 데이터)
  // 열 구조: A=모델, B=M/T, C=S/N, D=P/N, E=SPEC, F=수량, G=시작일, H=종료일, I=월제안가, J=총계
  const maItems: ParsedMAItem[] = []
  let row = 18

  while (row < 50) {
    const productName = getCellValue(sheet, `A${row}`)  // 모델 (제품명)
    const modelType = getCellValue(sheet, `B${row}`)    // M/T
    const serialNumber = getCellValue(sheet, `C${row}`) // S/N
    const partNumber = getCellValue(sheet, `D${row}`)   // P/N
    const serviceLevel = getCellValue(sheet, `E${row}`) // 기기명 & 상세SPEC
    const quantity = getNumericValue(sheet, `F${row}`)  // 수량
    const startDate = getDateValue(sheet, `G${row}`)
    const endDate = getDateValue(sheet, `H${row}`)
    const monthlyPrice = getNumericValue(sheet, `I${row}`) // 월제안가
    const totalPrice = getNumericValue(sheet, `J${row}`)   // 계약기간 총계

    // 합계 행 확인
    if (productName.includes('합계') || productName.includes('유지정비료')) {
      break
    }

    // 빈 행 확인
    if (!productName && !modelType && !serialNumber && totalPrice === 0) {
      break
    }

    if (productName || serialNumber || totalPrice > 0) {
      maItems.push({
        productName: productName || undefined,
        modelType: modelType || undefined,
        model: partNumber || undefined, // P/N을 model로
        serialNumber: serialNumber || undefined,
        serviceLevel: serviceLevel || undefined,
        period: quantity > 0 ? `${quantity}년` : undefined,
        startDate,
        endDate,
        totalPrice: totalPrice || (monthlyPrice * 12) || undefined,
      })
    }

    row++
  }

  // 합계 금액 (동적으로 찾기)
  let monthlyAmount = 0
  let totalAmount = 0
  let totalWithVat = 0

  for (let r = row; r < row + 10; r++) {
    const label = getCellValue(sheet, `A${r}`)
    if (label.includes('월간') && label.includes('합계')) {
      monthlyAmount = getNumericValue(sheet, `J${r}`)
    }
    if (label.includes('VAT별도') && label.includes('합계') && !label.includes('월간')) {
      totalAmount = getNumericValue(sheet, `J${r}`)
    }
    if (label.includes('VAT포함') && label.includes('합계')) {
      totalWithVat = getNumericValue(sheet, `J${r}`)
    }
  }

  // 조건들 (동적으로 찾기)
  let serviceTerms = ''
  let validUntil = ''
  let specialTerms = ''

  for (let r = 20; r < 35; r++) {
    const cellA = getCellValue(sheet, `A${r}`)

    if (cellA.includes('서비스기간')) {
      serviceTerms = getCellValue(sheet, `A${r + 1}`)?.trim() || ''
    }
    if (cellA.includes('견적 유효기간')) {
      // "* 견적 유효기간 : 15일" 형태
      const match = cellA.match(/유효기간\s*[:\s]\s*(.+)/)
      validUntil = match ? match[1].trim() : ''
    }
    if (cellA.includes('특약사항')) {
      // "* 특약사항 : 정기점검 제외, ..." 형태
      const match = cellA.match(/특약사항\s*[:\s]\s*(.+)/)
      specialTerms = match ? match[1].trim() : cellA
    }
  }

  return {
    clientCompany: clientCompany || undefined,
    approvalManager: approvalManager || undefined,
    quoteDate,
    deliveryAddress: installAddress || undefined,
    maItems,
    totalAmount: totalAmount || monthlyAmount * 12,
    totalWithVat: totalWithVat || undefined,
    serviceTerms: serviceTerms || undefined,
    validUntil: validUntil || undefined,
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
  // 엑셀 구조: D=SM코드, E=벤더코드, F=고객사, G=매출처, H=매출가, I=수량, J=청구구분(매출)
  //           K=계약시작, L=계약종료, M=매입처, N=매입가, O=청구구분(매입)
  const maApprovalItems: ParsedMAApprovalItem[] = []
  let row = 12

  while (row < 30) {
    const smCode = getCellValue(sheet, `D${row}`)
    const vendorCode = getCellValue(sheet, `E${row}`)
    const clientCompany = getCellValue(sheet, `F${row}`)
    const salesCompany = getCellValue(sheet, `G${row}`)
    const salesPrice = getNumericValue(sheet, `H${row}`)
    const quantity = getNumericValue(sheet, `I${row}`)
    const salesBillingType = getCellValue(sheet, `J${row}`) // 일시불/월간
    const startDate = getDateValue(sheet, `K${row}`)
    const endDate = getDateValue(sheet, `L${row}`)
    const purchaseCompany = getCellValue(sheet, `M${row}`)
    const purchasePrice = getNumericValue(sheet, `N${row}`)
    const purchaseBillingType = getCellValue(sheet, `O${row}`)

    // 빈 행 확인
    if (!clientCompany && !salesCompany && salesPrice === 0 && purchasePrice === 0) {
      break
    }

    // 데이터가 있는 행만 추가
    if (clientCompany || salesCompany || salesPrice > 0 || purchasePrice > 0) {
      maApprovalItems.push({
        smCode: smCode?.replace(/^\[.*\]$/, '') || undefined,
        vendorCode: vendorCode?.replace(/^\[.*\]$/, '') || undefined,
        clientCompany: clientCompany?.replace(/^\[.*\]$/, '') || undefined,
        salesCompany: salesCompany?.replace(/^\[.*\]$/, '') || undefined,
        salesPrice: salesPrice || undefined,
        quantity: quantity || 1,
        salesBillingType: salesBillingType?.replace(/^\[.*\]$/, '') || undefined,
        startDate,
        endDate,
        purchaseCompany: purchaseCompany?.replace(/^\[.*\]$/, '') || undefined,
        purchasePrice: purchasePrice || undefined,
        purchaseBillingType: purchaseBillingType?.replace(/^\[.*\]$/, '') || undefined,
      })
    }

    row++
  }

  // 합계 계산
  const totalAmount = maApprovalItems.reduce((sum, item) => sum + ((item.salesPrice || 0) * (item.quantity || 1)), 0)
  const purchaseTotal = maApprovalItems.reduce((sum, item) => sum + ((item.purchasePrice || 0) * (item.quantity || 1)), 0)

  return {
    approvalDate,
    approvalManager: approvalManager || undefined,
    maApprovalItems,
    items: [], // 하위 호환성
    purchaseItems: [], // 하위 호환성
    totalAmount,
    purchaseTotal,
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
