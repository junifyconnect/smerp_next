import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseExcel } from '@/lib/excel/parser'
import { parseWithDefaultTemplate } from '@/lib/excel/dynamic-parser'

// 유효한 Date인지 확인
function isValidDate(date: Date | undefined | null): date is Date {
  return date instanceof Date && !isNaN(date.getTime())
}

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

    // 1. 먼저 동적 템플릿 파서 시도
    let parsed = await parseWithDefaultTemplate(buffer, 'SALES_ORDER', prisma)

    // 2. 템플릿이 없으면 기본 파서 사용
    if (!parsed) {
      console.log('템플릿이 없어 기본 파서 사용 (SALES_ORDER)')
      parsed = await parseExcel(buffer, 'SALES_ORDER')
    } else {
      console.log('동적 템플릿 파서 사용 (SALES_ORDER)')
    }

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
    const orderNumber = `SO-${year}-${String(sequence).padStart(4, '0')}`

    // 금액 계산
    let totalAmount = 0
    const itemsWithTotal = (parsed.items || []).map((item, index) => {
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      const itemTotal = qty * price
      totalAmount += itemTotal
      return {
        partNumber: item.partNumber,
        description: item.description,
        quantity: qty,
        srpPrice: item.srpPrice || 0,
        unitPrice: price,
        totalPrice: itemTotal,
        sortOrder: index,
      }
    })

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    // 시스템 사용자 조회 또는 생성
    let systemUser = await prisma.user.findFirst({ where: { email: 'system@smerp.local' } })
    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          email: 'system@smerp.local',
          passwordHash: 'not-used',
          name: 'System',
        },
      })
    }

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber,
        orderDate: isValidDate(parsed.quoteDate) ? parsed.quoteDate : new Date(),
        managerName: parsed.approvalManager || null,
        managerPhone: parsed.managerPhone || null,
        deliveryAddress: parsed.deliveryAddress || null,
        paymentTerms: parsed.paymentTerms || null,
        vendorCompany: parsed.vendorCompany || null,
        vendorContact: parsed.vendorContact || null,
        vendorPhone: parsed.vendorPhone || null,
        vendorEmail: parsed.vendorEmail || null,
        totalAmount,
        vatAmount,
        totalWithVat,
        notes: parsed.notes || null,
        createdById: systemUser.id,
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
