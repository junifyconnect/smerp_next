const fs = require('fs')
const path = require('path')
const ExcelJS = require('exceljs')

const ROOT_DIR = path.join(__dirname, '..')

async function testParse() {
  const files = [
    { path: path.join(ROOT_DIR, 'templates/sales-quote.xlsx'), type: 'SALES_QUOTE' },
    { path: path.join(ROOT_DIR, 'templates/sales-approval.xlsx'), type: 'SALES_APPROVAL' },
    { path: path.join(ROOT_DIR, 'templates/sales-order.xlsx'), type: 'SALES_ORDER' },
    { path: path.join(ROOT_DIR, 'templates/ma-quote.xlsx'), type: 'MA_QUOTE' },
    { path: path.join(ROOT_DIR, 'templates/ma-approval.xlsx'), type: 'MA_APPROVAL' },
  ]

  for (const file of files) {
    console.log('\n' + '='.repeat(60))
    console.log(`테스트: ${file.type}`)
    console.log(`파일: ${file.path}`)
    console.log('='.repeat(60))

    try {
      // 파일 존재 확인
      if (!fs.existsSync(file.path)) {
        console.log('✗ 파일이 존재하지 않습니다')
        continue
      }

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(file.path)

      console.log('워크시트 수:', workbook.worksheets.length)

      workbook.worksheets.forEach((ws, idx) => {
        console.log(`  [${idx}] 시트명: "${ws.name}", 행: ${ws.rowCount}, 열: ${ws.columnCount}`)
      })

      const sheet = workbook.worksheets[0]
      if (!sheet) {
        console.log('✗ 첫 번째 워크시트가 없습니다')
        continue
      }

      // 몇 가지 주요 셀 확인
      if (file.type === 'SALES_QUOTE') {
        console.log('\n주요 셀 값:')
        console.log('  C6 (회사):', getCellValue(sheet, 'C6'))
        console.log('  C7 (참조):', getCellValue(sheet, 'C7'))
        console.log('  C14 (견적일):', getCellValue(sheet, 'C14'))
        console.log('  E28 (합계):', getCellValue(sheet, 'E28'))
      } else if (file.type === 'SALES_APPROVAL') {
        console.log('\n주요 셀 값:')
        console.log('  D9 (품의코드):', getCellValue(sheet, 'D9'))
        console.log('  D10 (품의일자):', getCellValue(sheet, 'D10'))
        console.log('  D13 (매출처):', getCellValue(sheet, 'D13'))
        console.log('  G22 (합계):', getCellValue(sheet, 'G22'))
      } else if (file.type === 'SALES_ORDER') {
        console.log('\n주요 셀 값:')
        console.log('  B6 (매입처):', getCellValue(sheet, 'B6'))
        console.log('  F7 (발주일):', getCellValue(sheet, 'F7'))
        console.log('  G29 (합계):', getCellValue(sheet, 'G29'))
      } else if (file.type === 'MA_QUOTE') {
        console.log('\n주요 셀 값:')
        console.log('  B4 (수신):', getCellValue(sheet, 'B4'))
        console.log('  I6 (날짜):', getCellValue(sheet, 'I6'))
        console.log('  D16 (고객명):', getCellValue(sheet, 'D16'))
        console.log('  I22 (합계):', getCellValue(sheet, 'I22'))
      } else if (file.type === 'MA_APPROVAL') {
        console.log('\n주요 셀 값:')
        console.log('  E6 (품의일자):', getCellValue(sheet, 'E6'))
        console.log('  E7 (담당자):', getCellValue(sheet, 'E7'))
        console.log('  F12 (고객사):', getCellValue(sheet, 'F12'))
      }

      console.log('\n✓ 파싱 테스트 완료')
    } catch (e) {
      console.log('✗ 에러:', e.message)
      console.log('  스택:', e.stack?.split('\n')[1])
    }
  }
}

function getCellValue(sheet, address) {
  const cell = sheet.getCell(address)
  const value = cell.value
  if (value === null || value === undefined) return '(빈 셀)'
  if (typeof value === 'object') {
    if (value.result !== undefined) return String(value.result).substring(0, 50)
    if (value.text) return String(value.text).substring(0, 50)
    if (value.richText) return value.richText.map(r => r.text).join('').substring(0, 50)
    if (value instanceof Date) return value.toISOString()
  }
  return String(value).substring(0, 50)
}

testParse().catch(console.error)
