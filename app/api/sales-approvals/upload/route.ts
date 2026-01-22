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
    
    // 디버깅: 파싱 결과 로그
    console.log('=== 파싱 결과 ===')
    console.log('approvalCode:', parsed.approvalCode)
    console.log('clientCompany:', parsed.clientCompany)
    console.log('items count:', parsed.items?.length)
    console.log('items:', JSON.stringify(parsed.items, null, 2))
    console.log('purchaseItems count:', parsed.purchaseItems?.length)
    console.log('purchaseItems:', JSON.stringify(parsed.purchaseItems, null, 2))
    console.log('notes:', parsed.notes)
    console.log('deliveryAddress:', parsed.deliveryAddress)

    // 새 구조: products + standaloneItems
    // 매출 품목(items)과 매입 품목(purchaseItems)을 매칭해서 제품 구조로 변환
    interface ParsedItemWithDetails {
      partNumber?: string
      description?: string
      quantity: number
      unitPrice?: number
      totalPrice?: number
      _details?: { partNumber?: string; description?: string; quantity?: number }[]
    }

    interface ParsedPurchaseItemWithDetails {
      partNumber?: string
      description?: string
      quantity: number
      unitPrice?: number
      totalPrice?: number
      purchaseDate?: Date
      vendorCompany?: string
      _details?: { partNumber?: string; description?: string; quantity?: number }[]
    }

    interface ProductForForm {
      id: string
      name: string
      quantity: number
      salesUnitPrice: number
      purchaseUnitPrice: number  // 제품 레벨 매입 단가 (통합 매입용)
      vendorCompany: string  // 제품 레벨 매입처 (통합 매입용)
      items: {
        partNumber: string
        description: string
        quantity: number
        purchaseUnitPrice: number
        vendorCompany: string
      }[]
    }

    const products: ProductForForm[] = []
    const parsedItems = (parsed.items || []) as ParsedItemWithDetails[]
    const parsedPurchaseItems = (parsed.purchaseItems || []) as ParsedPurchaseItemWithDetails[]

    // 통합 매입 여부 확인 (모든 매입 품목의 매입처가 동일한지)
    const vendorSet = new Set<string>()
    parsedPurchaseItems.forEach(item => {
      let vendor = item.vendorCompany || ''
      if (vendor && !vendor.match(/^\d{4}-\d{2}-\d{2}/)) {
        vendorSet.add(vendor)
      }
    })
    const isConsolidatedPurchase = vendorSet.size === 1 && parsedPurchaseItems.length > 1
    const consolidatedVendor = isConsolidatedPurchase ? Array.from(vendorSet)[0] : ''

    // 통합 매입 시 메인 행의 매입 정보 찾기 (단가가 있는 품목)
    // 파서에서 메인 행은 마지막에 push되므로, 단가가 있는 항목을 찾음
    const mainPurchaseItem = parsedPurchaseItems.find(item => (item.unitPrice || 0) > 0)
    const consolidatedPurchasePrice = mainPurchaseItem?.unitPrice || 0

    console.log('=== 매입 분석 ===')
    console.log('매입처 종류:', vendorSet.size, Array.from(vendorSet))
    console.log('통합 매입 여부:', isConsolidatedPurchase)
    console.log('통합 매입 단가:', consolidatedPurchasePrice)

    // 매출 품목을 순회하면서 제품 생성
    parsedItems.forEach((salesItem, index) => {
      const productName = salesItem.partNumber || '제품'
      const salesQty = salesItem.quantity || 1
      const salesPrice = salesItem.unitPrice || 0

      // _details가 있으면 품목들로 사용, 없으면 빈 품목 하나 생성
      const details = salesItem._details || []

      // 제품 레벨 매입 정보 (통합 매입 시 사용)
      let productPurchaseUnitPrice = 0
      let productVendorCompany = ''

      // 통합 매입인 경우: 제품 레벨에 매입 정보 설정
      if (isConsolidatedPurchase) {
        // 메인 행의 매입 단가 사용 (단가가 있는 품목)
        productPurchaseUnitPrice = consolidatedPurchasePrice
        productVendorCompany = consolidatedVendor
      }

      // 제품 생성
      const product: ProductForForm = {
        id: `product-${Date.now()}-${index}`,
        name: productName,
        quantity: salesQty,
        salesUnitPrice: salesPrice,
        purchaseUnitPrice: productPurchaseUnitPrice,
        vendorCompany: productVendorCompany,
        items: [],
      }

      if (details.length > 0) {
        if (isConsolidatedPurchase) {
          // 통합 매입: 품목에는 매입 정보 없이 상세 내역만
          product.items = details.map((d) => ({
            partNumber: d.partNumber || '',
            description: d.description || '',
            quantity: d.quantity || 1,
            purchaseUnitPrice: 0,
            vendorCompany: '',
          }))
        } else {
          // 개별 매입: 상세 품목마다 각각의 매입 정보 매핑
          product.items = details.map((d, dIdx) => {
            const matchingPurchaseItem = parsedPurchaseItems[dIdx]

            let vendor = matchingPurchaseItem?.vendorCompany || ''
            if (vendor && vendor.match(/^\d{4}-\d{2}-\d{2}/)) {
              vendor = ''
            }

            return {
              partNumber: d.partNumber || '',
              description: d.description || '',
              quantity: d.quantity || 1,
              purchaseUnitPrice: matchingPurchaseItem?.unitPrice || 0,
              vendorCompany: vendor,
            }
          })
        }
      } else {
        // 상세 없이 매입 정보만 있으면 메인 매입 품목 사용
        const purchasePrice = mainPurchaseItem?.unitPrice || 0
        let vendorCompany = mainPurchaseItem?.vendorCompany || ''
        if (vendorCompany && vendorCompany.match(/^\d{4}-\d{2}-\d{2}/)) {
          vendorCompany = ''
        }

        if (purchasePrice > 0 || vendorCompany) {
          product.items = [{
            partNumber: '',
            description: productName,
            quantity: salesQty,
            purchaseUnitPrice: purchasePrice,
            vendorCompany: vendorCompany,
          }]
        }
      }

      products.push(product)
    })

    // 레거시 호환용 salesItems, purchaseItems도 유지
    const salesItems = parsedItems.map((item, index) => {
      const qty = item.quantity || 1
      const price = item.unitPrice || 0

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

    const purchaseItems = parsedPurchaseItems.map((item, index) => {
      const qty = item.quantity || 1
      const price = item.unitPrice || 0

      // vendorCompany가 날짜 형식이면 무시
      let vendor = item.vendorCompany || ''
      if (vendor && vendor.match(/^\d{4}-\d{2}-\d{2}/)) {
        vendor = ''
      }

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
        vendorCompany: vendor,
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
      paymentTerms: parsed.modelType || '', // MT&S/N 필드
      // 계산서/결제 정보
      invoiceEmail: parsed.invoiceEmail || '',
      paymentDate: parsed.paymentTerms || '', // 결제일 (예: 납품 전 선입금 현금 결제)
      // 배송 정보
      deliveryAddress: parsed.deliveryAddress || '',
      deliveryDate: parsed.deliveryDate ? (
        typeof parsed.deliveryDate === 'string'
          ? parsed.deliveryDate
          : (isValidDate(parsed.deliveryDate) ? parsed.deliveryDate.toISOString().split('T')[0] : '')
      ) : '',
      receiverName: parsed.receiverName || '',
      receiverPhone: parsed.receiverPhone || '',
      // 비고
      notes: parsed.notes || '',
      // 새 구조: 제품 + 독립 품목
      products,
      standaloneItems: [], // 파싱된 데이터는 기본적으로 제품 구조로
      // 레거시 호환
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
