import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface ItemInput {
  partNumber?: string
  description?: string
  quantity?: number
  salesUnitPrice?: number
  vendorName?: string
  purchaseQty?: number
  purchasePrice?: number
  purchaseTotal?: number
  purchaseDate?: string
  sortOrder?: number
}

interface ProductInput {
  name: string
  quantity?: number
  unitPrice?: number
  items?: ItemInput[]
  sortOrder?: number
}

// GET /api/sales-approvals/[id] - 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      include: {
        salesManager: { select: { id: true, name: true, signatureUrl: true } },
        teamLeader: { select: { id: true, name: true, signatureUrl: true } },
        ceo: { select: { id: true, name: true, signatureUrl: true } },
        rejectedBy: { select: { id: true, name: true } },
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        files: true,
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
      products,
    } = body

    const currentApproval = await prisma.salesApproval.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!currentApproval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

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

    // 제품 + 품목 업데이트
    if (products !== undefined) {
      let totalSalesAmount = 0
      let totalPurchaseAmount = 0

      // 기존 제품 삭제 (cascade)
      await prisma.salesApprovalProduct.deleteMany({ where: { approvalId: id } })

      for (let pIdx = 0; pIdx < products.length; pIdx++) {
        const product: ProductInput = products[pIdx]
        const qty = product.quantity || 1
        const unitPrice = product.unitPrice || 0
        const productTotal = qty * unitPrice
        totalSalesAmount += productTotal

        const createdProduct = await prisma.salesApprovalProduct.create({
          data: {
            approvalId: id,
            sortOrder: product.sortOrder ?? pIdx,
            name: product.name,
            quantity: qty,
            unitPrice,
            totalPrice: productTotal,
          },
        })

        if (product.items && product.items.length > 0) {
          for (const item of product.items) {
            const purchaseTotal = (item.purchaseQty || 1) * (item.purchasePrice || 0)
            totalPurchaseAmount += purchaseTotal
          }

          await prisma.salesApprovalItem.createMany({
            data: product.items.map((item: ItemInput, iIdx: number) => ({
              productId: createdProduct.id,
              sortOrder: item.sortOrder ?? iIdx,
              partNumber: item.partNumber,
              description: item.description,
              quantity: item.quantity || 1,
              salesUnitPrice: item.salesUnitPrice,
              vendorName: item.vendorName,
              purchaseQty: item.purchaseQty || 1,
              purchasePrice: item.purchasePrice,
              purchaseTotal: (item.purchaseQty || 1) * (item.purchasePrice || 0) || item.purchaseTotal,
              purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
            })),
          })
        }
      }

      updateData.totalSalesAmount = totalSalesAmount
      updateData.totalPurchaseAmount = totalPurchaseAmount
      updateData.profitAmount = totalSalesAmount - totalPurchaseAmount
    }

    const updatedApproval = await prisma.salesApproval.update({
      where: { id },
      data: updateData,
      include: {
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json(updatedApproval)
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

    const approval = await prisma.salesApproval.findUnique({
      where: { id },
      select: {
        id: true,
        version: true,
        originalId: true,
        isLatest: true,
      },
    })

    if (!approval) {
      return NextResponse.json(
        { error: '품의서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const chainRootId = approval.originalId || approval.id
    const currentVersion = approval.version || 1

    await prisma.$transaction(async (tx) => {
      if (currentVersion > 1 && approval.isLatest) {
        const previousVersion = await tx.salesApproval.findFirst({
          where: {
            OR: [
              { id: chainRootId, version: currentVersion - 1 },
              { originalId: chainRootId, version: currentVersion - 1 },
            ],
          },
        })
        if (previousVersion) {
          await tx.salesApproval.update({
            where: { id: previousVersion.id },
            data: { isLatest: true },
          })
        }
      }

      await tx.invoiceRecord.deleteMany({
        where: { approvalId: id, status: 'PENDING' },
      })

      await tx.salesApproval.delete({ where: { id } })
    })

    return NextResponse.json({
      message: currentVersion > 1
        ? `버전 ${currentVersion}이 삭제되고 이전 버전으로 복원되었습니다`
        : '삭제되었습니다',
    })
  } catch (error) {
    console.error('품의서 삭제 오류:', error)
    return NextResponse.json(
      { error: '품의서 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
