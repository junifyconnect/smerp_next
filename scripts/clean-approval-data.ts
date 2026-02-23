import 'dotenv/config'
import { Pool } from 'pg'

async function cleanApprovalData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  console.log('🧹 품의서 관련 데이터 정리 시작...')
  
  // 순서 중요 (FK 제약)
  const tables = [
    'sales_approval_purchase_item_details',
    'sales_approval_purchase_items',
    'sales_approval_item_details',
    'sales_approval_items',
    'sales_approval_files',
    'invoice_records',
    'sales_approvals',
  ]
  
  for (const table of tables) {
    const result = await pool.query(`DELETE FROM ${table}`)
    console.log(`  ✓ ${table}: ${result.rowCount}건 삭제`)
  }
  
  console.log('\n✅ 완료!')
  await pool.end()
}

cleanApprovalData().catch(console.error)
