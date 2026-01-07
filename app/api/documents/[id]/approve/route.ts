import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import type { ProcessApprovalDto } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/documents/:id/approve - 결재 처리
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body: ProcessApprovalDto = await request.json()
    const userId = request.headers.get('x-user-id') || ''

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 문서 확인
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        approvals: {
          orderBy: { step: 'asc' },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (document.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: '결재 대기 상태가 아닙니다' },
        { status: 400 }
      )
    }

    // 현재 결재자 확인
    const pendingApproval = document.approvals.find(
      (a) => a.status === 'PENDING' && a.approverId === userId
    )

    if (!pendingApproval) {
      return NextResponse.json(
        { error: '결재 권한이 없거나 이미 처리되었습니다' },
        { status: 403 }
      )
    }

    // 이전 단계 결재 확인
    const previousApprovals = document.approvals.filter(
      (a) => a.step < pendingApproval.step
    )
    const allPreviousApproved = previousApprovals.every(
      (a) => a.status === 'APPROVED'
    )

    if (!allPreviousApproved) {
      return NextResponse.json(
        { error: '이전 결재가 완료되지 않았습니다' },
        { status: 400 }
      )
    }

    // 결재 처리
    await prisma.approval.update({
      where: { id: pendingApproval.id },
      data: {
        status: body.status,
        comment: body.comment,
        approvedAt: new Date(),
      },
    })

    // 문서 상태 업데이트
    if (body.status === 'REJECTED') {
      await prisma.document.update({
        where: { id },
        data: { status: 'REJECTED' },
      })
    } else {
      // 모든 결재 완료 확인
      const remainingApprovals = document.approvals.filter(
        (a) => a.id !== pendingApproval.id && a.status === 'PENDING'
      )

      if (remainingApprovals.length === 0) {
        await prisma.document.update({
          where: { id },
          data: { status: 'APPROVED' },
        })
      }
    }

    // 결과 조회
    const updated = await prisma.document.findUnique({
      where: { id },
      include: {
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true, position: true },
            },
          },
          orderBy: { step: 'asc' },
        },
      },
    })

    return NextResponse.json({
      message: body.status === 'APPROVED' ? '승인되었습니다' : '반려되었습니다',
      document: updated,
    })
  } catch (error) {
    console.error('결재 처리 오류:', error)
    return NextResponse.json(
      { error: '결재 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PUT /api/documents/:id/approve - 결재 요청 (결재선 설정)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body: { approvers: { userId: string; step: number }[] } = await request.json()

    // 문서 확인
    const document = await prisma.document.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (document.status !== 'DRAFT') {
      return NextResponse.json(
        { error: '임시저장 상태에서만 결재 요청할 수 있습니다' },
        { status: 400 }
      )
    }

    // 기존 결재 삭제
    await prisma.approval.deleteMany({
      where: { documentId: id },
    })

    // 새 결재선 생성
    await prisma.approval.createMany({
      data: body.approvers.map((approver) => ({
        documentId: id,
        approverId: approver.userId,
        step: approver.step,
        status: 'PENDING',
      })),
    })

    // 문서 상태 변경
    await prisma.document.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    })

    return NextResponse.json({
      message: '결재 요청되었습니다',
    })
  } catch (error) {
    console.error('결재 요청 오류:', error)
    return NextResponse.json(
      { error: '결재 요청에 실패했습니다' },
      { status: 500 }
    )
  }
}
