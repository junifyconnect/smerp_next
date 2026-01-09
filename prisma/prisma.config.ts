import path from 'path'
import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

// Load .env from parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') })

export default defineConfig({
  earlyAccess: true,
  schema: './schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://jangjingang@localhost:5432/smerp',
  },
})
