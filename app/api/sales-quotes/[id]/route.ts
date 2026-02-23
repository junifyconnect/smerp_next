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
  unitPrice?: number
  sortOrder?: number
}

// 제품 그룹 타입
interface ProductInput {
  id?: string
  name: string
  quantity?: number
  unitPrice?: number
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
        files: true,
        createdBy: { select: { id: true, name: true } },
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

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
      projectName,
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
      products,
    } = body

    // 상태 변경 검증
    if (status !== undefined) {
      const currentQuote = await prisma.salesQuote.findUnique({
        where: { id },
        select: { status: true },
      })

      if (currentQuote) {
        const currentStatus = currentQuote.status
        if (currentStatus === 'SENT' && !['ACCEPTED', 'REJECTED'].includes(status)) {
          return NextResponse.json(
            { error: '발송 후에는 수락/거절만 가능합니다' },
            { status: 400 }
          )
        }
        if (['ACCEPTED', 'REJECTED'].includes(currentStatus)) {
          return NextResponse.json(
            { error: '확정된 견적서는 상태를 변경할 수 없습니다' },
            { status: 400 }
          )
        }
      }
    }

    const updateData: Record<string, unknown> = {}

    if (projectName !== undefined) updateData.projectName = projectName
    if (managerName !== undefined) updateData.managerName = managerName
    if (clientCompany !== undefined) updateData.clientCompany = clientCompany
    if (clientContact !== undefined) updateData.clientContact = clientContact
    if (clientPhone !== undefined) updateData.clientPhone = clientPhone
    if (clientFax !== undefined) updateData.clientFax = clientFax
    if (clientMobile !== undefined) updateData.clientMobile = clientMobile
    if (clientCP !== undefined) updateData.clientMobile = clientCP
    if (clientEmail !== undefined) updateData.clientEmail = clientEmail
    if (quoteDate !== undefined) updateData.quoteDate = quoteDate ? new Date(quoteDate) : null
    if (validUntil !== undefined) updateData.validUntil = validUntil
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate && deliveryDate !== '별도협의' ? new Date(deliveryDate) : null
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    // 제품 + 품목 업데이트
    if (products !== undefined) {
      let totalAmount = 0

      // 기존 제품 삭제 (cascade로 품목도 삭제됨)
      await prisma.salesQuoteProduct.deleteMany({ where: { quoteId: id } })

      // 새 제품 + 품목 생성
      for (let pIdx = 0; pIdx < products.length; pIdx++) {
        const product: ProductInput = products[pIdx]
        const qty = product.quantity || 1
        const unitPrice = product.unitPrice || 0
        const productTotal = qty * unitPrice
        totalAmount += productTotal

        const createdProduct = await prisma.salesQuoteProduct.create({
          data: {
            quoteId: id,
            sortOrder: product.sortOrder ?? pIdx,
            name: product.name,
            quantity: qty,
            unitPrice: unitPrice,
            totalPrice: productTotal,
          },
        })

        if (product.items && product.items.length > 0) {
          await prisma.salesQuoteItem.createMany({
            data: product.items.map((item: ItemInput, iIdx: number) => ({
              productId: createdProduct.id,
              sortOrder: item.sortOrder ?? iIdx,
              partNumber: item.partNumber,
              description: item.description,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
            })),
          })
        }
      }

      const vatAmount = Math.round(totalAmount * 0.1)
      const totalWithVat = totalAmount + vatAmount

      updateData.totalAmount = totalAmount
      updateData.vatAmount = vatAmount
      updateData.totalWithVat = totalWithVat
    }

    const quote = await prisma.salesQuote.update({
      where: { id },
      data: updateData,
      include: {
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
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
