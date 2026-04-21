/**
 * scripts/test-invoices.ts
 *
 * 계산서 발행 이력(InvoiceRecord) 기능 수동 테스트 스크립트.
 *
 * 전제조건:
 *   1) dev 서버가 실행 중이어야 함 (기본 http://localhost:3000)
 *      - env.TEST_BASE_URL로 재정의 가능
 *   2) DATABASE_URL이 .env.local에 설정되어 있어야 함
 *   3) 테스트용 SalesApproval 레코드가 DB에 최소 1개 존재해야 함
 *      - env.TEST_APPROVAL_ID로 지정 가능. 미지정 시 최신 APPROVED 품의서 1건 자동 선택.
 *
 * 실행:
 *   npx tsx scripts/test-invoices.ts
 *
 * 커버하는 시나리오:
 *   1) 테스트 InvoiceRecord 생성 (직접 DB)
 *   2) POST /api/management/invoices/issue       : PENDING → ISSUED
 *   3) POST /api/management/invoices/amend       : ISSUED → CANCELLED(AMENDED) + 신규 PENDING(amendedFromId 연결)
 *   4) POST /api/management/invoices/issue       : 신규 PENDING → ISSUED (수정세금계산서 발행)
 *   5) POST /api/management/invoices/cancel      : ISSUED → CANCELLED(USER_CANCELLED)
 *   6) GET  /api/management/invoices?approvalId= : 체인 조회 (amendedFrom + amendments 포함)
 *   7) chain helper 직접 호출: getChainRoot / getChainAll / getChainHead
 *   8) cleanup: 생성한 InvoiceRecord 전부 삭제
 *
 * 주의: 서명 플로우(sign/route.ts) Revise 분기의 InvoiceRecord 전이 검증은
 *       실제 품의서 버전 체인이 필요해 이 스크립트 범위 밖이다. UI/E2E에서 별도 검증.
 */
import 'dotenv/config'
import prisma from '../lib/db'
import { getChainRoot, getChainAll, getChainHead } from '../lib/invoices/chain'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

type AnyRec = Record<string, unknown>

