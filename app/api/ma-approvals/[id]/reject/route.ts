import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/ma-approvals/[id]/reject — MA 품의서 반려
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, reason } = body as { userId: string; reason?: string }

    if (!userId) {
      return NextResponse.json({ error: 'userId가 필요합니다' }, { status: 400 })
    }

    const approval = await prisma.mAApproval.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        approvalNumber: true,
        createdById: true,
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: 'MA 품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const rejectableStatuses = ['PENDING_TEAM_LEAD', 'PENDING_CEO']
    if (!rejectableStatuses.includes(approval.status)) {
      return NextResponse.json(
        { error: '승인 대기 중인 품의서만 반려할 수 있습니다' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const now = new Date()

    const updated = await prisma.mAApproval.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedById: userId,
        rejectedAt: now,
        rejectionReason: reason || null,
      },
      include: {
        salesManager: { select: { id: true, name: true } },
        teamLeader: { select: { id: true, name: true } },
        ceo: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('MA 품의서 반려 오류:', error)
    return NextResponse.json(
      { error: '반려 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}
