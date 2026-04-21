/**
 * 계산서 발행 현황 UI 헬퍼
 *
 * 재설계(2026-04-20) 이후:
 *   - API 응답의 행 단위가 InvoiceRecord 하나 = 한 행으로 이미 flat.
 *   - flattenGroups() 필요 없음 (제거).
 *   - UI는 groups[].records[] 를 직접 렌더링. 품의서 rowSpan은 렌더 로직에서 처리.
 */

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return ''
  return Number(num).toLocaleString()
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

export function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0]
}

/**
 * 현재 월을 YYYY-MM 형식으로 반환
 */
export function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}