async function post(path: string, body: AnyRec): Promise<AnyRec> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as AnyRec
  if (!res.ok) {
    throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(json)}`)
  }
  return json
}

async function get(path: string): Promise<AnyRec> {
  const res = await fetch(`${BASE}${path}`)
  const json = (await res.json()) as AnyRec
  if (!res.ok) {
    throw new Error(`GET ${path} → ${res.status}: ${JSON.stringify(json)}`)
  }
  return json
}

function log(step: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`\n▶ ${step}\n  →`, JSON.stringify(data, null, 2))
  } else {
    console.log(`\n▶ ${step}`)
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(`❌ ASSERT FAILED: ${msg}`)
  }
  console.log(`  ✓ ${msg}`)
}

async function pickTestApprovalId(): Promise<string> {
  const fromEnv = process.env.TEST_APPROVAL_ID
  if (fromEnv) return fromEnv
  const approval = await prisma.salesApproval.findFirst({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, approvalNumber: true },
  })
  if (!approval) {
    throw new Error(
      'TEST_APPROVAL_ID를 지정하거나 APPROVED 상태의 품의서가 DB에 존재해야 합니다.'
    )
  }
  console.log(`  (auto-selected approval: ${approval.approvalNumber} ${approval.id})`)
  return approval.id
}

async function main() {
  console.log(`[test-invoices] BASE=${BASE}`)
  const approvalId = await pickTestApprovalId()
  const createdIds: string[] = []

  try {
    // ── 1. 테스트 InvoiceRecord 생성 (SALES, PENDING)
    log('1) 테스트 InvoiceRecord 생성 (SALES, PENDING)')
    const seed = await prisma.invoiceRecord.create({
      data: {
        approvalId,
        invoiceType: 'SALES',
        productName: '[TEST] 테스트 품목',
        quantity: 1,
        unitPrice: 10000,
        totalPrice: 10000,
        clientCompany: '[TEST] 테스트 거래처',
        status: 'PENDING',
      },
    })
    createdIds.push(seed.id)
    console.log(`  seedId = ${seed.id}`)

    // ── 2. issue: PENDING → ISSUED
    log('2) POST /api/management/invoices/issue')
    const issued = (await post('/api/management/invoices/issue', {
      id: seed.id,
      invoiceNumber: 'TEST-INV-0001',
      remarks: '테스트 발행',
    })) as AnyRec
    assert(issued.status === 'ISSUED', 'status → ISSUED')
    assert(issued.invoiceNumber === 'TEST-INV-0001', 'invoiceNumber 저장됨')
    assert(issued.invoiceDate, 'invoiceDate 자동 설정됨')

    // 2b. PENDING 아닌 상태에서 재발행 시 409 기대
    log('2b) 이미 ISSUED 상태에서 재발행 → 409')
    const dupRes = await fetch(`${BASE}/api/management/invoices/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: seed.id }),
    })
    assert(dupRes.status === 409, '409 반환')

    // ── 3. amend: ISSUED → CANCELLED(AMENDED) + 신규 PENDING
    log('3) POST /api/management/invoices/amend')
    const amended = (await post('/api/management/invoices/amend', {
      id: seed.id,
      newData: {
        quantity: 2,
        unitPrice: 15000,
        totalPrice: 30000,
        remarks: '수량/단가 수정',
      },
    })) as AnyRec
    createdIds.push(amended.id as string)
    assert(amended.status === 'PENDING', '신규 레코드 status = PENDING')
    assert(amended.amendedFromId === seed.id, 'amendedFromId = 원본 id')
    assert(Number(amended.quantity) === 2, 'newData 반영 (quantity)')
    assert(Number(amended.totalPrice) === 30000, 'newData 반영 (totalPrice)')
    assert(amended.invoiceNumber === null, '신규 레코드 invoiceNumber 비어있음')

    // 3b. 원본이 CANCELLED(AMENDED)로 전이됐는지 확인
    const originalAfter = await prisma.invoiceRecord.findUnique({ where: { id: seed.id } })
    assert(originalAfter?.status === 'CANCELLED', '원본 → CANCELLED')
    assert(originalAfter?.cancelReason === 'AMENDED', 'cancelReason = AMENDED')

    // ── 4. 수정 레코드 issue: PENDING → ISSUED
    log('4) POST /api/management/invoices/issue (수정 레코드)')
    const amendedIssued = (await post('/api/management/invoices/issue', {
      id: amended.id,
      invoiceNumber: 'TEST-INV-0001-R1',
    })) as AnyRec
    assert(amendedIssued.status === 'ISSUED', '수정 레코드 → ISSUED')

    // ── 5. cancel: ISSUED → CANCELLED
    log('5) POST /api/management/invoices/cancel (수정 레코드 최종 취소)')
    const cancelled = (await post('/api/management/invoices/cancel', {
      id: amended.id,
      reason: 'USER_CANCELLED',
    })) as AnyRec
    assert(cancelled.status === 'CANCELLED', 'status → CANCELLED')
    assert(cancelled.cancelReason === 'USER_CANCELLED', 'cancelReason 저장됨')

    // 5b. reason 누락 시 400
    log('5b) reason 누락 → 400')
    const noReason = await fetch(`${BASE}/api/management/invoices/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: seed.id }),
    })
    assert(noReason.status === 400, '400 반환')

    // ── 6. GET 체인 조회
    log('6) GET /api/management/invoices?approvalId=...')
    const list = (await get(
      `/api/management/invoices?approvalId=${approvalId}&invoiceType=SALES`
    )) as AnyRec
    const items = list.items as AnyRec[]
    const testItems = items.filter((r) =>
      typeof r.productName === 'string' && (r.productName as string).startsWith('[TEST]')
    )
    assert(testItems.length >= 2, '테스트 생성분 2건 이상 반환')
    const amendedItem = testItems.find((r) => r.id === amended.id) as AnyRec | undefined
    assert(amendedItem !== undefined, '수정 레코드 조회됨')
    assert(
      (amendedItem?.amendedFrom as AnyRec | null)?.id === seed.id,
      'amendedFrom.id = 원본 id'
    )

    // ── 7. chain helper 직접 호출
    log('7) chain helpers')
    const root = await getChainRoot(amended.id as string)
    assert(root?.id === seed.id, 'getChainRoot(amended) = 원본')
    const all = await getChainAll(amended.id as string)
    assert(all.length === 2, 'getChainAll length = 2')
    assert(
      all.map((r) => r.id).includes(seed.id) && all.map((r) => r.id).includes(amended.id as string),
      'getChainAll에 원본 + 수정본 포함'
    )
    const head = await getChainHead(amended.id as string)
    // 원본 CANCELLED, 수정본 CANCELLED → active 없으므로 null
    assert(head === null, 'getChainHead = null (모두 CANCELLED)')

    console.log('\n✅ 모든 테스트 통과')
  } finally {
    // ── cleanup
    console.log('\n[cleanup] 생성한 InvoiceRecord 삭제')
    // amendedFromId 연결 때문에 자식 먼저 삭제
    for (const id of [...createdIds].reverse()) {
      await prisma.invoiceRecord
        .delete({ where: { id } })
        .catch((e) => console.warn(`  cleanup ${id} 실패:`, (e as Error).message))
    }
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('\n💥 TEST FAILED')
  console.error(err)
  prisma.$disconnect().finally(() => process.exit(1))
})
