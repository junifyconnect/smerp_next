import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

type SignRole = 'SALES_MANAGER' | 'TEAM_LEADER' | 'CEO'

const INCLUDE_FULL = {
  salesManager: { select: { id: true, name: true, signatureUrl: true } },
  teamLeader: { select: { id: true, name: true, signatureUrl: true } },
  ceo: { select: { id: true, name: true, signatureUrl: true } },
  products: {
    include: { items: { orderBy: { sortOrder: 'asc' as const } } },
    orderBy: { sortOrder: 'asc' as const },
  },
}

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

    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        clientCompany: true,
        salesManagerId: true,
        teamLeaderId: true,
        ceoId: true,
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, signatureUrl: true },
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    if (!user.signatureUrl) {
      return NextResponse.json(
        { error: '서명 이미지가 등록되지 않았습니다. 먼저 서명을 등록해주세요.' },
        { status: 400 }
      )
    }

    const now = new Date()

    if (role === 'SALES_MANAGER') {
      if (approval.status !== 'DRAFT' && approval.status !== 'PENDING') {
        return NextResponse.json(
          { error: '작성중이거나 기안된 품의서만 서명할 수 있습니다' },
          { status: 400 }
        )
      }
      const updated = await prisma.salesApproval.update({
        where: { id },
        data: { salesManagerId: userId, salesManagerSignedAt: now, status: 'PENDING_TEAM_LEAD' },
        include: INCLUDE_FULL,
      })
      return NextResponse.json(updated)
    }

    if (role === 'TEAM_LEADER') {
      if (approval.status !== 'PENDING_TEAM_LEAD') {
        return NextResponse.json(
          { error: '영업팀장 승인 대기 상태의 품의서만 서명할 수 있습니다' },
          { status: 400 }
        )
      }
      const updated = await prisma.salesApproval.update({
        where: { id },
        data: { teamLeaderId: userId, teamLeaderSignedAt: now, status: 'PENDING_CEO' },
        include: INCLUDE_FULL,
      })
      return NextResponse.json(updated)
    }

    if (role === 'CEO') {
      if (approval.status !== 'PENDING_CEO') {
        return NextResponse.json(
          { error: '대표이사 승인 대기 상태의 품의서만 서명할 수 있습니다' },
          { status: 400 }
        )
      }

      // 제품 + 품목 조회
      const products = await prisma.salesApprovalProduct.findMany({
        where: { approvalId: id },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      })

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
          include: INCLUDE_FULL,
        })

        // 2. 매출 계산서 자동생성 (Product 단위)
        for (const product of products) {
          const existing = await tx.invoiceRecord.findFirst({
            where: { approvalId: id, itemId: product.id, invoiceType: 'SALES' },
          })
          if (!existing) {
            await tx.invoiceRecord.create({
              data: {
                approvalId: id,
                itemId: product.id,
                invoiceType: 'SALES',
                productName: product.name,
                quantity: product.quantity,
                unitPrice: product.unitPrice || 0,
                totalPrice: product.totalPrice || 0,
                clientCompany: approval.clientCompany,
                status: 'PENDING',
              },
            })
          }
        }

        // 3. 매입 계산서 자동생성 (같은 vendorName Item 합산)
        const vendorMap = new Map<string, { totalAmount: number; items: string[] }>()
        for (const product of products) {
          for (const item of product.items) {
            if (item.vendorName && item.purchaseTotal) {
              const key = item.vendorName
              const existing = vendorMap.get(key) || { totalAmount: 0, items: [] }
              existing.totalAmount += Number(item.purchaseTotal)
              existing.items.push(item.partNumber || item.description || product.name)
              vendorMap.set(key, existing)
            }
          }
        }

        for (const [vendorName, data] of vendorMap) {
          const existing = await tx.invoiceRecord.findFirst({
            where: { approvalId: id, vendorCompany: vendorName, invoiceType: 'PURCHASE' },
          })
          if (!existing) {
            await tx.invoiceRecord.create({
              data: {
                approvalId: id,
                invoiceType: 'PURCHASE',
                productName: data.items.join(', '),
                quantity: 1,
                unitPrice: data.totalAmount,
                totalPrice: data.totalAmount,
                vendorCompany: vendorName,
                clientCompany: approval.clientCompany,
                status: 'PENDING',
              },
            })
          }
        }

        return result
      })

      return NextResponse.json(updated)
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
