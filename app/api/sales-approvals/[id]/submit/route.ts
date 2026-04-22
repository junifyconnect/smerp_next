import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'
import { notifyApprovalSubmitted } from '@/lib/notifications/sender'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/sales-approvals/[id]/submit — 기안하기
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

    // 품의서 조회
    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        createdById: true,
        approvalCode: true,
        approvalNumber: true,
        clientCompany: true,
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 작성자 본인만 기안 가능
    if (approval.createdById !== currentUserId) {
      return NextResponse.json(
        { error: '본인이 작성한 품의서만 기안할 수 있습니다' },
        { status: 403 }
      )
    }

    // DRAFT 상태만 기안 가능
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

    // 영업담당(=작성자) 서명 이미지 필수 체크
    const salesManager = signers.find((s) => s.id === salesManagerId)
    if (!salesManager?.signatureUrl) {
      return NextResponse.json(
        { error: '영업담당의 서명 이미지가 등록되지 않았습니다. 마이페이지에서 먼저 등록해주세요.' },
        { status: 400 }
      )
    }

    const now = new Date()

    const updatedApproval = await prisma.salesApproval.update({
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

    // 알림 발송 (비동기 - 실패해도 기안은 성공)
    notifyApprovalSubmitted({
      id: approval.id,
      approvalNumber: updatedApproval.approvalNumber,
      clientCompany: approval.clientCompany,
      createdById: approval.createdById,
    }).catch((err) => console.error('알림 발송 실패:', err))

    return NextResponse.json({
      message: '기안이 완료되었습니다',
      approval: updatedApproval,
    })
  } catch (error) {
    console.error('기안 처리 오류:', error)
    return NextResponse.json(
      { error: '기안 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}
