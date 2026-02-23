import 'dotenv/config'

import { Pool } from 'pg'

async function checkUsers() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  const result = await pool.query(`
    SELECT id, email, name, password_hash IS NOT NULL as has_password, is_active, role
    FROM users 
    LIMIT 10
  `)
  
  console.log('Users in DB:')
  console.table(result.rows)
  
  await pool.end()
}

checkUsers().catch(console.error)
