import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/ma-approvals/[id]/submit — 기안하기
// BUSINESS_RULES §5: 상신 시점에 결재자 3명(salesManagerId/teamLeaderId/ceoId)을 body로 받아 저장.
// 상신 = 작성자 본인의 "영업담당 서명" 역할도 함께 수행 (salesManagerSignedAt 기록, status → PENDING_TEAM_LEAD)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params
    const currentUserId = session?.user?.id

    const body = (await request.json().catch(() => ({}))) as {
      salesManagerId?: string
      teamLeaderId?: string
      ceoId?: string
    }
    const { salesManagerId, teamLeaderId, ceoId } = body

    if (!salesManagerId || !teamLeaderId || !ceoId) {
      return NextResponse.json(
        { error: '결재자 3명(영업담당/팀장/대표)을 모두 지정해야 합니다' },
        { status: 400 }
      )
    }

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

    // 결재자 유효성 확인 (isActive=true)
    const signers = await prisma.user.findMany({
      where: {
        id: { in: [salesManagerId, teamLeaderId, ceoId] },
        isActive: true,
      },
      select: { id: true, signatureUrl: true },
    })
    const foundIds = new Set(signers.map((s) => s.id))
    const missing = [salesManagerId, teamLeaderId, ceoId].filter(
      (uid) => !foundIds.has(uid)
    )
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `결재자 중 유효하지 않은 사용자가 있습니다: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const salesManager = signers.find((s) => s.id === salesManagerId)
    if (!salesManager?.signatureUrl) {
      return NextResponse.json(
        { error: '영업담당의 서명 이미지가 등록되지 않았습니다. 마이페이지에서 먼저 등록해주세요.' },
        { status: 400 }
      )
    }

    const now = new Date()

    const updated = await prisma.mAApproval.update({
      where: { id },
      data: {
        status: 'PENDING_TEAM_LEAD',
        salesManagerId,
        salesManagerSignedAt: now,
        teamLeaderId,
        ceoId,
      },
      select: {
        id: true,
        approvalNumber: true,
        approvalCode: true,
        status: true,
        salesManagerId: true,
        teamLeaderId: true,
        ceoId: true,
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
