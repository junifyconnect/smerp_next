import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateSalesQuote, DocumentData } from '@/lib/excel/generator'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sales-quotes/[id]/excel - 엑셀 다운로드
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const quote = await prisma.salesQuote.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // DocumentData 형식으로 변환
    const data: DocumentData = {
      docNumber: quote.id,
      clientCompany: quote.clientCompany || undefined,
      clientContact: quote.clientContact || undefined,
      clientPhone: quote.clientPhone || undefined,
      clientFax: quote.clientFax || undefined,
      clientEmail: quote.clientEmail || undefined,
      projectName: quote.projectName || undefined,
      quoteDate: quote.quoteDate || undefined,
      deliveryDate: quote.deliveryDate || undefined,
      validUntil: quote.validUntil || undefined,
      paymentTerms: quote.paymentTerms || undefined,
      notes: quote.notes || undefined,
      managerName: quote.managerName || undefined,
      items: quote.items.map((item) => ({
        partNumber: item.partNumber || undefined,
        description: item.description || undefined,
        quantity: item.quantity,
        srpPrice: item.srpPrice ? Number(item.srpPrice) : undefined,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
        totalPrice: item.totalPrice ? Number(item.totalPrice) : undefined,
      })),
      totalAmount: quote.totalAmount ? Number(quote.totalAmount) : undefined,
      vatAmount: quote.vatAmount ? Number(quote.vatAmount) : undefined,
      totalWithVat: quote.totalWithVat ? Number(quote.totalWithVat) : undefined,
    }

    const buffer = await generateSalesQuote(data)

    // 파일명 생성
    const dateStr = quote.quoteDate
      ? quote.quoteDate.toISOString().split('T')[0].replace(/-/g, '.')
      : new Date().toISOString().split('T')[0].replace(/-/g, '.')
    const clientName = quote.clientCompany || '고객사'
    const projectName = quote.projectName || quote.items[0]?.description || '견적서'
    const fileName = encodeURIComponent(`${dateStr}_(${projectName})_(${clientName})_견적서.xlsx`)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('엑셀 다운로드 오류:', error)
    return NextResponse.json(
      { error: '엑셀 파일 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
