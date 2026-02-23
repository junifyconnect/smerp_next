import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'

async function forceReset() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  const newPassword = 'admin123!'
  const passwordHash = await bcrypt.hash(newPassword, 10)
  
  const result = await pool.query(`
    UPDATE users 
    SET password_hash = $1 
    WHERE email = 'superadmin@servermate.net'
    RETURNING email
  `, [passwordHash])
  
  console.log('✅ 비밀번호 업데이트 완료!')
  console.log(`   Email: ${result.rows[0]?.email}`)
  console.log(`   Password: ${newPassword}`)
  console.log(`   Hash: ${passwordHash.substring(0, 20)}...`)
  
  await pool.end()
}

forceReset().catch(console.error)
