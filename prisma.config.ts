import dotenv from 'dotenv'
import path from 'path'
import { defineConfig } from 'prisma/config'

// 프로젝트 루트의 .env 로드
dotenv.config({ path: path.resolve(__dirname, './.env') })

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://jangjingang@localhost:5432/smerp',
  },
  migrations: {
    seed: 'npx tsx ./prisma/seed.ts',
  },
})
