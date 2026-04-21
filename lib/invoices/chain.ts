import type { InvoiceRecord } from '@prisma/client'
import prisma from '@/lib/db'

/**
 * InvoiceRecord 수정 체인 관리 헬퍼
 *
 * amendedFromId self-relation을 통해 계산서 수정 이력을 추적한다.
 * - chain root: amendedFromId === null인 최초 레코드
 * - chain head: amendments[]가 비어있거나 모두 CANCELLED인 마지막 유효 레코드
 * - 원본은 amend 시 CANCELLED(reason=AMENDED)로 전이되고, 신규 레코드가 amendedFromId로 연결된다.
 */

export async function getChainRoot(invoiceId: string): Promise<InvoiceRecord | null> {
  let current = await prisma.invoiceRecord.findUnique({ where: { id: invoiceId } })
  if (!current) return null
  while (current.amendedFromId) {
    const prev: InvoiceRecord | null = await prisma.invoiceRecord.findUnique({
      where: { id: current.amendedFromId },
    })
    if (!prev) break
    current = prev
  }
  return current
}

export async function getChainAll(invoiceId: string): Promise<InvoiceRecord[]> {
  const root = await getChainRoot(invoiceId)
  if (!root) return []
  const visited = new Set<string>([root.id])
  const result: InvoiceRecord[] = [root]
  const queue: string[] = [root.id]
  while (queue.length) {
    const id = queue.shift() as string
    const children = await prisma.invoiceRecord.findMany({
      where: { amendedFromId: id },
      orderBy: { createdAt: 'asc' },
    })
    for (const c of children) {
      if (!visited.has(c.id)) {
        visited.add(c.id)
        result.push(c)
        queue.push(c.id)
      }
    }
  }
  return result
}

/**
 * 체인에서 현재 유효한(latest active) 레코드. CANCELLED는 제외.
 * 유효 후보 중 가장 최근 createdAt.
 */
export async function getChainHead(invoiceId: string): Promise<InvoiceRecord | null> {
  const chain = await getChainAll(invoiceId)
  const active = chain.filter((r) => r.status !== 'CANCELLED')
  if (active.length === 0) return null
  return active.reduce((latest, r) => (r.createdAt > latest.createdAt ? r : latest), active[0])
}
