import { NextRequest, NextResponse } from 'next/server'
import { parseExcel } from '@/lib/excel/parser'
import { parseWithDefaultTemplate } from '@/lib/excel/dynamic-parser'
import { prisma } from '@/lib/db/prisma'

function isValidDate(date: Date | undefined | null): date is Date {
  return date instanceof Date && !isNaN(date.getTime())
}

// POST /api/sales-approvals/upload - 엑셀 업로드 (파싱만, DB 저장 X)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let parsed = await parseWithDefaultTemplate(buffer, 'SALES_APPROVAL', prisma)
    if (!parsed) {
      parsed = await parseExcel(buffer, 'SALES_APPROVAL')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedItems = (parsed.items || []) as any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedPurchaseItems = (parsed.purchaseItems || []) as any[]

    // 새 2단계 구조로 변환: Product → Item[]
    interface ProductForForm {
      name: string
      quantity: number
      unitPrice: number
      items: {
        partNumber: string
        description: string
        quantity: number
        vendorName: string
        purchasePrice: number
        purchaseDate: string | null
      }[]
    }

    const products: ProductForForm[] = []

    parsedItems.forEach((salesItem, index) => {
      const productName = salesItem.partNumber || '제품'
      const salesQty = salesItem.quantity || 1
      const salesPrice = salesItem.unitPrice || 0

      const details = salesItem._details || []

      const product: ProductForForm = {
        name: productName,
        quantity: salesQty,
        unitPrice: salesPrice,
        items: [],
      }

      if (details.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        product.items = details.map((d: any, dIdx: number) => {
          const matchingPurchase = parsedPurchaseItems[dIdx]
          let vendor = matchingPurchase?.vendorCompany || ''
          if (vendor && vendor.match(/^\d{4}-\d{2}-\d{2}/)) vendor = ''

          return {
            partNumber: d.partNumber || '',
            description: d.description || '',
            quantity: d.quantity || 1,
            vendorName: vendor,
            purchasePrice: matchingPurchase?.unitPrice || 0,
            purchaseDate: isValidDate(matchingPurchase?.purchaseDate)
              ? matchingPurchase.purchaseDate.toISOString().split('T')[0]
              : null,
          }
        })
      } else if (parsedPurchaseItems[index]) {
        const p = parsedPurchaseItems[index]
        let vendor = p.vendorCompany || ''
        if (vendor && vendor.match(/^\d{4}-\d{2}-\d{2}/)) vendor = ''

        product.items = [{
          partNumber: '',
          description: productName,
          quantity: salesQty,
          vendorName: vendor,
          purchasePrice: p.unitPrice || 0,
          purchaseDate: isValidDate(p.purchaseDate)
            ? p.purchaseDate.toISOString().split('T')[0]
            : null,
        }]
      }

      products.push(product)
    })

    return NextResponse.json({
      approvalCode: parsed.approvalCode || '',
      approvalDate: isValidDate(parsed.approvalDate)
        ? parsed.approvalDate.toISOString().split('T')[0]
        : '',
      managerName: parsed.approvalManager || '',
      clientCompany: parsed.clientCompany || '',
      clientContact: parsed.clientContact || '',
      clientPhone: parsed.clientPhone || '',
      endUser: parsed.endUser || '',
      paymentTerms: parsed.modelType || '',
      invoiceEmail: parsed.invoiceEmail || '',
      deliveryAddress: parsed.deliveryAddress || '',
      deliveryDate: parsed.deliveryDate
        ? typeof parsed.deliveryDate === 'string'
          ? parsed.deliveryDate
          : isValidDate(parsed.deliveryDate)
            ? parsed.deliveryDate.toISOString().split('T')[0]
            : ''
        : '',
      receiverName: parsed.receiverName || '',
      receiverPhone: parsed.receiverPhone || '',
      notes: parsed.notes || '',
      products,
    })
  } catch (error) {
    console.error('엑셀 업로드 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
