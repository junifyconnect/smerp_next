import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/ma-quotes/[id] - 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const quote = await prisma.mAQuote.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'MA 견적서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error('MA 견적서 조회 오류:', error)
    return NextResponse.json(
      { error: 'MA 견적서 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH /api/ma-quotes/[id] - 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      quoteDate,
      managerName,
      clientCompany,
      clientContact,
      validUntil,
      paymentTerms,
      serviceTerms,
      specialTerms,
      notes,
      status,
      items,
    } = body

    const updateData: Record<string, unknown> = {}

    if (quoteDate !== undefined) updateData.quoteDate = quoteDate ? new Date(quoteDate) : null
    if (managerName !== undefined) updateData.managerName = managerName
    if (clientCompany !== undefined) updateData.clientCompany = clientCompany
    if (clientContact !== undefined) updateData.clientContact = clientContact
    if (validUntil !== undefined) updateData.validUntil = validUntil
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (serviceTerms !== undefined) updateData.serviceTerms = serviceTerms
    if (specialTerms !== undefined) updateData.specialTerms = specialTerms
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    // 아이템이 제공된 경우
    if (items !== undefined) {
      let totalAmount = 0
      const itemsWithTotal = items.map((item: {
        productName?: string
        modelType?: string
        model?: string
        serialNumber?: string
        serviceLevel?: string
        period?: string
        startDate?: string
        endDate?: string
        totalPrice?: number
        sortOrder?: number
      }, index: number) => {
        const price = item.totalPrice || 0
        totalAmount += price
        return {
          productName: item.productName,
          modelType: item.modelType,
          model: item.model,
          serialNumber: item.serialNumber,
          serviceLevel: item.serviceLevel,
          period: item.period,
          startDate: item.startDate ? new Date(item.startDate) : null,
          endDate: item.endDate ? new Date(item.endDate) : null,
          totalPrice: price,
          sortOrder: item.sortOrder ?? index,
        }
      })

      const vatAmount = Math.round(totalAmount * 0.1)
      const totalWithVat = totalAmount + vatAmount

      updateData.totalAmount = totalAmount
      updateData.vatAmount = vatAmount
      updateData.totalWithVat = totalWithVat

      await prisma.mAQuoteItem.deleteMany({ where: { quoteId: id } })
      await prisma.mAQuoteItem.createMany({
        data: itemsWithTotal.map((item: {
          productName?: string
          modelType?: string
          model?: string
          serialNumber?: string
          serviceLevel?: string
          period?: string
          startDate: Date | null
          endDate: Date | null
          totalPrice: number
          sortOrder: number
        }) => ({
          ...item,
          quoteId: id,
        })),
      })
    }

    const quote = await prisma.mAQuote.update({
      where: { id },
      data: updateData,
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error('MA 견적서 수정 오류:', error)
    return NextResponse.json(
      { error: 'MA 견적서 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE /api/ma-quotes/[id] - 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await prisma.mAQuote.delete({ where: { id } })

    return NextResponse.json({ message: '삭제되었습니다' })
  } catch (error) {
    console.error('MA 견적서 삭제 오류:', error)
    return NextResponse.json(
      { error: 'MA 견적서 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
