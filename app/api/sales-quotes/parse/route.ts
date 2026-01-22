import { NextRequest, NextResponse } from 'next/server'
import { parseExcel } from '@/lib/excel/parser'

// POST /api/sales-quotes/parse - 엑셀 파싱만 (저장 없음)
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

    // 금액 계산
    let totalAmount = 0
    const itemsWithTotal = parsed.items.map((item, index) => {
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      const itemTotal = qty * price
      totalAmount += itemTotal
      return {
        partNumber: item.partNumber || '',
        description: item.description || '',
        quantity: qty,
        srpPrice: item.srpPrice || 0,
        unitPrice: price,
        totalPrice: itemTotal,
        sortOrder: index,
      }
    })

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    // 제품 그룹 처리 (새 구조)
    const products = parsed.products?.map(product => ({
      name: product.name,
      quantity: product.quantity || 1,
      srpPrice: product.srpPrice || 0,
      unitPrice: product.unitPrice || product.totalPrice || 0,
      totalPrice: product.totalPrice || 0,
      items: product.items.map(item => ({
        partNumber: item.partNumber || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        srpPrice: item.srpPrice || 0,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
      })),
    }))

    // 파싱된 데이터 반환 (저장 없음)
    return NextResponse.json({
      projectName: parsed.projectName || '',
      managerName: parsed.managerName || '',
      clientCompany: parsed.clientCompany || '',
      clientContact: parsed.clientContact || '',
      clientPhone: parsed.clientPhone || '',
      clientFax: parsed.clientFax || '',
      clientMobile: parsed.clientMobile || '',
      clientEmail: parsed.clientEmail || '',
      quoteDate: parsed.quoteDate || null,
      validUntil: parsed.validUntil || '',
      deliveryDate: parsed.deliveryDate || null,
      paymentTerms: parsed.paymentTerms || '',
      notes: parsed.notes || '',
      totalAmount,
      vatAmount,
      totalWithVat,
      products: products || [],
      items: itemsWithTotal, // 레거시 호환
    })
  } catch (error) {
    console.error('엑셀 파싱 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '파싱에 실패했습니다' },
      { status: 500 }
    )
  }
}
