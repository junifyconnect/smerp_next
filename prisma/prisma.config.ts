import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: './schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://jangjingang@localhost:5432/smerp',
  },
})
