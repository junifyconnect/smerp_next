import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 품목 타입
interface ItemInput {
  partNumber?: string
  description?: string
  quantity?: number
  srpPrice?: number
  unitPrice?: number
  sortOrder?: number
}

// 제품 그룹 타입
interface ProductInput {
  id?: string
  name: string
  quantity?: number
  srpPrice?: number
  unitPrice?: number
  isConsolidated?: boolean
  consolidatedPrice?: number // 레거시 호환
  items?: ItemInput[]
  sortOrder?: number
}

// GET /api/sales-quotes/[id] - 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const quote = await prisma.salesQuote.findUnique({
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
        files: true,
        deal: { select: { id: true, name: true, status: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    console.log('[API] Quote products:', quote.products?.length, quote.products)

    return NextResponse.json(quote)
  } catch (error) {
    console.error('견적서 조회 오류:', error)
    return NextResponse.json(
      { error: '견적서 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/sales-quotes/[id] - 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      dealId,
      projectName,
      productName,
      managerName,
      clientCompany,
      clientContact,
      clientPhone,
      clientFax,
      clientMobile,
      clientCP,
      clientEmail,
      quoteDate,
      validUntil,
      deliveryDate,
      paymentTerms,
      notes,
      status,
      // 새 구조: 제품 그룹 + 독립 품목
      products,
      standaloneItems,
      // 레거시 호환: 기존 flat items 구조
      items,
      // 통합 견적 (레거시)
      isConsolidated,
      consolidatedName,
      consolidatedPrice,
    } = body

    // 상태 변경 검증: SENT 이후에는 ACCEPTED/REJECTED만 가능
    if (status !== undefined) {
      const currentQuote = await prisma.salesQuote.findUnique({
        where: { id },
        select: { status: true },
      })

      if (currentQuote) {
        const currentStatus = currentQuote.status
        // SENT 상태에서는 ACCEPTED 또는 REJECTED로만 변경 가능
        if (currentStatus === 'SENT' && !['ACCEPTED', 'REJECTED'].includes(status)) {
          return NextResponse.json(
            { error: '발송 후에는 수락/거절만 가능합니다' },
            { status: 400 }
          )
        }
        // ACCEPTED/REJECTED 상태에서는 변경 불가
        if (['ACCEPTED', 'REJECTED'].includes(currentStatus)) {
          return NextResponse.json(
            { error: '확정된 견적서는 상태를 변경할 수 없습니다' },
            { status: 400 }
          )
        }
      }
    }

    const updateData: Record<string, unknown> = {}

    if (dealId !== undefined) {
      updateData.deal = dealId ? { connect: { id: dealId } } : { disconnect: true }
    }
    if (projectName !== undefined) updateData.projectName = projectName
    if (productName !== undefined) updateData.productName = productName
    if (managerName !== undefined) updateData.managerName = managerName
    if (clientCompany !== undefined) updateData.clientCompany = clientCompany
    if (clientContact !== undefined) updateData.clientContact = clientContact
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone
    if (clientFax !== undefined) updateData.clientFax = clientFax
    if (clientMobile !== undefined) updateData.clientMobile = clientMobile
    if (clientCP !== undefined) updateData.clientMobile = clientCP
    if (clientEmail !== undefined) updateData.clientEmail = clientEmail

    // 통합 견적 (레거시)
    if (isConsolidated !== undefined) updateData.isConsolidated = isConsolidated
    if (consolidatedName !== undefined) updateData.consolidatedName = consolidatedName
    if (consolidatedPrice !== undefined) updateData.consolidatedPrice = consolidatedPrice
    if (quoteDate !== undefined) updateData.quoteDate = quoteDate ? new Date(quoteDate) : null
    if (validUntil !== undefined) updateData.validUntil = validUntil
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate && deliveryDate !== '별도협의' ? new Date(deliveryDate) : null
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    // 새 구조 사용 여부 판단
    const useNewStructure = products !== undefined || standaloneItems !== undefined

    if (useNewStructure) {
      // 새 구조: 제품 그룹 + 독립 품목
      let totalAmount = 0

      // 기존 제품 및 품목 삭제
      await prisma.salesQuoteProduct.deleteMany({ where: { quoteId: id } })
      await prisma.salesQuoteItem.deleteMany({ where: { quoteId: id } })

      // 제품 그룹 처리
      if (products && products.length > 0) {
        for (let pIdx = 0; pIdx < products.length; pIdx++) {
          const product: ProductInput = products[pIdx]
          const qty = product.quantity || 1
          const unitPrice = product.unitPrice || product.consolidatedPrice || 0
          const productTotal = qty * unitPrice

          totalAmount += productTotal

          // 제품 생성
          const createdProduct = await prisma.salesQuoteProduct.create({
            data: {
              quoteId: id,
              sortOrder: product.sortOrder ?? pIdx,
              name: product.name,
              quantity: qty,
              srpPrice: product.srpPrice,
              unitPrice: unitPrice,
              totalPrice: productTotal,
              isConsolidated: true,
              consolidatedPrice: productTotal, // 레거시 호환
            },
          })

          // 참고용 상세 품목 생성
          if (product.items && product.items.length > 0) {
            const productItems = product.items.map((item: ItemInput, iIdx: number) => {
              return {
                quoteId: id,
                productId: createdProduct.id,
                sortOrder: item.sortOrder ?? iIdx,
                partNumber: item.partNumber,
                description: item.description,
                quantity: item.quantity || 1,
                srpPrice: item.srpPrice,
                unitPrice: item.unitPrice || 0,
                totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
              }
            })

            await prisma.salesQuoteItem.createMany({ data: productItems })
          }
        }
      }

      // 독립 품목 처리
      if (standaloneItems && standaloneItems.length > 0) {
        const standaloneItemsData = standaloneItems.map((item: ItemInput, idx: number) => {
          const qty = item.quantity || 1
          const price = item.unitPrice || 0
          const itemTotal = qty * price
          totalAmount += itemTotal
          return {
            quoteId: id,
            productId: null,
            sortOrder: item.sortOrder ?? (idx + 1000),
            partNumber: item.partNumber,
            description: item.description,
            quantity: qty,
            srpPrice: item.srpPrice,
            unitPrice: price,
            totalPrice: itemTotal,
          }
        })

        await prisma.salesQuoteItem.createMany({ data: standaloneItemsData })
      }

      const vatAmount = Math.round(totalAmount * 0.1)
      const totalWithVat = totalAmount + vatAmount

      updateData.totalAmount = totalAmount
      updateData.vatAmount = vatAmount
      updateData.totalWithVat = totalWithVat
    } else if (items !== undefined) {
      // 레거시 구조: 기존 flat items
      let totalAmount = 0
      const itemsWithTotal = items.map((item: ItemInput, index: number) => {
        const qty = item.quantity || 1
        const price = item.unitPrice || 0
        const itemTotal = qty * price
        totalAmount += itemTotal
        return {
          partNumber: item.partNumber,
          description: item.description,
          quantity: qty,
          srpPrice: item.srpPrice,
          unitPrice: price,
          totalPrice: itemTotal,
          sortOrder: item.sortOrder ?? index,
        }
      })

      // 통합 견적인 경우 통합 금액 사용
      if (isConsolidated && consolidatedPrice) {
        totalAmount = consolidatedPrice
      }

      const vatAmount = Math.round(totalAmount * 0.1)
      const totalWithVat = totalAmount + vatAmount

      updateData.totalAmount = totalAmount
      updateData.vatAmount = vatAmount
      updateData.totalWithVat = totalWithVat

      // 기존 제품 및 아이템 삭제 후 새로 생성
      await prisma.salesQuoteProduct.deleteMany({ where: { quoteId: id } })
      await prisma.salesQuoteItem.deleteMany({ where: { quoteId: id } })
      await prisma.salesQuoteItem.createMany({
        data: itemsWithTotal.map((item) => ({
          ...item,
          quoteId: id,
        })),
      })
    }

    const quote = await prisma.salesQuote.update({
      where: { id },
      data: updateData,
      include: {
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        items: {
          where: { productId: null },
          orderBy: { sortOrder: 'asc' },
        },
        deal: { select: { id: true, name: true, status: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error('견적서 수정 오류:', error)
    return NextResponse.json(
      { error: '견적서 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/sales-quotes/[id] - 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await prisma.salesQuote.delete({ where: { id } })

    return NextResponse.json({ message: '삭제되었습니다' })
  } catch (error) {
    console.error('견적서 삭제 오류:', error)
    return NextResponse.json(
      { error: '견적서 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
