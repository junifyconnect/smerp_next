import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseExcel } from '@/lib/excel/parser'
import { parseWithDefaultTemplate } from '@/lib/excel/dynamic-parser'

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

    const buffer = Buffer.from(await file.arrayBuffer())

    // 1. 동적 템플릿 파서 시도
    let parsed = await parseWithDefaultTemplate(buffer, 'SALES_QUOTE', prisma)

    // 2. 없으면 기본 파서
    if (!parsed) {
      parsed = await parseExcel(buffer, 'SALES_QUOTE')
    }

    // 금액 계산 — products 기반
    let totalAmount = 0
    const productsData = (parsed.products || []).map((product, pIdx) => {
      const qty = product.quantity || 1
      const price = product.unitPrice || product.totalPrice || 0
      const productTotal = qty * price
      totalAmount += productTotal

      return {
        sortOrder: pIdx,
        name: product.name,
        quantity: qty,
        unitPrice: price,
        totalPrice: productTotal,
        items: (product.items || []).map((item, iIdx) => ({
          sortOrder: iIdx,
          partNumber: item.partNumber,
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
        })),
      }
    })

    // products가 없으면 flat items를 하나의 product로 묶기
    if (productsData.length === 0 && parsed.items?.length > 0) {
      const items = parsed.items.map((item, idx) => {
        const qty = item.quantity || 1
        const price = item.unitPrice || 0
        const itemTotal = qty * price
        totalAmount += itemTotal
        return {
          sortOrder: idx,
          partNumber: item.partNumber,
          description: item.description,
          quantity: qty,
          unitPrice: price,
          totalPrice: itemTotal,
        }
      })

      productsData.push({
        sortOrder: 0,
        name: parsed.projectName || parsed.clientCompany || '품목',
        quantity: 1,
        unitPrice: totalAmount,
        totalPrice: totalAmount,
        items,
      })
    }

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    // 견적서 생성
    const quote = await prisma.salesQuote.create({
      data: {
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
      },
    })

    // 제품 + 품목 생성
    for (const p of productsData) {
      const createdProduct = await prisma.salesQuoteProduct.create({
        data: {
          quoteId: quote.id,
          sortOrder: p.sortOrder,
          name: p.name,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          totalPrice: p.totalPrice,
        },
      })

      if (p.items.length > 0) {
        await prisma.salesQuoteItem.createMany({
          data: p.items.map((item) => ({
            productId: createdProduct.id,
            ...item,
          })),
        })
      }
    }

    const result = await prisma.salesQuote.findUnique({
      where: { id: quote.id },
      include: {
        products: {
          include: { items: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('엑셀 업로드 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
