import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

type SignRole = 'SALES_MANAGER' | 'TEAM_LEADER' | 'CEO'

// POST /api/sales-approvals/[id]/sign - 품의서 서명
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, role } = body as { userId: string; role: SignRole }

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId와 role이 필요합니다' },
        { status: 400 }
      )
    }

    if (!['SALES_MANAGER', 'TEAM_LEADER', 'CEO'].includes(role)) {
      return NextResponse.json(
        { error: '유효하지 않은 역할입니다' },
        { status: 400 }
      )
    }

    // 품의서 조회
    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        salesManagerId: true,
        salesManagerSignedAt: true,
        teamLeaderId: true,
        teamLeaderSignedAt: true,
        ceoId: true,
        ceoSignedAt: true,
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 사용자 조회 (서명 이미지 확인)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, signatureUrl: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (!user.signatureUrl) {
      return NextResponse.json(
        { error: '서명 이미지가 등록되지 않았습니다. 먼저 서명을 등록해주세요.' },
        { status: 400 }
      )
    }

    const now = new Date()

    // 역할별 서명 처리
    if (role === 'SALES_MANAGER') {
      // 영업담당자 서명 - DRAFT 또는 PENDING 상태에서 가능 (기안 + 서명 통합)
      if (approval.status !== 'DRAFT' && approval.status !== 'PENDING') {
        return NextResponse.json(
          { error: '작성중이거나 기안된 품의서만 서명할 수 있습니다' },
          { status: 400 }
        )
      }

      const updated = await prisma.salesApproval.update({
        where: { id },
        data: {
          salesManagerId: userId,
          salesManagerSignedAt: now,
          status: 'PENDING_TEAM_LEAD',
        },
        include: {
          salesManager: { select: { id: true, name: true, signatureUrl: true } },
          teamLeader: { select: { id: true, name: true, signatureUrl: true } },
          ceo: { select: { id: true, name: true, signatureUrl: true } },
        },
      })

      return NextResponse.json(updated)
    }

    if (role === 'TEAM_LEADER') {
      // 영업팀장 서명 - PENDING_TEAM_LEAD 상태에서만 가능
      if (approval.status !== 'PENDING_TEAM_LEAD') {
        return NextResponse.json(
          { error: '영업팀장 승인 대기 상태의 품의서만 서명할 수 있습니다' },
          { status: 400 }
        )
      }

      const updated = await prisma.salesApproval.update({
        where: { id },
        data: {
          teamLeaderId: userId,
          teamLeaderSignedAt: now,
          status: 'PENDING_CEO',
        },
        include: {
          salesManager: { select: { id: true, name: true, signatureUrl: true } },
          teamLeader: { select: { id: true, name: true, signatureUrl: true } },
          ceo: { select: { id: true, name: true, signatureUrl: true } },
        },
      })

      return NextResponse.json(updated)
    }

    if (role === 'CEO') {
      // 대표이사 서명 - PENDING_CEO 상태에서만 가능
      if (approval.status !== 'PENDING_CEO') {
        return NextResponse.json(
          { error: '대표이사 승인 대기 상태의 품의서만 서명할 수 있습니다' },
          { status: 400 }
        )
      }

      // 품의서 정보 조회 (clientCompany 확인용)
      const fullApproval = await prisma.salesApproval.findUnique({
        where: { id },
        select: {
          id: true,
          clientCompany: true,
        },
      })

      // 아이템 조회 (단순 복사 방식: approvalId = 현재 품의서 ID)
      const [salesItems, purchaseItems] = await Promise.all([
        prisma.salesApprovalItem.findMany({
          where: { approvalId: id },
        }),
        prisma.salesApprovalPurchaseItem.findMany({
          where: { approvalId: id },
        }),
      ])

      // 트랜잭션으로 승인 + InvoiceRecord 생성
      const updated = await prisma.$transaction(async (tx) => {
        // 1. 품의서 승인
        const result = await tx.salesApproval.update({
          where: { id },
          data: {
            ceoId: userId,
            ceoSignedAt: now,
            status: 'APPROVED',
            approvalDate: now,
          },
          include: {
            salesManager: { select: { id: true, name: true, signatureUrl: true } },
            teamLeader: { select: { id: true, name: true, signatureUrl: true } },
            ceo: { select: { id: true, name: true, signatureUrl: true } },
          },
        })

        // 2. 매출 계산서 발행 기록 생성 (기존 기록이 없는 경우만)
        for (const item of salesItems) {
          const existing = await tx.invoiceRecord.findFirst({
            where: { itemId: item.id, invoiceType: 'SALES' },
          })
          if (!existing) {
            await tx.invoiceRecord.create({
              data: {
                approvalId: id,
                itemId: item.id,
                invoiceType: 'SALES',
                productName: item.productName,
                partNumber: item.partNumber,
                quantity: item.quantity,
                unitPrice: item.unitPrice || 0,
                totalPrice: item.totalPrice || 0,
                clientCompany: fullApproval?.clientCompany,
                status: 'PENDING',
              },
            })
          }
        }

        // 3. 매입 계산서 발행 기록 생성 (기존 기록이 없는 경우만)
        for (const item of purchaseItems) {
          const existing = await tx.invoiceRecord.findFirst({
            where: { itemId: item.id, invoiceType: 'PURCHASE' },
          })
          if (!existing) {
            await tx.invoiceRecord.create({
              data: {
                approvalId: id,
                itemId: item.id,
                invoiceType: 'PURCHASE',
                productName: item.productName,
                partNumber: item.partNumber,
                quantity: item.quantity,
                unitPrice: item.unitPrice || 0,
                totalPrice: item.totalPrice || 0,
                vendorCompany: item.vendorCompany,
                clientCompany: fullApproval?.clientCompany,
                status: 'PENDING',
              },
            })
          }
        }

        return result
      })

      // 아이템 정보 추가 조회 (단순 복사 방식)
      const [items, pItems] = await Promise.all([
        prisma.salesApprovalItem.findMany({
          where: { approvalId: id },
          include: { details: true },
          orderBy: { sortOrder: 'asc' },
        }),
        prisma.salesApprovalPurchaseItem.findMany({
          where: { approvalId: id },
          include: { details: true },
          orderBy: { sortOrder: 'asc' },
        }),
      ])

      return NextResponse.json({
        ...updated,
        items,
        purchaseItems: pItems,
      })
    }

    return NextResponse.json(
      { error: '처리할 수 없는 요청입니다' },
      { status: 400 }
    )
  } catch (error) {
    console.error('품의서 서명 오류:', error)
    return NextResponse.json(
      { error: '서명 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}
