import { NextRequest, NextResponse } from 'next/server'
import { parseExcel } from '@/lib/excel/parser'

// 유효한 Date인지 확인
function isValidDate(date: Date | undefined | null): date is Date {
  return date instanceof Date && !isNaN(date.getTime())
}

// POST /api/sales-approvals/upload - 엑셀 업로드 (파싱만, DB 저장 X)
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
    const parsed = await parseExcel(buffer, 'SALES_APPROVAL')

    // 매출 품목 가공
    type ParsedItemWithDetails = typeof parsed.items[0] & {
      _details?: { partNumber?: string; description?: string; quantity?: number }[]
    }
    const salesItems = (parsed.items || []).map((rawItem, index) => {
      const item = rawItem as ParsedItemWithDetails
      const qty = item.quantity || 1
      const price = item.unitPrice || 0

      // _details가 있으면 새 구조 사용
      const details = item._details && item._details.length > 0
        ? item._details.map((d, dIdx) => ({
            partNumber: d.partNumber,
            description: d.description,
            quantity: d.quantity,
            sortOrder: dIdx,
          }))
        : item.description
          ? [{ description: item.description, sortOrder: 0 }]
          : []

      return {
        productName: item.partNumber || '제품',
        quantity: qty,
        unitPrice: price,
        sortOrder: index,
        details,
      }
    })

    // 매입 품목 가공
    type ParsedPurchaseItemWithDetails = typeof parsed.purchaseItems extends (infer T)[] | undefined
      ? T & { _details?: { partNumber?: string; description?: string; quantity?: number }[] }
      : never
    const purchaseItems = (parsed.purchaseItems || []).map((rawItem, index) => {
      const item = rawItem as ParsedPurchaseItemWithDetails
      const qty = item.quantity || 1
      const price = item.unitPrice || 0

      // _details가 있으면 새 구조 사용
      const details = item._details && item._details.length > 0
        ? item._details.map((d, dIdx) => ({
            partNumber: d.partNumber,
            description: d.description,
            quantity: d.quantity,
            sortOrder: dIdx,
          }))
        : item.description
          ? [{ description: item.description, sortOrder: 0 }]
          : []

      return {
        productName: item.partNumber || '제품',
        quantity: qty,
        unitPrice: price,
        purchaseDate: isValidDate(item.purchaseDate) ? item.purchaseDate.toISOString() : null,
        vendorCompany: item.vendorCompany,
        sortOrder: index,
        details,
      }
    })

    // 파싱된 데이터만 반환 (DB 저장 X)
    return NextResponse.json({
      // 기본 정보
      approvalCode: parsed.approvalCode || '',
      approvalDate: isValidDate(parsed.approvalDate) ? parsed.approvalDate.toISOString().split('T')[0] : '',
      managerName: parsed.approvalManager || '',
      // 매출처 정보
      clientCompany: parsed.clientCompany || '',
      clientContact: parsed.clientContact || '',
      clientPhone: parsed.clientPhone || '',
      endUser: parsed.endUser || '',
      paymentTerms: parsed.paymentTerms || '',
      // 배송 정보
      deliveryAddress: parsed.deliveryAddress || '',
      deliveryDate: isValidDate(parsed.deliveryDate) ? parsed.deliveryDate.toISOString().split('T')[0] : '',
      invoiceEmail: parsed.invoiceEmail || '',
      receiverName: parsed.receiverName || '',
      receiverPhone: parsed.receiverPhone || '',
      // 비고
      notes: parsed.notes || '',
      // 품목
      salesItems,
      purchaseItems,
    })
  } catch (error) {
    console.error('엑셀 업로드 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
