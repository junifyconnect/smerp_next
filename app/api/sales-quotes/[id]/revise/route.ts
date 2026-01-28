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

    // 원본 견적서 조회
    const originalQuote = await prisma.salesQuote.findUnique({
      where: { id },
      include: {
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        items: {
          where: { productId: null }, // 독립 품목만
          orderBy: { sortOrder: 'asc' },
        },
        deal: true,
      },
    })

    if (!originalQuote) {
      return NextResponse.json(
        { error: '원본 견적서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // DRAFT 상태가 아닌 경우에만 새 버전 생성 가능
    if (originalQuote.status === 'DRAFT') {
      return NextResponse.json(
        { error: '작성중인 견적서는 직접 수정 가능합니다' },
        { status: 400 }
      )
    }

    // 최신 버전이 아니면 수정 불가
    if (originalQuote.isLatest === false) {
      return NextResponse.json(
        { error: '이전 버전은 수정할 수 없습니다. 최신 버전에서 수정해주세요.' },
        { status: 400 }
      )
    }

    // 버전 관리: 버전 증가, originalId 설정
    const newVersion = (originalQuote.version || 1) + 1
    const newOriginalId = originalQuote.originalId || originalQuote.id // 최초 버전 ID

    // 트랜잭션으로 기존 버전 업데이트 + 새 버전 생성
    const newQuote = await prisma.$transaction(async (tx) => {
      // 1. 기존 버전 isLatest = false로 변경
      await tx.salesQuote.update({
        where: { id: originalQuote.id },
        data: { isLatest: false },
      })

      // 2. 새 버전 견적서 생성 (원본 데이터 복사, 상태는 DRAFT)
      const created = await tx.salesQuote.create({
        data: {
          deal: originalQuote.dealId ? { connect: { id: originalQuote.dealId } } : undefined,
          status: 'DRAFT',
          // 버전 관리
          version: newVersion,
          original: { connect: { id: newOriginalId } },
          isLatest: true,
          // 기본 정보 복사
          projectName: originalQuote.projectName,
          productName: originalQuote.productName,
          managerName: originalQuote.managerName,
          clientCompany: originalQuote.clientCompany,
          clientContact: originalQuote.clientContact,
          clientPhone: originalQuote.clientPhone,
          clientFax: originalQuote.clientFax,
          clientMobile: originalQuote.clientMobile,
          clientEmail: originalQuote.clientEmail,
          quoteDate: new Date(), // 새 견적일
          validUntil: originalQuote.validUntil,
          deliveryDate: originalQuote.deliveryDate,
          paymentTerms: originalQuote.paymentTerms,
          notes: originalQuote.notes,
          totalAmount: originalQuote.totalAmount,
          vatAmount: originalQuote.vatAmount,
          totalWithVat: originalQuote.totalWithVat,
          isConsolidated: originalQuote.isConsolidated,
          consolidatedName: originalQuote.consolidatedName,
          consolidatedPrice: originalQuote.consolidatedPrice,
          ...(originalQuote.createdById && { createdBy: { connect: { id: originalQuote.createdById } } }),
          // 독립 품목 복사
          items: {
            create: originalQuote.items.map((item, index) => ({
              sortOrder: item.sortOrder ?? index,
              partNumber: item.partNumber,
              description: item.description,
              quantity: item.quantity,
              srpPrice: item.srpPrice,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
      })

      // 3. 제품 그룹 복사
      for (const product of originalQuote.products) {
        const createdProduct = await tx.salesQuoteProduct.create({
          data: {
            quoteId: created.id,
            sortOrder: product.sortOrder,
            name: product.name,
            quantity: product.quantity,
            srpPrice: product.srpPrice,
            unitPrice: product.unitPrice,
            totalPrice: product.totalPrice,
            isConsolidated: product.isConsolidated,
            consolidatedPrice: product.consolidatedPrice,
          },
        })

        // 제품 소속 품목 복사
        if (product.items && product.items.length > 0) {
          await tx.salesQuoteItem.createMany({
            data: product.items.map((item, idx) => ({
              quoteId: created.id,
              productId: createdProduct.id,
              sortOrder: item.sortOrder ?? idx,
              partNumber: item.partNumber,
              description: item.description,
              quantity: item.quantity,
              srpPrice: item.srpPrice,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          })
        }
      }

      // 4. 최종 결과 조회
      return tx.salesQuote.findUnique({
        where: { id: created.id },
        include: {
          products: {
            include: { items: { orderBy: { sortOrder: 'asc' } } },
            orderBy: { sortOrder: 'asc' },
          },
          items: { where: { productId: null }, orderBy: { sortOrder: 'asc' } },
          deal: { select: { id: true, name: true, status: true } },
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
