import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/ma-approvals/[id] - 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const approval = await prisma.mAApproval.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        purchaseItems: { orderBy: { sortOrder: 'asc' } },
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
      purchaseItems,
    } = body

    const updateData: Record<string, unknown> = {}

    if (approvalDate !== undefined) updateData.approvalDate = approvalDate ? new Date(approvalDate) : null
    if (managerName !== undefined) updateData.managerName = managerName
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    // 매출 아이템이 제공된 경우
    if (items !== undefined) {
      let totalAmount = 0
      const itemsWithTotal = items.map((item: {
        smCode?: string
        vendorCode?: string
        customerName?: string
        clientCompany?: string
        salesPrice?: number
        quantity?: number
        billingType?: string
        startDate?: string
        endDate?: string
        sortOrder?: number
      }, index: number) => {
        const qty = item.quantity || 1
        const price = item.salesPrice || 0
        totalAmount += price * qty
        return {
          smCode: item.smCode,
          vendorCode: item.vendorCode,
          customerName: item.customerName,
          clientCompany: item.clientCompany,
          salesPrice: price,
          quantity: qty,
          billingType: item.billingType,
          startDate: item.startDate ? new Date(item.startDate) : null,
          endDate: item.endDate ? new Date(item.endDate) : null,
          sortOrder: item.sortOrder ?? index,
        }
      })

      updateData.totalAmount = totalAmount

      await prisma.mAApprovalItem.deleteMany({ where: { approvalId: id } })
      await prisma.mAApprovalItem.createMany({
        data: itemsWithTotal.map((item: {
          smCode?: string
          vendorCode?: string
          customerName?: string
          clientCompany?: string
          salesPrice: number
          quantity: number
          billingType?: string
          startDate: Date | null
          endDate: Date | null
          sortOrder: number
        }) => ({
          ...item,
          approvalId: id,
        })),
      })
    }

    // 매입 아이템이 제공된 경우
    if (purchaseItems !== undefined) {
      let purchaseTotal = 0
      const purchaseItemsWithTotal = purchaseItems.map((item: {
        vendorCompany?: string
        purchasePrice?: number
        quantity?: number
        billingType?: string
        sortOrder?: number
      }, index: number) => {
        const qty = item.quantity || 1
        const price = item.purchasePrice || 0
        purchaseTotal += price * qty
        return {
          vendorCompany: item.vendorCompany,
          purchasePrice: price,
          quantity: qty,
          billingType: item.billingType,
          sortOrder: item.sortOrder ?? index,
        }
      })

      updateData.purchaseTotal = purchaseTotal

      await prisma.mAApprovalPurchaseItem.deleteMany({ where: { approvalId: id } })
      await prisma.mAApprovalPurchaseItem.createMany({
        data: purchaseItemsWithTotal.map((item: {
          vendorCompany?: string
          purchasePrice: number
          quantity: number
          billingType?: string
          sortOrder: number
        }) => ({
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
        purchaseItems: { orderBy: { sortOrder: 'asc' } },
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
