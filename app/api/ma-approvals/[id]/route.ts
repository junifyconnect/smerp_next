import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { normalizeBillingCycle } from '@/lib/ma/billing-cycle'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 통합 품목 아이템 타입
interface MAApprovalItemInput {
  id?: string
  smCode?: string
  vendorCode?: string
  clientCompany?: string
  salesCompany?: string
  salesPrice?: number
  quantity?: number
  salesBillingCycle?: string
  startDate?: string
  endDate?: string
  purchaseCompany?: string
  purchasePrice?: number
  purchaseBillingCycle?: string
  billingDayOfMonth?: number
  sortOrder?: number
}

function normalizeBillingDay(raw: number | undefined): number {
  if (raw === undefined || raw === null || Number.isNaN(raw)) return 31
  const n = Math.floor(raw)
  return Math.min(31, Math.max(1, n))
}

// GET /api/ma-approvals/[id] - 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const approval = await prisma.mAApproval.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        salesManager: { select: { id: true, name: true, signatureUrl: true } },
        teamLeader: { select: { id: true, name: true, signatureUrl: true } },
        ceo: { select: { id: true, name: true, signatureUrl: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: 'MA 품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(approval)
  } catch (error) {
    console.error('MA 품의서 조회 오류:', error)
    return NextResponse.json(
      { error: 'MA 품의서 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/ma-approvals/[id] - 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      approvalDate,
      managerName,
      notes,
      status,
      items,
    } = body

    const currentApproval = await prisma.mAApproval.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        notes: true,
        rejectedAt: true,
        rejectionReason: true,
        rejectedBy: { select: { name: true } },
      },
    })

    if (!currentApproval) {
      return NextResponse.json(
        { error: 'MA 품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (currentApproval.status === 'APPROVED') {
      return NextResponse.json(
        { error: '승인 완료된 MA 품의서는 수정할 수 없습니다. 수정발행(revise)을 이용해주세요.' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    // REJECTED / PENDING 계열 → 수정 시 DRAFT 자동 전환 (영업과 동일 규칙, BUSINESS_RULES §5)
    const pendingStatuses = ['PENDING', 'PENDING_TEAM_LEAD', 'PENDING_CEO']
    const needsDraftReset =
      currentApproval.status === 'REJECTED' ||
      pendingStatuses.includes(currentApproval.status)

    if (needsDraftReset) {
      updateData.status = 'DRAFT'
      updateData.salesManagerId = null
      updateData.salesManagerSignedAt = null
      updateData.teamLeaderId = null
      updateData.teamLeaderSignedAt = null
      updateData.ceoId = null
      updateData.ceoSignedAt = null

      if (currentApproval.status === 'REJECTED') {
        const whenIso = currentApproval.rejectedAt
          ? new Date(currentApproval.rejectedAt).toISOString().slice(0, 10)
          : ''
        const by = currentApproval.rejectedBy?.name
          ? ` by ${currentApproval.rejectedBy.name}`
          : ''
        const reason = currentApproval.rejectionReason || '사유 미기재'
        const header = `[반려 이력 ${whenIso}${by}] ${reason}`
        const baseNotes =
          typeof notes === 'string' ? notes : currentApproval.notes || ''
        updateData.notes = baseNotes ? `${header}\n\n${baseNotes}` : header

        updateData.rejectedById = null
        updateData.rejectedAt = null
        updateData.rejectionReason = null
      }
    }

    if (approvalDate !== undefined) updateData.approvalDate = approvalDate ? new Date(approvalDate) : null
    if (managerName !== undefined) updateData.managerName = managerName
    // notes는 REJECTED→DRAFT 블록에서 이미 처리했을 수 있음 → 미설정일 때만 대입
    if (notes !== undefined && updateData.notes === undefined) {
      updateData.notes = notes
    }
    // status 명시 지정은 REJECTED 전환 로직을 덮어쓰지 않도록 마지막에 (원래 없던 body는 아니지만 하위호환)
    if (status !== undefined && !needsDraftReset) updateData.status = status

    // 통합 아이템이 제공된 경우
    if (items !== undefined) {
      let totalAmount = 0
      let purchaseTotal = 0

      const itemsData = items.map((item: MAApprovalItemInput, index: number) => {
        const qty = item.quantity || 1
        const salesPrice = item.salesPrice || 0
        const purchasePrice = item.purchasePrice || 0

        totalAmount += salesPrice * qty
        purchaseTotal += purchasePrice * qty

        return {
          smCode: item.smCode,
          vendorCode: item.vendorCode,
          clientCompany: item.clientCompany,
          salesCompany: item.salesCompany,
          salesPrice: salesPrice,
          quantity: qty,
          salesBillingCycle: normalizeBillingCycle(item.salesBillingCycle),
          startDate: item.startDate ? new Date(item.startDate) : null,
          endDate: item.endDate ? new Date(item.endDate) : null,
          purchaseCompany: item.purchaseCompany,
          purchasePrice: purchasePrice,
          purchaseBillingCycle: normalizeBillingCycle(item.purchaseBillingCycle),
          billingDayOfMonth: normalizeBillingDay(item.billingDayOfMonth),
          sortOrder: item.sortOrder ?? index,
        }
      })

      updateData.totalAmount = totalAmount
      updateData.purchaseTotal = purchaseTotal

      // 기존 아이템 삭제 후 새로 생성
      await prisma.mAApprovalItem.deleteMany({ where: { approvalId: id } })
      await prisma.mAApprovalItem.createMany({
        data: itemsData.map((item: typeof itemsData[number]) => ({
          ...item,
          approvalId: id,
        })),
      })
    }

    const approval = await prisma.mAApproval.update({
      where: { id },
      data: updateData,
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(approval)
  } catch (error) {
    console.error('MA 품의서 수정 오류:', error)
    return NextResponse.json(
      { error: 'MA 품의서 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/ma-approvals/[id] - 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await prisma.mAApproval.delete({ where: { id } })

    return NextResponse.json({ message: '삭제되었습니다' })
  } catch (error) {
    console.error('MA 품의서 삭제 오류:', error)
    return NextResponse.json(
      { error: 'MA 품의서 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
