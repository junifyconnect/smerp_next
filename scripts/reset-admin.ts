import 'dotenv/config'
import bcrypt from 'bcryptjs'
import prisma from '../lib/db'

async function resetAdmin() {
  const newPassword = 'admin123!'
  const passwordHash = await bcrypt.hash(newPassword, 10)

  // 기존 admin 찾기
  const existing = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: { contains: 'admin' } },
        { role: 'ADMIN' }
      ]
    }
  })

  if (existing) {
    // 비밀번호 리셋
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash }
    })
    console.log(`✅ 비밀번호 리셋 완료!`)
    console.log(`   Email: ${existing.email}`)
    console.log(`   Password: ${newPassword}`)
  } else {
    // 새로 생성
    const user = await prisma.user.create({
      data: {
        email: 'admin@smerp.com',
        name: '슈퍼관리자',
        passwordHash,
        department: 'ADMIN',
        role: 'ADMIN',
        isActive: true,
      }
    })
    console.log(`✅ 관리자 계정 생성 완료!`)
    console.log(`   Email: admin@smerp.com`)
    console.log(`   Password: ${newPassword}`)
  }

  await prisma.$disconnect()
}

resetAdmin().catch(console.error)
