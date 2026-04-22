/**
 * E2E 테스트 데이터 정리 스크립트
 *
 * 사용:
 *   npx tsx scripts/e2e-cleanup.ts --dry-run            # 삭제 대상만 출력
 *   npx tsx scripts/e2e-cleanup.ts --scope=all           # E2E 데이터만 삭제
 *   npx tsx scripts/e2e-cleanup.ts --scope=masters       # 거래처/팀장만
 *   npx tsx scripts/e2e-cleanup.ts --scope=approval      # 품의서(+원장/InvoiceRecord)만
 *   npx tsx scripts/e2e-cleanup.ts --scope=invoice       # InvoiceRecord만
 *   npx tsx scripts/e2e-cleanup.ts --all                 # superadmin 제외 전부 와이프 (위험)
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const wipeAll = args.includes('--all')
const scope = (args.find((a) => a.startsWith('--scope='))?.split('=')[1] as
  | 'all'
  | 'masters'
  | 'approval'
  | 'invoice'
  | undefined) ?? 'all'

// E2E로 만들어진 테스트 데이터 네이밍 패턴
const E2E_PATTERNS = {
  customerName: ['(주)테스트컴퍼니'],
  vendorName: ['(주)테스트공급사'],
  userEmails: ['teamlead1@servermate.net'], // superadmin 제외
  approvalPrefix: 'SA-2026-', // 이번 테스트에서 생성된 품의번호
}

const SUPERADMIN_EMAIL = 'superadmin@servermate.net'

async function identifyTargets() {
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { in: E2E_PATTERNS.customerName } },
        { name: { contains: 'E2E' } },
      ],
    },
    select: { id: true, name: true, createdAt: true },
  })

  const vendors = await prisma.vendor.findMany({
    where: {
      OR: [
        { name: { in: E2E_PATTERNS.vendorName } },
        { name: { contains: 'E2E' } },
      ],
    },
    select: { id: true, name: true, createdAt: true },
  })

  const users = await prisma.user.findMany({
    where: {
      email: { in: E2E_PATTERNS.userEmails },
      NOT: { email: SUPERADMIN_EMAIL },
    },
    select: { id: true, email: true, name: true },
  })

  const approvals = await prisma.salesApproval.findMany({
    where: { approvalNumber: { startsWith: E2E_PATTERNS.approvalPrefix } },
    select: { id: true, approvalNumber: true, clientCompany: true, status: true },
  })

  const approvalIds = approvals.map((a) => a.id)

  const [invoiceRecords, salesLedgers, purchaseLedgers, salesItems, salesProducts] =
    await Promise.all([
      prisma.invoiceRecord.count({ where: { approvalId: { in: approvalIds } } }),
      prisma.salesLedger.count({ where: { salesApprovalId: { in: approvalIds } } }),
      prisma.purchaseLedger.count({ where: { salesApprovalId: { in: approvalIds } } }),
      prisma.salesApprovalItem.count({
        where: { product: { approvalId: { in: approvalIds } } },
      }),
      prisma.salesApprovalProduct.count({
        where: { approvalId: { in: approvalIds } },
      }),
    ])

  return {
    customers,
    vendors,
    users,
    approvals,
    counts: {
      invoiceRecords,
      salesLedgers,
      purchaseLedgers,
      salesItems,
      salesProducts,
    },
  }
}

async function identifyAllTargets() {
  // --all: superadmin 제외 전부
  const customers = await prisma.customer.findMany({ select: { id: true, name: true } })
  const vendors = await prisma.vendor.findMany({ select: { id: true, name: true } })
  const users = await prisma.user.findMany({
    where: { NOT: { email: SUPERADMIN_EMAIL } },
    select: { id: true, email: true, name: true },
  })
  const approvals = await prisma.salesApproval.findMany({
    select: { id: true, approvalNumber: true },
  })
  const [invoiceRecords, salesLedgers, purchaseLedgers, salesItems, salesProducts, quotes, orders] =
    await Promise.all([
      prisma.invoiceRecord.count(),
      prisma.salesLedger.count(),
      prisma.purchaseLedger.count(),
      prisma.salesApprovalItem.count(),
      prisma.salesApprovalProduct.count(),
      prisma.salesQuote.count(),
      prisma.salesOrder.count(),
    ])
  return {
    customers,
    vendors,
    users,
    approvals,
    counts: { invoiceRecords, salesLedgers, purchaseLedgers, salesItems, salesProducts, quotes, orders },
  }
}

function printReport(t: Awaited<ReturnType<typeof identifyTargets>> | Awaited<ReturnType<typeof identifyAllTargets>>) {
  console.log('🗑️  삭제 예정:')
  console.log(`  - 매출처: ${t.customers.length}개`)
  t.customers.slice(0, 5).forEach((c: { name: string }) => console.log(`      · ${c.name}`))
  console.log(`  - 매입처: ${t.vendors.length}개`)
  t.vendors.slice(0, 5).forEach((v: { name: string }) => console.log(`      · ${v.name}`))
  console.log(`  - 사용자: ${t.users.length}명`)
  t.users.forEach((u: { email: string; name: string | null }) =>
    console.log(`      · ${u.email} (${u.name ?? '이름없음'})`)
  )
  console.log(`  - 품의서: ${t.approvals.length}건`)
  t.approvals.slice(0, 5).forEach((a: { approvalNumber: string }) =>
    console.log(`      · ${a.approvalNumber}`)
  )
  console.log(`  - InvoiceRecord: ${t.counts.invoiceRecords}건`)
  console.log(`  - 매출장(SalesLedger): ${t.counts.salesLedgers}건`)
  console.log(`  - 매입장(PurchaseLedger): ${t.counts.purchaseLedgers}건`)
  console.log(`  - SalesApprovalItem: ${t.counts.salesItems}건`)
  console.log(`  - SalesApprovalProduct: ${t.counts.salesProducts}건`)
  if ('quotes' in t.counts) {
    console.log(`  - SalesQuote: ${t.counts.quotes}건`)
    console.log(`  - SalesOrder: ${t.counts.orders}건`)
  }
}

async function deleteScoped(t: Awaited<ReturnType<typeof identifyTargets>>) {
  const approvalIds = t.approvals.map((a) => a.id)
  const customerIds = t.customers.map((c) => c.id)
  const vendorIds = t.vendors.map((v) => v.id)
  const userIds = t.users.map((u) => u.id)

  let deleted = { invoiceRecords: 0, salesLedgers: 0, purchaseLedgers: 0, salesItems: 0, salesProducts: 0, approvalFiles: 0, approvals: 0, customers: 0, vendors: 0, users: 0 }

  if (approvalIds.length) {
    deleted.invoiceRecords = (await prisma.invoiceRecord.deleteMany({ where: { approvalId: { in: approvalIds } } })).count
    deleted.salesLedgers = (await prisma.salesLedger.deleteMany({ where: { salesApprovalId: { in: approvalIds } } })).count
    deleted.purchaseLedgers = (await prisma.purchaseLedger.deleteMany({ where: { salesApprovalId: { in: approvalIds } } })).count
    deleted.salesItems = (await prisma.salesApprovalItem.deleteMany({ where: { product: { approvalId: { in: approvalIds } } } })).count
    deleted.salesProducts = (await prisma.salesApprovalProduct.deleteMany({ where: { approvalId: { in: approvalIds } } })).count
    deleted.approvalFiles = (await prisma.salesApprovalFile.deleteMany({ where: { approvalId: { in: approvalIds } } })).count
    deleted.approvals = (await prisma.salesApproval.deleteMany({ where: { id: { in: approvalIds } } })).count
  }

  if (scope === 'all' || scope === 'masters') {
    if (customerIds.length) deleted.customers = (await prisma.customer.deleteMany({ where: { id: { in: customerIds } } })).count
    if (vendorIds.length) deleted.vendors = (await prisma.vendor.deleteMany({ where: { id: { in: vendorIds } } })).count
    if (userIds.length) deleted.users = (await prisma.user.deleteMany({ where: { id: { in: userIds } } })).count
  }

  return deleted
}

async function deleteAll() {
  // 전부 와이프 (superadmin 제외)
  const sup = await prisma.user.findUnique({ where: { email: SUPERADMIN_EMAIL }, select: { id: true } })
  if (!sup) throw new Error('superadmin을 찾을 수 없어 중단합니다')

  const deleted = {
    invoiceRecords: (await prisma.invoiceRecord.deleteMany({})).count,
    salesLedgers: (await prisma.salesLedger.deleteMany({})).count,
    purchaseLedgers: (await prisma.purchaseLedger.deleteMany({})).count,
    salesOrderItems: (await prisma.salesOrderItem.deleteMany({})).count,
    salesOrderFiles: (await prisma.salesOrderFile.deleteMany({})).count,
    salesOrders: (await prisma.salesOrder.deleteMany({})).count,
    salesQuoteItems: (await prisma.salesQuoteItem.deleteMany({})).count,
    salesQuoteProducts: (await prisma.salesQuoteProduct.deleteMany({})).count,
    salesQuoteFiles: (await prisma.salesQuoteFile.deleteMany({})).count,
    salesQuotes: (await prisma.salesQuote.deleteMany({})).count,
    salesItems: (await prisma.salesApprovalItem.deleteMany({})).count,
    salesProducts: (await prisma.salesApprovalProduct.deleteMany({})).count,
    approvalFiles: (await prisma.salesApprovalFile.deleteMany({})).count,
    approvals: (await prisma.salesApproval.deleteMany({})).count,
    customerContacts: (await prisma.customerContact.deleteMany({})).count,
    customers: (await prisma.customer.deleteMany({})).count,
    vendors: (await prisma.vendor.deleteMany({})).count,
    users: (await prisma.user.deleteMany({ where: { NOT: { id: sup.id } } })).count,
  }
  return deleted
}

async function main() {
  const db = process.env.DATABASE_URL ?? ''
  if (db.includes('prod') || db.includes('production')) {
    console.error('🚨 DATABASE_URL이 production으로 보입니다. 중단합니다.')
    process.exit(1)
  }

  console.log(`환경: ${db.replace(/:[^:@]+@/, ':***@')}`)
  console.log(`모드: ${wipeAll ? '--all (전체 와이프)' : `scope=${scope}`}${dryRun ? ' [DRY-RUN]' : ''}`)
  console.log('')

  const targets = wipeAll ? await identifyAllTargets() : await identifyTargets()
  printReport(targets)

  if (dryRun) {
    console.log('\n(dry-run) 실제 삭제는 수행하지 않았습니다.')
    await prisma.$disconnect()
    return
  }

  console.log('\n삭제 실행 중...')
  const result = wipeAll ? await deleteAll() : await deleteScoped(targets as Awaited<ReturnType<typeof identifyTargets>>)

  console.log('\n✅ 정리 완료')
  Object.entries(result).forEach(([k, v]) => console.log(`  - ${k}: ${v}건`))

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
