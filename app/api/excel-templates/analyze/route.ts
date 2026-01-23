import { NextRequest, NextResponse } from 'next/server'
import * as ExcelJS from 'exceljs'

interface CellData {
  address: string
  row: number
  col: number
  colLetter: string
  value: string | number | boolean | Date | null
  type: string
  formula?: string
  style?: {
    font?: { bold?: boolean; size?: number }
    fill?: { color?: string }
    border?: boolean
    alignment?: { horizontal?: string; vertical?: string }
  }
}

interface RowData {
  row: number
  cells: CellData[]
  isEmpty: boolean
  hasNumericValue: boolean
}

interface AnalyzedSheet {
  name: string
  rowCount: number
  columnCount: number
  mergedCells: string[]
  rows: RowData[]
}

interface AnalyzedData {
  fileName: string
  sheets: AnalyzedSheet[]
}

// 열 번호를 문자로 변환 (1=A, 2=B, ..., 27=AA)
function colToLetter(col: number): string {
  let letter = ''
  while (col > 0) {
    const mod = (col - 1) % 26
    letter = String.fromCharCode(65 + mod) + letter
    col = Math.floor((col - 1) / 26)
  }
  return letter
}

// POST /api/excel-templates/analyze - 엑셀 파일 분석
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const maxRows = parseInt(formData.get('maxRows') as string) || 50
    const maxCols = parseInt(formData.get('maxCols') as string) || 20

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const sheets: AnalyzedSheet[] = []

    workbook.eachSheet((sheet) => {
      const mergedCells: string[] = []

      // 병합된 셀 수집 - ExcelJS의 여러 방법 시도
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sheetAny = sheet as any

      // 방법 1: model.merges (배열 형태)
      if (sheetAny.model?.merges) {
        sheetAny.model.merges.forEach((merge: string) => {
          mergedCells.push(merge)
        })
      }

      // 방법 2: _merges (객체 형태) - model.merges가 없을 때
      if (mergedCells.length === 0 && sheetAny._merges) {
        Object.keys(sheetAny._merges).forEach((key) => {
          mergedCells.push(key)
        })
      }

      const rows: RowData[] = []
      const actualRowCount = Math.min(sheet.rowCount, maxRows)

      for (let rowNum = 1; rowNum <= actualRowCount; rowNum++) {
        const row = sheet.getRow(rowNum)
        const cells: CellData[] = []
        let isEmpty = true
        let hasNumericValue = false

        for (let colNum = 1; colNum <= maxCols; colNum++) {
          const cell = row.getCell(colNum)
          const colLetter = colToLetter(colNum)
          const address = `${colLetter}${rowNum}`

          let value: string | number | boolean | Date | null = null
          let type = 'empty'
          let formula: string | undefined

          if (cell.value !== null && cell.value !== undefined) {
            isEmpty = false

            if (cell.formula || cell.sharedFormula) {
              type = 'formula'
              formula = cell.formula || cell.sharedFormula
              value = cell.result as string | number | boolean | Date | null
            } else if (cell.value instanceof Date) {
              type = 'date'
              value = cell.value
            } else if (typeof cell.value === 'object' && 'richText' in cell.value) {
              type = 'richText'
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              value = (cell.value.richText as any[]).map((rt) => rt.text).join('')
            } else if (typeof cell.value === 'object' && 'text' in cell.value) {
              type = 'hyperlink'
              value = (cell.value as { text: string }).text
            } else if (typeof cell.value === 'number') {
              type = 'number'
              value = cell.value
              hasNumericValue = true
            } else if (typeof cell.value === 'boolean') {
              type = 'boolean'
              value = cell.value
            } else {
              type = 'string'
              value = String(cell.value)
            }
          }

          // 스타일 정보
          const style: CellData['style'] = {}
          if (cell.font) {
            style.font = {
              bold: cell.font.bold,
              size: cell.font.size,
            }
          }
          if (cell.fill && cell.fill.type === 'pattern' && cell.fill.fgColor) {
            style.fill = { color: cell.fill.fgColor.argb }
          }
          if (cell.border && (cell.border.top || cell.border.bottom || cell.border.left || cell.border.right)) {
            style.border = true
          }
          if (cell.alignment) {
            style.alignment = {
              horizontal: cell.alignment.horizontal,
              vertical: cell.alignment.vertical,
            }
          }

          cells.push({
            address,
            row: rowNum,
            col: colNum,
            colLetter,
            value,
            type,
            formula,
            style: Object.keys(style).length > 0 ? style : undefined,
          })
        }

        rows.push({
          row: rowNum,
          cells,
          isEmpty,
          hasNumericValue,
        })
      }

      sheets.push({
        name: sheet.name,
        rowCount: sheet.rowCount,
        columnCount: sheet.columnCount,
        mergedCells,
        rows,
      })
    })

    const result: AnalyzedData = {
      fileName: file.name,
      sheets,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('엑셀 분석 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '엑셀 분석에 실패했습니다' },
      { status: 500 }
    )
  }
}
