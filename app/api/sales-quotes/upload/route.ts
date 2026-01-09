import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseExcel } from '@/lib/excel/parser'

// POST /api/sales-quotes/upload - 엑셀 업로드
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다' },
        { status: 400 }
      )
    }

    // 엑셀 파일 파싱
    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parseExcel(buffer, 'SALES_QUOTE')

    // Deal 자동 생성 - 견적서 업로드 시 자동으로 Deal 생성
    const firstItemDesc = parsed.items[0]?.description
    const dealName = parsed.projectName || firstItemDesc || parsed.clientCompany || `견적서 ${new Date().toLocaleDateString('ko-KR')}`
    const deal = await prisma.deal.create({
      data: {
        name: dealName,
        customerName: parsed.clientCompany || null,
      },
    })

    // 금액 계산
    let totalAmount = 0
    const itemsWithTotal = parsed.items.map((item, index) => {
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
        sortOrder: index,
      }
    })

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    const quote = await prisma.salesQuote.create({
      data: {
        deal: { connect: { id: deal.id } },
        projectName: parsed.projectName,
        managerName: parsed.managerName,
        clientCompany: parsed.clientCompany,
        clientContact: parsed.clientContact,
        clientPhone: parsed.clientPhone,
        clientFax: parsed.clientFax,
        clientMobile: parsed.clientMobile,
        clientEmail: parsed.clientEmail,
        quoteDate: parsed.quoteDate || null,
        validUntil: parsed.validUntil,
        deliveryDate: parsed.deliveryDate || null,
        paymentTerms: parsed.paymentTerms,
        notes: parsed.notes,
        totalAmount,
        vatAmount,
        totalWithVat,
        items: {
          create: itemsWithTotal,
        },
      },
      include: {
        items: true,
        deal: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('엑셀 업로드 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
