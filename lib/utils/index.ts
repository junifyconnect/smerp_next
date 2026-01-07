import { DocType } from '@prisma/client'
import prisma from '@/lib/db/prisma'

// 문서번호 접두사
const DOC_PREFIX: Record<DocType, string> = {
  SALES_QUOTE: 'Q',
  SALES_APPROVAL: 'A',
  SALES_ORDER: 'PO',
  MA_QUOTE: 'MQ',
  MA_APPROVAL: 'MA',
}

/**
 * 새 문서번호 생성
 * 형식: {PREFIX}-{YYYY}-{순번4자리}
 * 예: Q-2025-0001, A-2025-0023
 */
export async function generateDocNumber(docType: DocType): Promise<string> {
  const prefix = DOC_PREFIX[docType]
  const year = new Date().getFullYear()
  const pattern = `${prefix}-${year}-%`
  
  // 해당 연도의 마지막 문서번호 조회
  const lastDoc = await prisma.document.findFirst({
    where: {
      docNumber: { startsWith: `${prefix}-${year}-` },
    },
    orderBy: { docNumber: 'desc' },
    select: { docNumber: true },
  })
  
  let nextNum = 1
  if (lastDoc?.docNumber) {
    const lastNum = parseInt(lastDoc.docNumber.split('-')[2])
    if (!isNaN(lastNum)) nextNum = lastNum + 1
  }
  
  return `${prefix}-${year}-${nextNum.toString().padStart(4, '0')}`
}

/**
 * 금액 포맷 (천단위 콤마)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '-'
  return new Intl.NumberFormat('ko-KR').format(amount)
}

/**
 * 날짜 포맷
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * 날짜+시간 포맷
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 문서 상태 한글명
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: '작성중',
    SUBMITTED: '제출됨',
    APPROVED: '승인됨',
    REJECTED: '반려됨',
    COMPLETED: '완료',
  }
  return labels[status] ?? status
}

/**
 * 문서 타입 한글명
 */
export function getDocTypeLabel(docType: DocType): string {
  const labels: Record<DocType, string> = {
    SALES_QUOTE: '견적서',
    SALES_APPROVAL: '품의서',
    SALES_ORDER: '발주서',
    MA_QUOTE: '유지보수 견적서',
    MA_APPROVAL: '유지보수 품의서',
  }
  return labels[docType] ?? docType
}
