/**
 * MA 견적서 파서 테스트 스크립트
 * 사용법: npx tsx scripts/test-ma-parser.ts
 */

import * as fs from 'fs'
import { parseExcel } from '../lib/excel/parser'

const testFiles = [
  {
    name: 'V1 (ERP 예시용)',
    path: 'planning/ma_quotation/4. MA견적서-견적요청회사(유지보수 제품명)_(견적서 날짜)_ERP 예시용 유지보수 견적서.xlsx',
  },
  {
    name: 'V2 (주니파이커넥트)',
    path: 'planning/ma_quotation/MA견적서-주니파이커넥트_20250402_유지보수 견적서 예시 파일.xlsx',
  },
]

async function main() {
  console.log('=== MA 견적서 파서 테스트 ===\n')

  for (const file of testFiles) {
    console.log(`\n--- ${file.name} ---`)
    console.log(`파일: ${file.path}`)

    if (!fs.existsSync(file.path)) {
      console.log('❌ 파일을 찾을 수 없습니다.')
      continue
    }

    try {
      const buffer = fs.readFileSync(file.path)
      const result = await parseExcel(buffer, 'MA_QUOTE')

      console.log('\n✅ 파싱 성공!')
      console.log('\n[기본 정보]')
      console.log(`  고객사: ${result.clientCompany || '(없음)'}`)
      console.log(`  담당자: ${result.clientContact || '(없음)'}`)
      console.log(`  견적담당: ${result.approvalManager || '(없음)'}`)
      console.log(`  견적일: ${result.quoteDate?.toISOString().split('T')[0] || '(없음)'}`)
      console.log(`  설치주소: ${result.deliveryAddress || '(없음)'}`)

      console.log('\n[MA 품목]')
      if (result.maItems && result.maItems.length > 0) {
        result.maItems.forEach((item, i) => {
          console.log(`  ${i + 1}. ${item.productName || '제품명없음'}`)
          console.log(`     M/T: ${item.modelType || '-'}, S/N: ${item.serialNumber || '-'}`)
          console.log(`     서비스: ${item.serviceLevel || '-'}`)
          console.log(`     기간: ${item.period || '-'} (${item.startDate?.toISOString().split('T')[0] || '-'} ~ ${item.endDate?.toISOString().split('T')[0] || '-'})`)
          console.log(`     금액: ${item.totalPrice?.toLocaleString() || 0}원`)
        })
      } else {
        console.log('  (품목 없음)')
      }

      console.log('\n[합계]')
      console.log(`  총액 (VAT별도): ${result.totalAmount?.toLocaleString() || 0}원`)
      if (result.totalWithVat) {
        console.log(`  총액 (VAT포함): ${result.totalWithVat.toLocaleString()}원`)
      }

      console.log('\n[조건]')
      console.log(`  서비스기간: ${result.serviceTerms || '(없음)'}`)
      console.log(`  유효기간: ${result.validUntil || '(없음)'}`)
      console.log(`  지급조건: ${result.paymentTerms || '(없음)'}`)
      console.log(`  특약사항: ${result.specialTerms || '(없음)'}`)

    } catch (error) {
      console.log(`❌ 파싱 실패: ${error instanceof Error ? error.message : error}`)
    }
  }

  console.log('\n\n=== 테스트 완료 ===')
}

main()
