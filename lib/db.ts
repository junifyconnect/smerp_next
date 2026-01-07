import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  // DB URL이 없으면 빈 adapter로 초기화 (빌드 시)
  if (!connectionString) {
    // 빌드 시에는 실제 DB 연결 없이 더미 풀 사용
    const dummyPool = new Pool({ connectionString: 'postgresql://localhost:5432/dummy' })
    const adapter = new PrismaPg(dummyPool)
    return new PrismaClient({ adapter })
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
