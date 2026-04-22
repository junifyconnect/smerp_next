import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/sales-approvals/[id]/revise - 새 버전 생성
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    let body: Record<string, unknown> = {}
    try { body = await request.json() } catch { /* empty body ok */ }

    const originalApproval = await prisma.salesApproval.findUnique({
      where: { id },
      include: {
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!originalApproval) {
      return NextResponse.json({ error: '원본 품의서를 찾을 수 없습니다' }, { status: 404 })
    }

    if (originalApproval.status === 'DRAFT') {
      return NextResponse.json({ error: '작성중인 품의서는 직접 수정 가능합니다' }, { status: 400 })
    }

    if (!originalApproval.isLatest) {
      return NextResponse.json({ error: '이전 버전은 수정할 수 없습니다.' }, { status: 400 })
    }

    // 새 품의번호
    const year = new Date().getFullYear()
    const lastApproval = await prisma.salesApproval.findFirst({
      where: { approvalNumber: { startsWith: `SA-${year}-` } },
      orderBy: { approvalNumber: 'desc' },
    })
    let sequence = 1
    if (lastApproval) {
      sequence = parseInt(lastApproval.approvalNumber.split('-')[2]) + 1
    }
    const newApprovalNumber = `SA-${year}-${String(sequence).padStart(4, '0')}`

    const newVersion = (originalApproval.version || 1) + 1
    const chainRootId = originalApproval.originalId || originalApproval.id

    const newApproval = await prisma.$transaction(async (tx) => {
      // 기존 버전 비활성화
      await tx.salesApproval.update({
        where: { id: originalApproval.id },
        data: { isLatest: false },
      })

      // 새 품의서 생성
      const approval = await tx.salesApproval.create({
        data: {
          approvalNumber: newApprovalNumber,
          status: 'DRAFT',
          approvalCode: (body.approvalCode as string) || originalApproval.approvalCode,
          version: newVersion,
          original: { connect: { id: chainRootId } },
          isLatest: true,
          approvalDate: new Date(),
          managerName: (body.managerName as string) ?? originalApproval.managerName,
          clientCompany: (body.clientCompany as string) ?? originalApproval.clientCompany,
          clientContact: (body.clientContact as string) ?? originalApproval.clientContact,
          clientPhone: (body.clientPhone as string) ?? originalApproval.clientPhone,
          endUser: (body.endUser as string) ?? originalApproval.endUser,
          totalSalesAmount: originalApproval.totalSalesAmount,
          totalPurchaseAmount: originalApproval.totalPurchaseAmount,
          profitAmount: originalApproval.profitAmount,
          paymentTerms: (body.paymentTerms as string) ?? originalApproval.paymentTerms,
          deliveryAddress: (body.deliveryAddress as string) ?? originalApproval.deliveryAddress,
          deliveryDate: originalApproval.deliveryDate,
          invoiceEmail: (body.invoiceEmail as string) ?? originalApproval.invoiceEmail,
          receiverName: (body.receiverName as string) ?? originalApproval.receiverName,
          receiverPhone: (body.receiverPhone as string) ?? originalApproval.receiverPhone,
          notes: (body.notes as string) ?? originalApproval.notes,
          createdById: originalApproval.createdById,
          ...(originalApproval.sourceQuoteId && {
            sourceQuote: { connect: { id: originalApproval.sourceQuoteId } },
          }),
        },
      })

      // 제품 + 품목 복사 (sourceProductId / sourceItemId 설정)
      // 계산서 상태는 복사하지 않음 — InvoiceRecord가 source of truth이고,
      // sign 시점에 이전 버전 InvoiceRecord를 CANCELLED(REVISED) 또는 NEEDS_AMENDMENT로 전이.
      for (const product of originalApproval.products) {
        const createdProduct = await tx.salesApprovalProduct.create({
          data: {
            approvalId: approval.id,
            sortOrder: product.sortOrder,
            name: product.name,
            quantity: product.quantity,
            unitPrice: product.unitPrice,
            totalPrice: product.totalPrice,
            category: product.category,
            subCategory: product.subCategory,
            sourceProductId: product.id,
          },
        })

        if (product.items.length > 0) {
          await tx.salesApprovalItem.createMany({
            data: product.items.map((item) => ({
              productId: createdProduct.id,
              sortOrder: item.sortOrder,
              partNumber: item.partNumber,
              description: item.description,
              quantity: item.quantity,
              salesUnitPrice: item.salesUnitPrice,
              vendorName: item.vendorName,
              purchaseQty: item.purchaseQty,
              purchasePrice: item.purchasePrice,
              purchaseTotal: item.purchaseTotal,
              purchaseDate: item.purchaseDate,
              salesInvoiceRequired: item.salesInvoiceRequired,
              purchaseInvoiceRequired: item.purchaseInvoiceRequired,
              sourceItemId: item.id,
            })),
          })
        }
      }

      return approval
    })

    const result = await prisma.salesApproval.findUnique({
      where: { id: newApproval.id },
      include: {
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('새 버전 생성 오류:', error)
    return NextResponse.json(
      { error: '새 버전 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
