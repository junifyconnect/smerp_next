import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-approvals/[id] - 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        purchaseItems: { orderBy: { sortOrder: 'asc' } },
        deal: { select: { id: true, name: true, status: true } },
        salesManager: { select: { id: true, name: true, signatureUrl: true } },
        teamLeader: { select: { id: true, name: true, signatureUrl: true } },
        ceo: { select: { id: true, name: true, signatureUrl: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(approval)
  } catch (error) {
    console.error('품의서 조회 오류:', error)
    return NextResponse.json(
      { error: '품의서 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/sales-approvals/[id] - 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      approvalCode,
      approvalDate,
      managerName,
      clientCompany,
      clientContact,
      clientPhone,
      endUser,
      paymentTerms,
      deliveryAddress,
      deliveryDate,
      invoiceEmail,
      receiverName,
      receiverPhone,
      notes,
      status,
      items,
      purchaseItems,
    } = body

    const updateData: Record<string, unknown> = {}

    if (approvalCode !== undefined) updateData.approvalCode = approvalCode
    if (approvalDate !== undefined) updateData.approvalDate = approvalDate ? new Date(approvalDate) : null
    if (managerName !== undefined) updateData.managerName = managerName
    if (clientCompany !== undefined) updateData.clientCompany = clientCompany
    if (clientContact !== undefined) updateData.clientContact = clientContact
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone
    if (endUser !== undefined) updateData.endUser = endUser
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null
    if (invoiceEmail !== undefined) updateData.invoiceEmail = invoiceEmail
    if (receiverName !== undefined) updateData.receiverName = receiverName
    if (receiverPhone !== undefined) updateData.receiverPhone = receiverPhone
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    // 매출 아이템이 제공된 경우
    if (items !== undefined) {
      let totalAmount = 0
      const itemsWithTotal = items.map((item: { quantity?: number; unitPrice?: number; partNumber?: string; description?: string; sortOrder?: number }, index: number) => {
        const qty = item.quantity || 1
        const price = item.unitPrice || 0
        const itemTotal = qty * price
        totalAmount += itemTotal
        return {
          partNumber: item.partNumber,
          description: item.description,
          quantity: qty,
          unitPrice: price,
          totalPrice: itemTotal,
          sortOrder: item.sortOrder ?? index,
        }
      })

      const vatAmount = Math.round(totalAmount * 0.1)
      const totalWithVat = totalAmount + vatAmount

      updateData.totalAmount = totalAmount
      updateData.vatAmount = vatAmount
      updateData.totalWithVat = totalWithVat

      await prisma.salesApprovalItem.deleteMany({ where: { approvalId: id } })
      await prisma.salesApprovalItem.createMany({
        data: itemsWithTotal.map((item: { partNumber?: string; description?: string; quantity: number; unitPrice: number; totalPrice: number; sortOrder: number }) => ({
          ...item,
          approvalId: id,
        })),
      })
    }

    // 매입 아이템이 제공된 경우
    if (purchaseItems !== undefined) {
      let purchaseTotal = 0
      const purchaseItemsWithTotal = purchaseItems.map((item: { quantity?: number; unitPrice?: number; partNumber?: string; description?: string; purchaseDate?: string; vendorCompany?: string; sortOrder?: number }, index: number) => {
        const qty = item.quantity || 1
        const price = item.unitPrice || 0
        const itemTotal = qty * price
        purchaseTotal += itemTotal
        return {
          partNumber: item.partNumber,
          description: item.description,
          quantity: qty,
          unitPrice: price,
          totalPrice: itemTotal,
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
          vendorCompany: item.vendorCompany,
          sortOrder: item.sortOrder ?? index,
        }
      })

      const purchaseTotalWithVat = purchaseTotal + Math.round(purchaseTotal * 0.1)

      updateData.purchaseTotal = purchaseTotal
      updateData.purchaseTotalWithVat = purchaseTotalWithVat

      await prisma.salesApprovalPurchaseItem.deleteMany({ where: { approvalId: id } })
      await prisma.salesApprovalPurchaseItem.createMany({
        data: purchaseItemsWithTotal.map((item: { partNumber?: string; description?: string; quantity: number; unitPrice: number; totalPrice: number; purchaseDate: Date | null; vendorCompany?: string; sortOrder: number }) => ({
          ...item,
          approvalId: id,
        })),
      })
    }

    const approval = await prisma.salesApproval.update({
      where: { id },
      data: updateData,
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        purchaseItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(approval)
  } catch (error) {
    console.error('품의서 수정 오류:', error)
    return NextResponse.json(
      { error: '품의서 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/sales-approvals/[id] - 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await prisma.salesApproval.delete({ where: { id } })

    return NextResponse.json({ message: '삭제되었습니다' })
  } catch (error) {
    console.error('품의서 삭제 오류:', error)
    return NextResponse.json(
      { error: '품의서 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
