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
  sortOrder?: number
}

// GET /api/ma-approvals/[id] - 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const approval = await prisma.mAApproval.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
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

    const updateData: Record<string, unknown> = {}

    if (approvalDate !== undefined) updateData.approvalDate = approvalDate ? new Date(approvalDate) : null
    if (managerName !== undefined) updateData.managerName = managerName
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

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
