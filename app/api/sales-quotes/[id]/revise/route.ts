import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * @deprecated 견적서는 버전 관리 기능 사용 안 함 (UI에서 제거됨)
 * POST /api/sales-quotes/[id]/revise - 새 버전 생성 (발송 후 수정)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const originalQuote = await prisma.salesQuote.findUnique({
      where: { id },
      include: {
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!originalQuote) {
      return NextResponse.json(
        { error: '원본 견적서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (originalQuote.status === 'DRAFT') {
      return NextResponse.json(
        { error: '작성중인 견적서는 직접 수정 가능합니다' },
        { status: 400 }
      )
    }

    if (originalQuote.isLatest === false) {
      return NextResponse.json(
        { error: '이전 버전은 수정할 수 없습니다. 최신 버전에서 수정해주세요.' },
        { status: 400 }
      )
    }

    const newVersion = (originalQuote.version || 1) + 1
    const newOriginalId = originalQuote.originalId || originalQuote.id

    const newQuote = await prisma.$transaction(async (tx) => {
      // 기존 버전 비활성화
      await tx.salesQuote.update({
        where: { id: originalQuote.id },
        data: { isLatest: false },
      })

      // 새 버전 생성
      const created = await tx.salesQuote.create({
        data: {
          status: 'DRAFT',
          version: newVersion,
          original: { connect: { id: newOriginalId } },
          isLatest: true,
          projectName: originalQuote.projectName,
          managerName: originalQuote.managerName,
          clientCompany: originalQuote.clientCompany,
          clientContact: originalQuote.clientContact,
          clientPhone: originalQuote.clientPhone,
          clientFax: originalQuote.clientFax,
          clientMobile: originalQuote.clientMobile,
          clientEmail: originalQuote.clientEmail,
          quoteDate: new Date(),
          validUntil: originalQuote.validUntil,
          deliveryDate: originalQuote.deliveryDate,
          paymentTerms: originalQuote.paymentTerms,
          notes: originalQuote.notes,
          totalAmount: originalQuote.totalAmount,
          vatAmount: originalQuote.vatAmount,
          totalWithVat: originalQuote.totalWithVat,
          ...(originalQuote.createdById && { createdBy: { connect: { id: originalQuote.createdById } } }),
        },
      })

      // 제품 + 품목 복사
      for (const product of originalQuote.products) {
        const createdProduct = await tx.salesQuoteProduct.create({
          data: {
            quoteId: created.id,
            sortOrder: product.sortOrder,
            name: product.name,
            quantity: product.quantity,
            unitPrice: product.unitPrice,
            totalPrice: product.totalPrice,
          },
        })

        if (product.items && product.items.length > 0) {
          await tx.salesQuoteItem.createMany({
            data: product.items.map((item, idx) => ({
              productId: createdProduct.id,
              sortOrder: item.sortOrder ?? idx,
              partNumber: item.partNumber,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          })
        }
      }

      return tx.salesQuote.findUnique({
        where: { id: created.id },
        include: {
          products: {
            include: { items: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { sortOrder: 'asc' },
          },
          createdBy: { select: { id: true, name: true } },
        },
      })
    })

    return NextResponse.json(newQuote, { status: 201 })
  } catch (error) {
    console.error('새 버전 생성 오류:', error)
    return NextResponse.json(
      { error: '새 버전 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
