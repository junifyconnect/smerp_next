/**
 * 엑셀 파일 구조 분석 스크립트
 * 사용법: npx tsx scripts/analyze-excel.ts <엑셀파일경로>
 *
 * 출력: 같은 경로에 .analysis.json 파일 생성
 */

import * as ExcelJS from 'exceljs'
import * as fs from 'fs'
import * as path from 'path'

interface CellStyle {
  fill?: {
    type?: string
    color?: string
  }
  font?: {
    bold?: boolean
    size?: number
    color?: string
    name?: string
  }
  border?: {
    top?: boolean
    right?: boolean
    bottom?: boolean
    left?: boolean
  }
  alignment?: {
    horizontal?: string
    vertical?: string
    wrapText?: boolean
  }
}

interface CellInfo {
  address: string
  value: string | number | boolean | null
  type: string
  formula?: string
  isMerged?: boolean
  mergeRange?: string
  style?: CellStyle
}

interface SheetAnalysis {
  name: string
  rowCount: number
  columnCount: number
  mergedCells: string[]
  cells: CellInfo[]
  // 시각화를 위한 2D 그리드 (처음 20행 x 15열)
  preview: (string | number | null)[][]
  previewHeaders: string[] // A, B, C, ...
  // 스타일 정보
  columnWidths: Record<string, number>  // { "A": 15, "B": 20, ... }
  rowHeights: Record<number, number>    // { 1: 20, 2: 30, ... }
}

interface ExcelAnalysis {
  fileName: string
  sheetCount: number
  sheets: SheetAnalysis[]
  analyzedAt: string
}

function getColumnLetter(colNumber: number): string {
  let letter = ''
  while (colNumber > 0) {
    const remainder = (colNumber - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    colNumber = Math.floor((colNumber - 1) / 26)
  }
  return letter
}

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

function getCellValueAsString(cell: ExcelJS.Cell): string | number | null {
  const value = cell.value

  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (value instanceof Date) return isValidDate(value) ? value.toISOString().split('T')[0] : String(value)

  if (typeof value === 'object') {
    // 수식 결과
    if ('result' in value && value.result !== undefined) {
      if (typeof value.result === 'number') return value.result
      if (value.result instanceof Date) return isValidDate(value.result) ? value.result.toISOString().split('T')[0] : String(value.result)
      return String(value.result)
    }
    // richText
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((r: { text: string }) => r.text).join('')
    }
    // hyperlink
    if ('text' in value && value.text) {
      return String(value.text)
    }
  }

  return String(value)
}

function getCellType(cell: ExcelJS.Cell): string {
  const value = cell.value

  if (value === null || value === undefined) return 'empty'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date) return 'date'

  if (typeof value === 'object') {
    if ('formula' in value) return 'formula'
    if ('richText' in value) return 'richText'
    if ('hyperlink' in value) return 'hyperlink'
    if ('text' in value) return 'text'
  }

  return 'unknown'
}

