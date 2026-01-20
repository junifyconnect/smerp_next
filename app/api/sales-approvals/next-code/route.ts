import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'

// GET /api/sales-approvals/next-code - 다음 품의코드 생성
export async function GET() {
  try {
    const session = await auth()

    // 이메일에서 사용자 ID 추출 (@ 앞부분)
    const userEmail = session?.user?.email || ''
    const userId = userEmail.split('@')[0] || ''

    if (!userId) {
      return NextResponse.json({ approvalCode: '' })
    }

    // 품의코드 자동생성 (사용자ID첫글자 + YYMMDD + -순번)
    // 예: H260119-01 (hmlee@servermate.net이 2026년 1월 19일 첫 번째 품의서)
    const today = new Date()
    const yy = String(today.getFullYear()).slice(-2)
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const dateStr = `${yy}${mm}${dd}`
    const initial = userId.charAt(0).toUpperCase()

    // 해당 날짜 + 이니셜로 시작하는 품의코드 중 마지막 순번 조회
    const prefix = `${initial}${dateStr}-`
    const lastCodeApproval = await prisma.salesApproval.findFirst({
      where: { approvalCode: { startsWith: prefix } },
      orderBy: { approvalCode: 'desc' },
    })

    let codeSequence = 1
    if (lastCodeApproval?.approvalCode) {
      const lastSeq = parseInt(lastCodeApproval.approvalCode.split('-')[1])
      if (!isNaN(lastSeq)) {
        codeSequence = lastSeq + 1
      }
    }

    const approvalCode = `${prefix}${String(codeSequence).padStart(2, '0')}`

    return NextResponse.json({ approvalCode })
  } catch (error) {
    console.error('품의코드 생성 오류:', error)
    return NextResponse.json({ approvalCode: '' })
  }
}
