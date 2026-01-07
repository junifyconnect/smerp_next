import { DocType } from '@prisma/client'
import prisma from './db'

const DOC_PREFIX: Record<DocType, string> = {
  SALES_QUOTE: 'Q',
  SALES_APPROVAL: 'A',
  SALES_ORDER: 'PO',
  MA_QUOTE: 'MQ',
  MA_APPROVAL: 'MA',
}

/**
 * 
 * 문서번호 생성
 * 형식: {PREFIX}-{YEAR}-{SEQUENCE}
 * 예: Q-2025-0001, A-2025-0042
 */
export async function generateDocNumber(docType: DocType): Promise<string> {
  const prefix = DOC_PREFIX[docType]
  const year = new Date().getFullYear()
  const yearPrefix = `${prefix}-${year}-`

  // 해당 연도의 마지막 문서번호 조회
  const lastDoc = await prisma.document.findFirst({
    where: {
      docNumber: {
        startsWith: yearPrefix,
      },
    },
    orderBy: {
      docNumber: 'desc',
    },
    select: {
      docNumber: true,
    },
  })

  let sequence = 1
  if (lastDoc) {
    const lastSequence = parseInt(lastDoc.docNumber.split('-')[2], 10)
    sequence = lastSequence + 1
  }

  return `${yearPrefix}${sequence.toString().padStart(4, '0')}`
}

/**
 * 금액 포맷
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount)
}

/**
 * 날짜 포맷
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
