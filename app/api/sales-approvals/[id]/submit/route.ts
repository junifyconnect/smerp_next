import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { auth } from '@/lib/auth'
import { notifyApprovalSubmitted } from '@/lib/notifications/sender'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/sales-approvals/[id]/submit - 기안하기 (DRAFT → PENDING)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params
    const currentUserId = session?.user?.id

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

    // 상태를 PENDING으로 변경
    const updatedApproval = await prisma.salesApproval.update({
      where: { id },
      data: {
        status: 'PENDING',
      },
      select: {
        id: true,
        approvalNumber: true,
        approvalCode: true,
        status: true,
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
