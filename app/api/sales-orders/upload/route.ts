import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseExcel } from '@/lib/excel/parser'

// POST /api/sales-orders/upload - 엑셀 업로드
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
    const parsed = await parseExcel(buffer, 'SALES_ORDER')

    // TODO: 실제 인증된 사용자 ID 사용
    const createdById = 'dummy-user-id'

    // 발주번호 생성
    const year = new Date().getFullYear()
    const lastOrder = await prisma.salesOrder.findFirst({
      where: { orderNumber: { startsWith: `SO-${year}-` } },
      orderBy: { orderNumber: 'desc' },
    })

    let sequence = 1
    if (lastOrder) {
      const lastNum = parseInt(lastOrder.orderNumber.split('-')[2])
      sequence = lastNum + 1
    }
    const orderNumber = `SO-${year}-${sequence.toString().padStart(4, '0')}`

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

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        orderDate: parsed.quoteDate || null, // quoteDate를 orderDate로 사용
        managerName: parsed.approvalManager,
        deliveryAddress: parsed.deliveryAddress,
        paymentTerms: parsed.paymentTerms,
        vendorCompany: parsed.vendorCompany,
        vendorContact: parsed.vendorContact,
        vendorPhone: parsed.vendorPhone,
        vendorEmail: parsed.vendorEmail,
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

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('엑셀 업로드 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
