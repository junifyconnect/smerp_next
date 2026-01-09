import 'dotenv/config'
import prisma from '../lib/db'

async function main() {
  // 테스트용 유저 생성
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'sales@test.com' },
      update: {},
      create: {
        email: 'sales@test.com',
        passwordHash: 'test-hash',
        name: '김영업',
        department: 'SALES',
        position: '대리',
      },
    }),
    prisma.user.upsert({
      where: { email: 'teamlead@test.com' },
      update: {},
      create: {
        email: 'teamlead@test.com',
        passwordHash: 'test-hash',
        name: '박팀장',
        department: 'SALES',
        position: '팀장',
      },
    }),
    prisma.user.upsert({
      where: { email: 'ceo@test.com' },
      update: {},
      create: {
        email: 'ceo@test.com',
        passwordHash: 'test-hash',
        name: '이대표',
        department: 'ADMIN',
        position: '대표이사',
      },
    }),
  ])

  console.log('생성된 테스트 유저:')
  users.forEach(u => {
    console.log(`- ${u.name} (${u.position}): ${u.id}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
