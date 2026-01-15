import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseExcel } from '@/lib/excel/parser'

// 유효한 Date인지 확인
function isValidDate(date: Date | undefined | null): date is Date {
  return date instanceof Date && !isNaN(date.getTime())
}

// POST /api/sales-approvals/upload - 엑셀 업로드
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

    // Deal 자동 생성 - 품의서 업로드 시 자동으로 Deal 생성
    const firstItemDesc = parsed.items[0]?.description
    const dealName = parsed.approvalCode || parsed.clientCompany || firstItemDesc || `품의서 ${new Date().toLocaleDateString('ko-KR')}`
    const deal = await prisma.deal.create({
      data: {
        name: dealName,
        customerName: parsed.clientCompany || null,
      },
    })

    // 품의번호 생성 (시스템 내부 고유키)
    const year = new Date().getFullYear()
    const lastApproval = await prisma.salesApproval.findFirst({
      where: { approvalNumber: { startsWith: `SA-${year}-` } },
      orderBy: { approvalNumber: 'desc' },
    })

    let sequence = 1
    if (lastApproval) {
      const lastNum = parseInt(lastApproval.approvalNumber.split('-')[2])
      sequence = lastNum + 1
    }
    const approvalNumber = `SA-${year}-${sequence.toString().padStart(4, '0')}`

    // 품의코드 자동생성 (엑셀에 없는 경우)
    // 형식: {담당자ID첫글자}{YYMMDD}-{순번} 예: D260115-01
    let finalApprovalCode = parsed.approvalCode
    if (!finalApprovalCode && parsed.approvalManager) {
      const today = new Date()
      const yy = String(today.getFullYear()).slice(-2)
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const dateStr = `${yy}${mm}${dd}`
      const initial = parsed.approvalManager.charAt(0).toUpperCase()

      const prefix = `${initial}${dateStr}-`
      const lastCodeApproval = await prisma.salesApproval.findFirst({
        where: { approvalCode: { startsWith: prefix } },
        orderBy: { approvalCode: 'desc' },
      })

      let codeSequence = 1
      if (lastCodeApproval?.approvalCode) {
        const lastSeq = parseInt(lastCodeApproval.approvalCode.split('-')[1])
        if (!isNaN(lastSeq)) {
          codeSequence = lastSeq + 1
        }
      }
      finalApprovalCode = `${prefix}${String(codeSequence).padStart(2, '0')}`
    }

    // 매출 금액 계산 - 새 구조 (productName + details)
    // 파서에서 _details가 있으면 사용, 없으면 기존 방식
    let totalAmount = 0
    type ParsedItemWithDetails = typeof parsed.items[0] & {
      _details?: { partNumber?: string; description?: string; quantity?: number }[]
    }
    const itemsWithTotal = (parsed.items || []).map((rawItem, index) => {
      const item = rawItem as ParsedItemWithDetails
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      const itemTotal = qty * price
      totalAmount += itemTotal

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
        productName: item.partNumber || '제품', // partNumber를 productName으로 사용
        quantity: qty,
        unitPrice: price,
        totalPrice: itemTotal,
        sortOrder: index,
        details: {
          create: details,
        },
      }
    })

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    // 매입 금액 계산 - 새 구조 (productName + details)
    let purchaseTotal = 0
    type ParsedPurchaseItemWithDetails = typeof parsed.purchaseItems extends (infer T)[] | undefined
      ? T & { _details?: { partNumber?: string; description?: string; quantity?: number }[] }
      : never
    const purchaseItemsWithTotal = (parsed.purchaseItems || []).map((rawItem, index) => {
      const item = rawItem as ParsedPurchaseItemWithDetails
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      const itemTotal = qty * price
      purchaseTotal += itemTotal

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
        productName: item.partNumber || '제품', // partNumber를 productName으로 사용
        quantity: qty,
        unitPrice: price,
        totalPrice: itemTotal,
        purchaseDate: isValidDate(item.purchaseDate) ? item.purchaseDate : null,
        vendorCompany: item.vendorCompany,
        sortOrder: index,
        details: {
          create: details,
        },
      }
    })

    const purchaseTotalWithVat = purchaseTotal + Math.round(purchaseTotal * 0.1)

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

    const approval = await prisma.salesApproval.create({
      data: {
        approvalNumber,
        deal: { connect: { id: deal.id } },
        approvalCode: finalApprovalCode,
        approvalDate: isValidDate(parsed.approvalDate) ? parsed.approvalDate : null,
        managerName: parsed.approvalManager,
        clientCompany: parsed.clientCompany,
        clientContact: parsed.clientContact,
        clientPhone: parsed.clientPhone,
        endUser: parsed.endUser,
        paymentTerms: parsed.paymentTerms,
        deliveryAddress: parsed.deliveryAddress,
        deliveryDate: isValidDate(parsed.deliveryDate) ? parsed.deliveryDate : null,
        invoiceEmail: parsed.invoiceEmail,
        receiverName: parsed.receiverName,
        receiverPhone: parsed.receiverPhone,
        notes: parsed.notes,
        totalAmount,
        vatAmount,
        totalWithVat,
        purchaseTotal,
        purchaseTotalWithVat,
        createdById: systemUser.id,
        items: {
          create: itemsWithTotal,
        },
        purchaseItems: {
          create: purchaseItemsWithTotal,
        },
      },
      include: {
        items: {
          include: { details: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        purchaseItems: {
          include: { details: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
        deal: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(approval, { status: 201 })
  } catch (error) {
    console.error('엑셀 업로드 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