async function analyzeExcel(filePath: string): Promise<ExcelAnalysis> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const analysis: ExcelAnalysis = {
    fileName: path.basename(filePath),
    sheetCount: workbook.worksheets.length,
    sheets: [],
    analyzedAt: new Date().toISOString(),
  }

  for (const sheet of workbook.worksheets) {
    const sheetAnalysis: SheetAnalysis = {
      name: sheet.name,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      mergedCells: [],
      cells: [],
      preview: [],
      previewHeaders: [],
      columnWidths: {},
      rowHeights: {},
    }

    // 열 너비 수집
    for (let c = 1; c <= Math.min(sheet.columnCount || 20, 20); c++) {
      const col = sheet.getColumn(c)
      if (col.width) {
        sheetAnalysis.columnWidths[getColumnLetter(c)] = col.width
      }
    }

    // 행 높이 수집
    for (let r = 1; r <= Math.min(sheet.rowCount || 50, 50); r++) {
      const row = sheet.getRow(r)
      if (row.height) {
        sheetAnalysis.rowHeights[r] = row.height
      }
    }

    // 병합된 셀 정보 수집
    // ExcelJS의 merges는 문자열 배열로 반환됨
    const merges = Object.keys(sheet.model.merges || {})
    sheetAnalysis.mergedCells = merges

    // 병합 셀 맵 (어떤 셀이 어떤 병합 범위에 속하는지)
    const mergeMap = new Map<string, string>()
    for (const merge of merges) {
      // merge는 "A1:C3" 형태
      const [start, end] = merge.split(':')
      if (!start || !end) continue

      const startMatch = start.match(/([A-Z]+)(\d+)/)
      const endMatch = end.match(/([A-Z]+)(\d+)/)
      if (!startMatch || !endMatch) continue

      const startCol = startMatch[1]
      const startRow = parseInt(startMatch[2])
      const endCol = endMatch[1]
      const endRow = parseInt(endMatch[2])

      // 모든 셀에 병합 범위 매핑
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol.charCodeAt(0); c <= endCol.charCodeAt(0); c++) {
          const addr = String.fromCharCode(c) + r
          mergeMap.set(addr, merge)
        }
      }
    }

    // 미리보기용 헤더 생성 (최대 15열)
    const maxPreviewCols = Math.min(sheet.columnCount || 15, 15)
    for (let c = 1; c <= maxPreviewCols; c++) {
      sheetAnalysis.previewHeaders.push(getColumnLetter(c))
    }

    // 미리보기 그리드 생성 (최대 30행)
    const maxPreviewRows = Math.min(sheet.rowCount || 30, 50)
    for (let r = 1; r <= maxPreviewRows; r++) {
      const row: (string | number | null)[] = []
      for (let c = 1; c <= maxPreviewCols; c++) {
        const cell = sheet.getCell(r, c)
        const val = getCellValueAsString(cell)
        row.push(val)
      }
      sheetAnalysis.preview.push(row)
    }

    // 스타일 추출 헬퍼 함수
    const extractCellStyle = (cell: ExcelJS.Cell): CellStyle | undefined => {
      const style = cell.style
      if (!style) return undefined

      const cellStyle: CellStyle = {}
      let hasStyle = false

      // 배경색
      if (style.fill && style.fill.type === 'pattern' && style.fill.fgColor) {
        const fgColor = style.fill.fgColor
        if (fgColor.argb) {
          cellStyle.fill = { type: 'pattern', color: fgColor.argb }
          hasStyle = true
        } else if (fgColor.theme !== undefined) {
          cellStyle.fill = { type: 'theme', color: `theme:${fgColor.theme}` }
          hasStyle = true
        }
      }

      // 폰트
      if (style.font) {
        cellStyle.font = {}
        if (style.font.bold) {
          cellStyle.font.bold = true
          hasStyle = true
        }
        if (style.font.size) {
          cellStyle.font.size = style.font.size
          hasStyle = true
        }
        if (style.font.color?.argb) {
          cellStyle.font.color = style.font.color.argb
          hasStyle = true
        }
        if (style.font.name) {
          cellStyle.font.name = style.font.name
          hasStyle = true
        }
      }

      // 테두리
      if (style.border) {
        cellStyle.border = {
          top: !!style.border.top?.style,
          right: !!style.border.right?.style,
          bottom: !!style.border.bottom?.style,
          left: !!style.border.left?.style,
        }
        if (cellStyle.border.top || cellStyle.border.right || cellStyle.border.bottom || cellStyle.border.left) {
          hasStyle = true
        }
      }

      // 정렬
      if (style.alignment) {
        cellStyle.alignment = {
          horizontal: style.alignment.horizontal,
          vertical: style.alignment.vertical,
          wrapText: style.alignment.wrapText,
        }
        if (cellStyle.alignment.horizontal || cellStyle.alignment.vertical || cellStyle.alignment.wrapText) {
          hasStyle = true
        }
      }

      return hasStyle ? cellStyle : undefined
    }

    // 모든 셀 정보 수집 (값이 있는 셀만)
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const address = getColumnLetter(colNumber) + rowNumber
        const cellInfo: CellInfo = {
          address,
          value: getCellValueAsString(cell),
          type: getCellType(cell),
        }

        // 수식이 있는 경우
        if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
          cellInfo.formula = cell.value.formula
        }

        // 병합 셀인 경우
        const mergeRange = mergeMap.get(address)
        if (mergeRange) {
          cellInfo.isMerged = true
          cellInfo.mergeRange = mergeRange
        }

        // 스타일 정보
        const style = extractCellStyle(cell)
        if (style) {
          cellInfo.style = style
        }

        sheetAnalysis.cells.push(cellInfo)
      })
    })

    analysis.sheets.push(sheetAnalysis)
  }

  return analysis
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('사용법: npx tsx scripts/analyze-excel.ts <엑셀파일경로>')
    console.log('예시: npx tsx scripts/analyze-excel.ts ./documents/견적서.xlsx')
    process.exit(1)
  }

  const filePath = args[0]

  if (!fs.existsSync(filePath)) {
    console.error(`파일을 찾을 수 없습니다: ${filePath}`)
    process.exit(1)
  }

  console.log(`분석 중: ${filePath}`)

  try {
    const analysis = await analyzeExcel(filePath)

    // 결과 출력
    console.log('\n=== 분석 결과 ===')
    console.log(`파일명: ${analysis.fileName}`)
    console.log(`시트 수: ${analysis.sheetCount}`)

    for (const sheet of analysis.sheets) {
      console.log(`\n--- 시트: ${sheet.name} ---`)
      console.log(`크기: ${sheet.rowCount}행 x ${sheet.columnCount}열`)
      console.log(`병합된 셀: ${sheet.mergedCells.length}개`)
      if (sheet.mergedCells.length > 0) {
        console.log(`  ${sheet.mergedCells.slice(0, 10).join(', ')}${sheet.mergedCells.length > 10 ? '...' : ''}`)
      }

      // 미리보기 출력
      console.log('\n미리보기 (처음 15행):')
      console.log('    | ' + sheet.previewHeaders.map(h => h.padEnd(12)).join('| '))
      console.log('-'.repeat(15 * 14))

      for (let r = 0; r < Math.min(sheet.preview.length, 15); r++) {
        const rowNum = (r + 1).toString().padStart(3)
        const rowData = sheet.preview[r].map(v => {
          if (v === null) return ''.padEnd(12)
          const str = String(v)
          return str.length > 11 ? str.substring(0, 10) + '…' : str.padEnd(12)
        }).join('| ')
        console.log(`${rowNum} | ${rowData}`)
      }
    }

    // JSON 파일로 저장
    const outputPath = filePath.replace(/\.[^.]+$/, '.analysis.json')
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf-8')
    console.log(`\n분석 결과가 저장되었습니다: ${outputPath}`)

  } catch (error) {
    console.error('분석 중 오류 발생:', error)
    process.exit(1)
  }
}

main()
