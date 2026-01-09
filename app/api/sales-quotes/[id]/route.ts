import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-quotes/[id] - 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const quote = await prisma.salesQuote.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
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
      clientEmail,
      quoteDate,
      validUntil,
      deliveryDate,
      paymentTerms,
      notes,
      status,
      items,
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
    if (clientEmail !== undefined) updateData.clientEmail = clientEmail
    if (quoteDate !== undefined) updateData.quoteDate = quoteDate ? new Date(quoteDate) : null
    if (validUntil !== undefined) updateData.validUntil = validUntil
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    // 아이템이 제공된 경우 재계산 및 교체
    if (items !== undefined) {
      let totalAmount = 0
      const itemsWithTotal = items.map((item: { quantity?: number; unitPrice?: number; partNumber?: string; description?: string; srpPrice?: number; sortOrder?: number }, index: number) => {
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

      const vatAmount = Math.round(totalAmount * 0.1)
      const totalWithVat = totalAmount + vatAmount

      updateData.totalAmount = totalAmount
      updateData.vatAmount = vatAmount
      updateData.totalWithVat = totalWithVat

      // 기존 아이템 삭제 후 새로 생성
      await prisma.salesQuoteItem.deleteMany({ where: { quoteId: id } })
      await prisma.salesQuoteItem.createMany({
        data: itemsWithTotal.map((item: { partNumber?: string; description?: string; quantity: number; srpPrice?: number; unitPrice: number; totalPrice: number; sortOrder: number }) => ({
          ...item,
          quoteId: id,
        })),
      })
    }

    const quote = await prisma.salesQuote.update({
      where: { id },
      data: updateData,
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
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
