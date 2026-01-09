import prisma from '@/lib/db'
import { parseExcel } from '@/lib/excel/parser'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/ma-quotes/upload - 엑셀 업로드
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
    const parsed = await parseExcel(buffer, 'MA_QUOTE')

    // TODO: 실제 인증된 사용자 ID 사용
    const createdById = 'dummy-user-id'

    // 견적번호 생성
    const year = new Date().getFullYear()
    const lastQuote = await prisma.mAQuote.findFirst({
      where: { quoteNumber: { startsWith: `MQ-${year}-` } },
      orderBy: { quoteNumber: 'desc' },
    })

    let sequence = 1
    if (lastQuote) {
      const lastNum = parseInt(lastQuote.quoteNumber.split('-')[2])
      sequence = lastNum + 1
    }
    const quoteNumber = `MQ-${year}-${sequence.toString().padStart(4, '0')}`

    // MA 아이템에서 금액 계산
    let totalAmount = 0
    const itemsWithTotal = (parsed.maItems || []).map((item, index) => {
      const price = item.totalPrice || 0
      totalAmount += price
      return {
        productName: item.productName,
        modelType: item.modelType,
        model: item.model,
        serialNumber: item.serialNumber,
        serviceLevel: item.serviceLevel,
        period: item.period,
        startDate: item.startDate || null,
        endDate: item.endDate || null,
        totalPrice: price,
        sortOrder: index,
      }
    })

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    const quote = await prisma.mAQuote.create({
      data: {
        quoteNumber,
        quoteDate: parsed.quoteDate || null,
        managerName: parsed.approvalManager,
        clientCompany: parsed.clientCompany,
        clientContact: parsed.clientContact,
        validUntil: parsed.validUntil,
        paymentTerms: parsed.paymentTerms,
        serviceTerms: parsed.serviceTerms,
        specialTerms: parsed.specialTerms,
        notes: parsed.notes,
        totalAmount,
        vatAmount,
        totalWithVat,
        createdById,
        items: {
          create: itemsWithTotal,
        },
      },
      include: {
        items: true,
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
