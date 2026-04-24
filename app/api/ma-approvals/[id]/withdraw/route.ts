import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'
import { notifyMAApprovalWithdrawn } from '@/lib/notifications/sender'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/ma-approvals/[id]/withdraw — MA 품의서 회수
// 결재 진행 중인 품의서를 DRAFT로 되돌리고 서명/결재자 정보 초기화
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params
    const currentUserId = session?.user?.id

    const approval = await prisma.mAApproval.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        approvalNumber: true,
        createdById: true,
        salesManagerId: true,
        teamLeaderId: true,
        ceoId: true,
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: 'MA 품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // TODO(auth): MA create API가 아직 세션 기반이 아니라 createdById='dummy-user-id'인 경우가 있음.
    if (
      currentUserId &&
      approval.createdById !== currentUserId &&
      approval.createdById !== 'dummy-user-id'
    ) {
      return NextResponse.json(
        { error: '본인이 작성한 품의서만 회수할 수 있습니다' },
        { status: 403 }
      )
    }

    const withdrawableStatuses = ['PENDING', 'PENDING_TEAM_LEAD', 'PENDING_CEO']
    if (!withdrawableStatuses.includes(approval.status)) {
      return NextResponse.json(
        {
          error: `현재 상태(${approval.status})에서는 회수할 수 없습니다. 결재 진행 중인 품의서만 회수 가능합니다.`,
        },
        { status: 400 }
      )
    }

    // MA는 승인 전이라 아직 MAContract/MABilling이 없음.
    // DRAFT 복귀 + 서명/결재자 초기화만 수행.
    const updated = await prisma.mAApproval.update({
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
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })

    // 결재자들에게 회수 알림 (비동기)
    prisma.mAApprovalItem
      .findFirst({
        where: { approvalId: id },
        select: { clientCompany: true, salesCompany: true },
      })
      .then((item) =>
        notifyMAApprovalWithdrawn({
          id: approval.id,
          approvalNumber: approval.approvalNumber,
          clientCompany: item?.clientCompany || item?.salesCompany || null,
          createdById: approval.createdById,
          salesManagerId: approval.salesManagerId,
          teamLeaderId: approval.teamLeaderId,
          ceoId: approval.ceoId,
        })
      )
      .catch((err) => console.error('MA 회수 알림 실패:', err))

    return NextResponse.json({
      message: 'MA 품의서가 회수되었습니다. 작성중 상태로 변경되었습니다.',
      approval: updated,
    })
  } catch (error) {
    console.error('MA 회수 처리 오류:', error)
    return NextResponse.json(
      { error: '회수 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}
