import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/ma-approvals/[id]/submit — 기안하기 (DRAFT → PENDING)
// 영업과 동일 플로우: submit 후 SALES_MANAGER가 서명하면 PENDING_TEAM_LEAD로 전환.
// 결재자 3명 지정은 PR #11(ApprovalLineModal)에서 영업/MA 동시 개정 예정.
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
        createdById: true,
        approvalNumber: true,
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
        { error: '본인이 작성한 품의서만 기안할 수 있습니다' },
        { status: 403 }
      )
    }

    if (approval.status !== 'DRAFT') {
      return NextResponse.json(
        { error: '작성중 상태의 품의서만 기안할 수 있습니다' },
        { status: 400 }
      )
    }

    const updated = await prisma.mAApproval.update({
      where: { id },
      data: { status: 'PENDING' },
      select: {
        id: true,
        approvalNumber: true,
        approvalCode: true,
        status: true,
      },
    })

    return NextResponse.json({
      message: '기안이 완료되었습니다',
      approval: updated,
    })
  } catch (error) {
    console.error('MA 기안 처리 오류:', error)
    return NextResponse.json(
      { error: '기안 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}
