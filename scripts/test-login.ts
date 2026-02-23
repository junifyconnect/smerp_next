import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'

async function testLogin() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  const email = 'superadmin@servermate.net'
  const password = 'admin123!'
  
  // 1. 유저 조회
  const result = await pool.query(`
    SELECT id, email, password_hash, is_active
    FROM users 
    WHERE email = $1
  `, [email])
  
  if (result.rows.length === 0) {
    console.log('❌ 유저 없음')
    await pool.end()
    return
  }
  
  const user = result.rows[0]
  console.log('유저 찾음:', user.email)
  console.log('is_active:', user.is_active)
  console.log('password_hash 존재:', !!user.password_hash)
  console.log('password_hash 앞부분:', user.password_hash?.substring(0, 30))
  
  // 2. 비밀번호 검증
  const isValid = await bcrypt.compare(password, user.password_hash)
  console.log('비밀번호 일치:', isValid)
  
  // 3. 직접 해시 테스트
  const newHash = await bcrypt.hash(password, 10)
  const testCompare = await bcrypt.compare(password, newHash)
  console.log('새 해시 테스트:', testCompare)
  
  await pool.end()
}

testLogin().catch(console.error)
