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

    // 품의번호 생성
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

    // 매출 금액 계산
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
        unitPrice: price,
        totalPrice: itemTotal,
        sortOrder: index,
      }
    })

    const vatAmount = Math.round(totalAmount * 0.1)
    const totalWithVat = totalAmount + vatAmount

    // 매입 금액 계산
    let purchaseTotal = 0
    const purchaseItemsWithTotal = (parsed.purchaseItems || []).map((item, index) => {
      const qty = item.quantity || 1
      const price = item.unitPrice || 0
      const itemTotal = qty * price
      purchaseTotal += itemTotal
      return {
        partNumber: item.partNumber,
        description: item.description,
        quantity: qty,
        unitPrice: price,
        totalPrice: itemTotal,
        purchaseDate: isValidDate(item.purchaseDate) ? item.purchaseDate : null,
        vendorCompany: item.vendorCompany,
        sortOrder: index,
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
        approvalCode: parsed.approvalCode,
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
        items: true,
        purchaseItems: true,
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
