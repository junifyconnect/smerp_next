import { NextRequest, NextResponse } from 'next/server'
import { parseExcel } from '@/lib/excel/parser'
import { parseWithDefaultTemplate } from '@/lib/excel/dynamic-parser'
import { prisma } from '@/lib/db/prisma'

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

    const buffer = Buffer.from(await file.arrayBuffer())

    let parsed = await parseWithDefaultTemplate(buffer, 'SALES_QUOTE', prisma)

    if (!parsed) {
      parsed = await parseExcel(buffer, 'SALES_QUOTE')
    }

    // 제품 그룹 처리
    let totalAmount = 0
    const products = (parsed.products || []).map((product, pIdx) => {
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
          partNumber: item.partNumber || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
        })),
      }
    })

    // products가 없으면 flat items를 하나의 product로
    if (products.length === 0 && parsed.items?.length > 0) {
      const items = parsed.items.map((item, idx) => {
        const qty = item.quantity || 1
        const price = item.unitPrice || 0
        const itemTotal = qty * price
        totalAmount += itemTotal
        return {
          sortOrder: idx,
          partNumber: item.partNumber || '',
          description: item.description || '',
          quantity: qty,
          unitPrice: price,
          totalPrice: itemTotal,
        }
      })

      products.push({
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
      products,
    })
  } catch (error) {
    console.error('엑셀 파싱 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '파싱에 실패했습니다' },
      { status: 500 }
    )
  }
}
