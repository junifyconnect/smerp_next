import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/sales-approvals/[id]/withdraw - 품의서 회수
// 결재 진행 중인 품의서를 DRAFT로 되돌리고 서명 정보 초기화
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params
    const currentUserId = session?.user?.id

    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        createdById: true,
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 작성자만 회수 가능
    if (approval.createdById !== currentUserId) {
      return NextResponse.json(
        { error: '본인이 작성한 품의서만 회수할 수 있습니다' },
        { status: 403 }
      )
    }

    // PENDING 계열만 회수 가능
    const withdrawableStatuses = ['PENDING', 'PENDING_TEAM_LEAD', 'PENDING_CEO']
    if (!withdrawableStatuses.includes(approval.status)) {
      return NextResponse.json(
        { error: `현재 상태(${approval.status})에서는 회수할 수 없습니다. 결재 진행 중인 품의서만 회수 가능합니다.` },
        { status: 400 }
      )
    }

    // ISSUED 상태 계산서 체크
    const issuedInvoices = await prisma.invoiceRecord.count({
      where: { approvalId: id, status: 'ISSUED' },
    })

    if (issuedInvoices > 0) {
      return NextResponse.json(
        { error: `이미 발행완료된 계산서가 ${issuedInvoices}건 있어 회수할 수 없습니다. 먼저 계산서를 취소해주세요.` },
        { status: 400 }
      )
    }

    // DRAFT로 되돌리기 + 서명 초기화 + 삭제 가능한 InvoiceRecord 삭제
    const updated = await prisma.$transaction(async (tx) => {
      // PENDING/NOT_REQUIRED 상태 InvoiceRecord 삭제
      await tx.invoiceRecord.deleteMany({
        where: {
          approvalId: id,
          status: { in: ['PENDING', 'NOT_REQUIRED'] },
        },
      })

      return tx.salesApproval.update({
        where: { id },
        data: {
          status: 'DRAFT',
          salesManagerId: null,
          salesManagerSignedAt: null,
          teamLeaderId: null,
          teamLeaderSignedAt: null,
          ceoId: null,
          ceoSignedAt: null,
        },
        include: {
          products: {
            include: { items: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    })

    return NextResponse.json({
      message: '품의서가 회수되었습니다. 작성중 상태로 변경되었습니다.',
      approval: updated,
    })
  } catch (error) {
    console.error('회수 처리 오류:', error)
    return NextResponse.json(
      { error: '회수 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}
